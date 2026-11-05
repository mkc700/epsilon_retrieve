const AgendaEvent = require('../models/AgendaEvent');
const { validId, validDate, eventFields, newId } = require('../validation/agenda');

const serialize = event => ({
  id: event.eventId,
  userId: String(event.userId),
  title: event.title,
  description: event.description,
  date: event.date,
  time: event.time,
  deleted: event.deleted,
  createdAt: event.createdAt,
  updatedAt: event.updatedAt,
  synced: true,
});

const fail = (res, error) => {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: 'Los datos del evento no son válidos.' });
  }
  console.error('Agenda error:', error.message);
  return res.status(500).json({ message: 'No se pudo completar la operación de agenda.' });
};

async function getEvents(req, res) {
  const { from, to, includeDeleted } = req.query;
  if ((from !== undefined && !validDate(from)) || (to !== undefined && !validDate(to))
    || (from && to && from > to)
    || (includeDeleted !== undefined && !['true', 'false'].includes(includeDeleted))) {
    return res.status(400).json({ message: 'El rango de fechas o includeDeleted no es válido.' });
  }
  const filter = { userId: req.user.userId };
  if (includeDeleted !== 'true') filter.deleted = false;
  if (from || to) filter.date = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  try {
    const events = await AgendaEvent.find(filter).sort({ date: 1, time: 1, eventId: 1 });
    return res.json(events.map(serialize));
  } catch (error) { return fail(res, error); }
}

async function getEvent(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'El identificador del evento no es válido.' });
  try {
    const event = await AgendaEvent.findOne({ userId: req.user.userId, eventId: req.params.id, deleted: false });
    if (!event) return res.status(404).json({ message: 'Evento no encontrado.' });
    return res.json(serialize(event));
  } catch (error) { return fail(res, error); }
}

async function createEvent(req, res) {
  const { fields, error } = eventFields(req.body);
  if (error) return res.status(400).json({ message: error });
  const eventId = req.body.id === undefined ? newId() : req.body.id;
  if (!validId(eventId)) return res.status(400).json({ message: 'El identificador del evento no es válido.' });
  const filter = { userId: req.user.userId, eventId };
  try {
    const existing = await AgendaEvent.findOne(filter);
    if (existing) return res.status(200).json(serialize(existing));
    const event = await AgendaEvent.create({ ...fields, ...filter });
    return res.status(201).json(serialize(event));
  } catch (failure) {
    // Another retry may have inserted this event after the first lookup.
    if (failure.code === 11000) {
      try {
        const existing = await AgendaEvent.findOne(filter);
        if (existing) return res.status(200).json(serialize(existing));
      } catch (readError) { return fail(res, readError); }
    }
    return fail(res, failure);
  }
}

async function updateEvent(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'El identificador del evento no es válido.' });
  const { fields, error } = eventFields(req.body);
  if (error) return res.status(400).json({ message: error });
  const filter = { userId: req.user.userId, eventId: req.params.id };
  try {
    // PUT replaces this account's event, creates it on first sync, or restores it.
    const event = await AgendaEvent.findOneAndUpdate(filter, { $set: { ...fields, deleted: false } }, {
      upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true,
    });
    return res.json(serialize(event));
  } catch (failure) {
    if (failure.code === 11000) {
      try {
        const event = await AgendaEvent.findOneAndUpdate(filter, { $set: { ...fields, deleted: false } }, { new: true, runValidators: true });
        if (event) return res.json(serialize(event));
      } catch (retryError) { return fail(res, retryError); }
    }
    return fail(res, failure);
  }
}

async function deleteEvent(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'El identificador del evento no es válido.' });
  try {
    await AgendaEvent.findOneAndUpdate({ userId: req.user.userId, eventId: req.params.id, deleted: false }, { $set: { deleted: true } });
    // Repeated deletion, including an event never uploaded, is successful.
    return res.status(204).end();
  } catch (error) { return fail(res, error); }
}

module.exports = { getEvents, getEvent, createEvent, updateEvent, deleteEvent };
