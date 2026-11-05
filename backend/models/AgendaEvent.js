const mongoose = require('mongoose');
const { validDate } = require('../validation/agenda');

const agendaEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: String, required: true, match: /^[A-Za-z0-9_-]{1,100}$/ },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 2000 },
  date: { type: String, required: true, validate: validDate },
  time: { type: String, default: '', validate: value => value === '' || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) },
  deleted: { type: Boolean, default: false },
}, { timestamps: true });

// A stable client ID makes offline retries idempotent within each account.
agendaEventSchema.index({ userId: 1, eventId: 1 }, { unique: true });
agendaEventSchema.index({ userId: 1, date: 1, time: 1 });

module.exports = mongoose.model('AgendaEvent', agendaEventSchema);
