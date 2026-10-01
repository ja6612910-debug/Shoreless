const express = require('express');
const pool = require('../db');
const { exigirAuth, exigirAdmin } = require('../lib/sesion');

const router = express.Router();
router.use(exigirAuth, exigirAdmin);

router.get('/usuarios', async (req, res) => {
  const q = String(req.query.q || '').replace(/[\\%_]/g, '').slice(0, 80);
  const [filas] = await pool.query(
    `SELECT id, nombre, email, rol, activo, creado_en
     FROM usuarios
     WHERE ? = '' OR nombre LIKE CONCAT('%', ?, '%') OR email LIKE CONCAT('%', ?, '%')
     ORDER BY creado_en DESC
     LIMIT 50`,
    [q, q, q],
  );
  res.json(filas);
});

router.patch('/usuarios/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.usuario.id && req.body?.activo === false) {
    res.status(400).json({ error: 'No puedes desactivar tu propia cuenta de administrador.' });
    return;
  }
  const activo = req.body?.activo ? 1 : 0;
  const [resultado] = await pool.query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo, id]);
  if (!resultado.affectedRows) {
    res.status(404).json({ error: 'No encontramos ese usuario.' });
    return;
  }
  if (!activo) {
    await pool.query(
      `UPDATE tokens_usuario SET revocado_en = NOW()
       WHERE usuario_id = ? AND tipo = 'refresco' AND revocado_en IS NULL`,
      [id],
    );
  }
  console.log(JSON.stringify({
    nivel: 'info',
    evento: activo ? 'usuario_reactivado' : 'usuario_desactivado',
    usuarioId: id,
    responsable: req.usuario.id,
  }));
  res.json({ ok: true });
});

router.get('/metodos', async (_req, res) => {
  const [filas] = await pool.query(
    'SELECT id, codigo, nombre, descripcion, requiere_ia, activo FROM metodos_conversion ORDER BY id',
  );
  res.json(filas);
});

router.patch('/metodos/:id', async (req, res) => {
  const [resultado] = await pool.query(
    'UPDATE metodos_conversion SET activo = ? WHERE id = ?',
    [req.body?.activo ? 1 : 0, Number(req.params.id)],
  );
  if (!resultado.affectedRows) {
    res.status(404).json({ error: 'No encontramos ese método.' });
    return;
  }
  res.json({ ok: true });
});

router.get('/resumen', async (_req, res) => {
  const [porEstado] = await pool.query(
    `SELECT estado, COUNT(*) AS total
     FROM trabajos_conversion
     WHERE creado_en > DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY estado`,
  );
  const [porMetodo] = await pool.query(
    `SELECT m.nombre, t.estado, COUNT(*) AS total
     FROM trabajos_conversion t
     JOIN metodos_conversion m ON m.id = t.metodo_id
     WHERE t.creado_en > DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY m.id, m.nombre, t.estado`,
  );
  const [atascados] = await pool.query(
    `SELECT t.id, t.estado, t.iniciado_en, u.email, m.nombre AS metodo
     FROM trabajos_conversion t
     JOIN usuarios u ON u.id = t.usuario_id
     JOIN metodos_conversion m ON m.id = t.metodo_id
     WHERE t.estado = 'procesando'
       AND t.iniciado_en < DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
  );
  const totales = Object.fromEntries(porEstado.map((fila) => [fila.estado, Number(fila.total)]));
  const hechos = (totales.completado || 0) + (totales.fallido || 0);
  res.json({
    totales,
    tasaFallos: hechos ? (totales.fallido || 0) / hechos : 0,
    porMetodo,
    atascados,
  });
});

module.exports = router;
