require('dotenv').config();

const app = require('./app');
const { iniciarWorker } = require('./worker');

const puerto = Number(process.env.PORT || 3001);

if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production') {
  process.env.JWT_SECRET = 'alzado-dev-solo-local';
  console.warn('JWT_SECRET no está definido. Se usa un secreto solo para desarrollo.');
}

app.listen(puerto, () => {
  console.log(`Alzado API en http://localhost:${puerto}`);
});

iniciarWorker();
