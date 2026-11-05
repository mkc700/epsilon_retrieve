const express = require('express');
const auth = require('../middleware/auth');
const { getTodos, createTodo, updateTodo, deleteTodo } = require('../controllers/todoController');

const router = express.Router();
router.use(auth);
router.get('/', getTodos);
router.post('/', createTodo);
router.put('/:id', updateTodo);
router.delete('/:id', deleteTodo);

module.exports = router;
