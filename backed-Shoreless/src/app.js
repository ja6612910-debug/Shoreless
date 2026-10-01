const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const auth = require('./routes/auth');
const perfil = require('./routes/perfil');
const taller = require('./routes/taller');
const admin = require('./routes/admin');

const app = express();
app.set('trust proxy', 1);

const permitidos = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origen) => origen.trim())
  .filter(Boolean);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(express.json({ limit: '1mb' }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || permitidos.includes('*') || permitidos.includes(origin)) {
      callback(null, true);
      return;
    }
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
}));

app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

app.get('/', (_req, res) => {
  res.json({
    nombre: 'Alzado',
    descripcion: 'API para convertir imágenes en modelos 3D.',
  });
});

app.use('/api/auth', auth);
app.use('/api/perfil', perfil);
app.use('/api', taller);
app.use('/api/admin', admin);

app.use((error, req, res, _next) => {
  if (error?.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ error: 'La imagen supera 10 MB. Elige un archivo más liviano.' });
    return;
  }
  console.error(JSON.stringify({
    nivel: 'error',
    id: req.id,
    mensaje: error.message,
  }));
  const estado = error.estado || 500;
  res.status(estado).json({
    error: estado === 500
      ? 'Ocurrió un error inesperado. Intenta de nuevo en unos segundos.'
      : error.message,
  });
});

module.exports = app;
