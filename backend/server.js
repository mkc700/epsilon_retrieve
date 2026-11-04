const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const connectDB = require('./config/db');
const app = require('./app');

async function start() {
  for (const name of ['MONGODB_URI', 'JWT_SECRET']) {
    if (!process.env[name]?.trim()) throw new Error(`Configura ${name} en backend/.env antes de iniciar el servidor.`);
  }
  await connectDB();
  await require('./models/AgendaEvent').init();
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

if (require.main === module) {
  start().catch(error => {
    console.error(`No se pudo iniciar el backend: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { start };
