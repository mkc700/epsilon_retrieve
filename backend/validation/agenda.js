const { randomUUID } = require('node:crypto');

const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)
    || value < '1900-01-01' || value > '2199-12-31') return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function eventFields(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Envía los datos del evento.' };
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 120) {
    return { error: 'El título es obligatorio y puede tener hasta 120 caracteres.' };
  }
  const description = body.description === undefined ? '' : body.description;
  const time = body.time === undefined ? '' : body.time;
  if (typeof description !== 'string' || description.length > 2000) return { error: 'La descripción puede tener hasta 2.000 caracteres.' };
  if (!validDate(body.date)) return { error: 'Elige una fecha válida entre 1900 y 2199 (AAAA-MM-DD).' };
  if (typeof time !== 'string' || (time !== '' && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))) {
    return { error: 'La hora debe estar vacía o usar el formato HH:MM de 24 horas.' };
  }
  return { fields: { title: body.title.trim(), description: description.trim(), date: body.date, time } };
}

module.exports = { validId, validDate, eventFields, newId: () => `agenda_${randomUUID()}` };
