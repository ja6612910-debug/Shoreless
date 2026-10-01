const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const RONDAS = 12;
const fallos = new Map();

function secreto() {
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Falta JWT_SECRET.');
    }
    process.env.JWT_SECRET = 'alzado-dev-solo-local';
  }
  return process.env.JWT_SECRET;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function contrasenaValida(valor) {
  return typeof valor === 'string'
    && valor.length >= 8
    && /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(valor)
    && /\d/.test(valor);
}

function correoValido(valor) {
  return typeof valor === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor) && valor.length <= 190;
}

function publico(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    creadoEn: usuario.creado_en,
  };
}

async function emitirSesion(usuario) {
  const acceso = jwt.sign(
    { sub: usuario.id, rol: usuario.rol, nombre: usuario.nombre },
    secreto(),
    { expiresIn: '15m' },
  );
  const refresco = crypto.randomBytes(32).toString('hex');
  const expira = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO tokens_usuario (usuario_id, tipo, token_hash, expira_en)
     VALUES (?, 'refresco', ?, ?)`,
    [usuario.id, hashToken(refresco), expira],
  );
  return { acceso, refresco, usuario: publico(usuario) };
}

function claveIntento(email, ip) {
  return `${email}|${ip || ''}`;
}

function bloqueado(email, ip) {
  const previo = fallos.get(claveIntento(email, ip));
  if (!previo) return false;
  if (Date.now() - previo.desde > 15 * 60 * 1000) return false;
  return previo.n >= 5;
}

function registrarFallo(email, ip) {
  const clave = claveIntento(email, ip);
  const ahora = Date.now();
  const previo = fallos.get(clave);
  if (!previo || ahora - previo.desde > 15 * 60 * 1000) {
    fallos.set(clave, { n: 1, desde: ahora });
    return;
  }
  previo.n += 1;
}

function limpiarFallos(email, ip) {
  fallos.delete(claveIntento(email, ip));
}

function exigirAuth(req, res, next) {
  const encabezado = req.headers.authorization || '';
  const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Tu sesión expiró. Vuelve a entrar.' });
    return;
  }
  try {
    const datos = jwt.verify(token, secreto());
    req.usuario = { id: Number(datos.sub), rol: datos.rol, nombre: datos.nombre };
    next();
  } catch {
    res.status(401).json({ error: 'Tu sesión expiró. Vuelve a entrar.' });
  }
}

function exigirAdmin(req, res, next) {
  if (req.usuario?.rol !== 'admin') {
    res.status(403).json({ error: 'No tienes permiso para esta acción.' });
    return;
  }
  next();
}

module.exports = {
  RONDAS,
  bcrypt,
  hashToken,
  contrasenaValida,
  correoValido,
  publico,
  emitirSesion,
  bloqueado,
  registrarFallo,
  limpiarFallos,
  exigirAuth,
  exigirAdmin,
};
