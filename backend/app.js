const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const noteRoutes = require('./routes/notes');
const agendaRoutes = require('./routes/agenda');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/agenda', agendaRoutes);
app.get('/health', (req, res) => res.json({ status: 'OK', message: 'Server is running' }));
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'El cuerpo de la petición debe ser un objeto JSON válido.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ message: 'El cuerpo de la petición es demasiado grande.' });
  console.error('API error:', error.message);
  return res.status(500).json({ message: 'No se pudo completar la petición.' });
});

module.exports = app;
