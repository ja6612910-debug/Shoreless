const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const {
  bcrypt,
  RONDAS,
  hashToken,
  contrasenaValida,
  correoValido,
  emitirSesion,
  bloqueado,
  registrarFallo,
  limpiarFallos,
  exigirAuth,
} = require('../lib/sesion');

const router = express.Router();

const limite = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos y vuelve a probar.' },
});

router.use(limite);

router.post('/registro', async (req, res) => {
  const nombre = String(req.body?.nombre || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const campos = {};
  if (nombre.length < 2 || nombre.length > 100) campos.nombre = 'Escribe un nombre de 2 a 100 caracteres.';
  if (!correoValido(email)) campos.email = 'Escribe un correo válido.';
  if (!contrasenaValida(password)) campos.password = 'Usa al menos 8 caracteres, con letras y números.';
  if (Object.keys(campos).length) {
    res.status(400).json({ error: 'Revisa los campos marcados.', campos });
    return;
  }

  const [existe] = await pool.query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [email]);
  if (existe.length) {
    res.status(409).json({
      error: 'Ese correo ya está registrado.',
      campos: { email: 'Usa otro correo o inicia sesión.' },
    });
    return;
  }

  const admin = process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.trim().toLowerCase();
  const hash = await bcrypt.hash(password, RONDAS);
  const [creado] = await pool.query(
    'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)',
    [nombre, email, hash, admin ? 'admin' : 'usuario'],
  );
  const sesion = await emitirSesion({
    id: creado.insertId,
    nombre,
    email,
    rol: admin ? 'admin' : 'usuario',
    creado_en: new Date(),
  });
  res.status(201).json(sesion);
});

router.post('/entrar', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (bloqueado(email, req.ip)) {
    res.status(429).json({ error: 'Demasiados intentos fallidos. Espera 15 minutos.' });
    return;
  }

  const [filas] = await pool.query(
    'SELECT id, nombre, email, password_hash, rol, activo, creado_en FROM usuarios WHERE email = ? LIMIT 1',
    [email],
  );
  const usuario = filas[0];
  const coincide = usuario && await bcrypt.compare(password, usuario.password_hash);
  if (!coincide) {
    registrarFallo(email, req.ip);
    res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    return;
  }
  if (!usuario.activo) {
    res.status(403).json({ error: 'Esta cuenta está desactivada. Si es un error, contacta a un administrador.' });
    return;
  }
  limpiarFallos(email, req.ip);
  res.json(await emitirSesion(usuario));
});

router.post('/refrescar', async (req, res) => {
  const token = String(req.body?.refresco || '');
  if (!token) {
    res.status(401).json({ error: 'Tu sesión expiró. Vuelve a entrar.' });
    return;
  }
  const [filas] = await pool.query(
    `SELECT t.id, u.id AS usuario_id, u.nombre, u.email, u.rol, u.creado_en
     FROM tokens_usuario t
     JOIN usuarios u ON u.id = t.usuario_id AND u.activo = 1
     WHERE t.token_hash = ?
       AND t.tipo = 'refresco'
       AND t.revocado_en IS NULL
       AND t.expira_en > NOW()
     LIMIT 1`,
    [hashToken(token)],
  );
  const fila = filas[0];
  if (!fila) {
    res.status(401).json({ error: 'Tu sesión expiró. Vuelve a entrar.' });
    return;
  }
  await pool.query(
    'UPDATE tokens_usuario SET revocado_en = NOW() WHERE id = ? AND revocado_en IS NULL',
    [fila.id],
  );
  res.json(await emitirSesion({
    id: fila.usuario_id,
    nombre: fila.nombre,
    email: fila.email,
    rol: fila.rol,
    creado_en: fila.creado_en,
  }));
});

router.post('/salir', exigirAuth, async (req, res) => {
  const token = String(req.body?.refresco || '');
  if (token) {
    await pool.query(
      `UPDATE tokens_usuario
       SET revocado_en = NOW()
       WHERE usuario_id = ? AND tipo = 'refresco' AND token_hash = ? AND revocado_en IS NULL`,
      [req.usuario.id, hashToken(token)],
    );
  } else {
    await pool.query(
      `UPDATE tokens_usuario
       SET revocado_en = NOW()
       WHERE usuario_id = ? AND tipo = 'refresco' AND revocado_en IS NULL`,
      [req.usuario.id],
    );
  }
  res.json({ ok: true });
});

router.post('/recuperar', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const respuesta = {
    mensaje: 'Si el correo está registrado, enviamos un enlace para restablecer la contraseña. Vence en 1 hora.',
  };
  if (!correoValido(email)) {
    res.json(respuesta);
    return;
  }
  const [filas] = await pool.query(
    'SELECT id FROM usuarios WHERE email = ? AND activo = 1 LIMIT 1',
    [email],
  );
  if (!filas[0]) {
    res.json(respuesta);
    return;
  }
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO tokens_usuario (usuario_id, tipo, token_hash, expira_en)
     VALUES (?, 'recuperacion', ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
    [filas[0].id, hashToken(token)],
  );
  const origen = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
  const enlace = `${origen}/restablecer/${token}`;
  console.log(JSON.stringify({ nivel: 'info', evento: 'recuperacion', enlace }));
  if (process.env.NODE_ENV !== 'production') respuesta.enlace = enlace;
  res.json(respuesta);
});

router.post('/restablecer', async (req, res) => {
  const token = String(req.body?.token || '');
  const password = String(req.body?.password || '');
  if (!contrasenaValida(password)) {
    res.status(400).json({
      error: 'La contraseña debe tener al menos 8 caracteres, con letras y números.',
      campos: { password: 'Usa letras y números, mínimo 8 caracteres.' },
    });
    return;
  }
  const hash = hashToken(token);
  const [filas] = await pool.query(
    `SELECT id, usuario_id FROM tokens_usuario
     WHERE token_hash = ?
       AND tipo = 'recuperacion'
       AND usado_en IS NULL
       AND revocado_en IS NULL
       AND expira_en > NOW()
     LIMIT 1`,
    [hash],
  );
  if (!filas[0]) {
    res.status(400).json({ error: 'El enlace no es válido o ya venció. Pide uno nuevo.' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, RONDAS);
  await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [passwordHash, filas[0].usuario_id]);
  await pool.query('UPDATE tokens_usuario SET usado_en = NOW() WHERE id = ?', [filas[0].id]);
  await pool.query(
    `UPDATE tokens_usuario SET revocado_en = NOW()
     WHERE usuario_id = ? AND tipo = 'refresco' AND revocado_en IS NULL`,
    [filas[0].usuario_id],
  );
  res.json({ mensaje: 'Contraseña actualizada. Entra de nuevo con la nueva clave.' });
});

module.exports = router;
