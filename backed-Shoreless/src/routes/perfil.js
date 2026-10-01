const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const archivos = require('../lib/archivos');
const { exigirAuth, contrasenaValida, publico, RONDAS } = require('../lib/sesion');

const router = express.Router();
router.use(exigirAuth);

router.get('/', async (req, res) => {
  const [filas] = await pool.query(
    'SELECT id, nombre, email, rol, creado_en FROM usuarios WHERE id = ?',
    [req.usuario.id],
  );
  if (!filas[0]) {
    res.status(404).json({ error: 'No encontramos tu cuenta.' });
    return;
  }
  res.json(publico(filas[0]));
});

router.patch('/', async (req, res) => {
  const nombre = String(req.body?.nombre || '').trim();
  if (nombre.length < 2 || nombre.length > 100) {
    res.status(400).json({
      error: 'Revisa el nombre.',
      campos: { nombre: 'Usa entre 2 y 100 caracteres.' },
    });
    return;
  }
  await pool.query('UPDATE usuarios SET nombre = ? WHERE id = ?', [nombre, req.usuario.id]);
  const [filas] = await pool.query(
    'SELECT id, nombre, email, rol, creado_en FROM usuarios WHERE id = ?',
    [req.usuario.id],
  );
  res.json(publico(filas[0]));
});

router.post('/contrasena', async (req, res) => {
  const actual = String(req.body?.actual || '');
  const nueva = String(req.body?.nueva || '');
  if (!contrasenaValida(nueva)) {
    res.status(400).json({
      error: 'La nueva contraseña no cumple las reglas.',
      campos: { nueva: 'Mínimo 8 caracteres, con letras y números.' },
    });
    return;
  }
  const [filas] = await pool.query('SELECT password_hash FROM usuarios WHERE id = ?', [req.usuario.id]);
  const coincide = filas[0] && await bcrypt.compare(actual, filas[0].password_hash);
  if (!coincide) {
    res.status(400).json({
      error: 'La contraseña actual no coincide.',
      campos: { actual: 'Escríbela de nuevo.' },
    });
    return;
  }
  const hash = await bcrypt.hash(nueva, RONDAS);
  await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, req.usuario.id]);
  await pool.query(
    `UPDATE tokens_usuario SET revocado_en = NOW()
     WHERE usuario_id = ? AND tipo = 'refresco' AND revocado_en IS NULL`,
    [req.usuario.id],
  );
  res.json({ mensaje: 'Contraseña actualizada. Tus otras sesiones se cerraron.' });
});

router.delete('/', async (req, res) => {
  if (req.body?.confirmacion !== 'ELIMINAR') {
    res.status(400).json({ error: 'Escribe ELIMINAR para confirmar que quieres borrar la cuenta y todos tus datos.' });
    return;
  }
  const [imagenes] = await pool.query(
    `SELECT i.clave_almacenamiento
     FROM imagenes i
     JOIN proyectos p ON p.id = i.proyecto_id
     WHERE p.usuario_id = ?`,
    [req.usuario.id],
  );
  const [modelos] = await pool.query(
    'SELECT clave_glb FROM modelos_3d WHERE proyecto_id IN (SELECT id FROM proyectos WHERE usuario_id = ?)',
    [req.usuario.id],
  );
  await Promise.all([
    ...imagenes.map((fila) => archivos.borrar(fila.clave_almacenamiento)),
    ...modelos.map((fila) => archivos.borrar(fila.clave_glb)),
  ]);
  await pool.query('DELETE FROM usuarios WHERE id = ?', [req.usuario.id]);
  res.json({ ok: true });
});

module.exports = router;
