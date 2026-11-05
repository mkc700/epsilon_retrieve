const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 2000 },
  completed: { type: Boolean, default: false },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  deleted: { type: Boolean, default: false },
}, { timestamps: true });

todoSchema.index({ userId: 1, deleted: 1, createdAt: -1 });

module.exports = mongoose.model('Todo', todoSchema);
