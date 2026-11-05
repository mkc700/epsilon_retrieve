const Todo = require('../models/Todo');

const PRIORITIES = ['low', 'medium', 'high'];

const serialize = todo => ({
  id: String(todo._id),
  userId: String(todo.userId),
  title: todo.title,
  description: todo.description,
  completed: todo.completed,
  priority: todo.priority,
  createdAt: todo.createdAt,
  updatedAt: todo.updatedAt,
  synced: true,
  deleted: todo.deleted,
});

const fail = (res, error) => {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: 'Los datos de la tarea no son válidos.' });
  }
  console.error('Todo error:', error.message);
  return res.status(500).json({ message: 'No se pudo completar la operación de tareas.' });
};

const getTodos = async (req, res) => {
  try {
    const todos = await Todo.find({ userId: req.user.userId, deleted: false })
      .sort({ createdAt: -1 });
    return res.json(todos.map(serialize));
  } catch (error) { return fail(res, error); }
};

const createTodo = async (req, res) => {
  const { title, description, completed, priority } = req.body || {};
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 120) {
    return res.status(400).json({ message: 'El título es obligatorio y puede tener hasta 120 caracteres.' });
  }
  if (description !== undefined && (typeof description !== 'string' || description.length > 2000)) {
    return res.status(400).json({ message: 'La descripción puede tener hasta 2.000 caracteres.' });
  }
  if (priority !== undefined && !PRIORITIES.includes(priority)) {
    return res.status(400).json({ message: 'La prioridad debe ser low, medium o high.' });
  }
  try {
    const todo = await Todo.create({
      userId: req.user.userId,
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      completed: completed === true,
      priority: priority || 'medium',
    });
    return res.status(201).json(serialize(todo));
  } catch (error) { return fail(res, error); }
};

const updateTodo = async (req, res) => {
  const updates = {};
  const { title, description, completed, priority } = req.body || {};
  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 120) {
      return res.status(400).json({ message: 'El título es obligatorio y puede tener hasta 120 caracteres.' });
    }
    updates.title = title.trim();
  }
  if (description !== undefined) {
    if (typeof description !== 'string' || description.length > 2000) {
      return res.status(400).json({ message: 'La descripción puede tener hasta 2.000 caracteres.' });
    }
    updates.description = description.trim();
  }
  if (completed !== undefined) {
    if (typeof completed !== 'boolean') {
      return res.status(400).json({ message: 'completed debe ser verdadero o falso.' });
    }
    updates.completed = completed;
  }
  if (priority !== undefined) {
    if (!PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: 'La prioridad debe ser low, medium o high.' });
    }
    updates.priority = priority;
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No hay campos válidos para actualizar.' });
  }
  try {
    const todo = await Todo.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId, deleted: false },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!todo) return res.status(404).json({ message: 'Tarea no encontrada.' });
    return res.json(serialize(todo));
  } catch (error) { return fail(res, error); }
};

const deleteTodo = async (req, res) => {
  try {
    await Todo.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId, deleted: false },
      { $set: { deleted: true } }
    );
    return res.status(204).end();
  } catch (error) { return fail(res, error); }
};

module.exports = { getTodos, createTodo, updateTodo, deleteTodo };
