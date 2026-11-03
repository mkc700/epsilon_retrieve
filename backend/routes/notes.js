const express = require('express');
const router = express.Router();
const {
  getNotes,
  createNote,
  updateNote,
  deleteNote
} = require('../controllers/noteController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// @route   GET /api/notes
// @desc    Get all notes for current user
router.get('/', getNotes);

// @route   POST /api/notes
// @desc    Create a new note
router.post('/', createNote);

// @route   PUT /api/notes/:id
// @desc    Update a note
router.put('/:id', updateNote);

// @route   DELETE /api/notes/:id
// @desc    Delete a note
router.delete('/:id', deleteNote);

module.exports = router;
