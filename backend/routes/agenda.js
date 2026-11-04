const express = require('express');
const auth = require('../middleware/auth');
const { getEvents, getEvent, createEvent, updateEvent, deleteEvent } = require('../controllers/agendaController');

const router = express.Router();
router.use(auth);
router.get('/', getEvents);
router.get('/:id', getEvent);
router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

module.exports = router;
