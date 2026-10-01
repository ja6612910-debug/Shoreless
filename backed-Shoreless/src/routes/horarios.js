const express = require('express');
const pool = require('../db');
const { iniciarBase } = require('../bootstrap');
const { ahoraBogota, presentar, DIAS, TIPOS } = require('../tiempo');

const router = express.Router();

const SELECT = `
  SELECT
    h.id,
    h.barrio_id,
    h.dia_semana,
    DATE_FORMAT(h.hora, '%H:%i') AS hora,
    DATE_FORMAT(h.hora_fin, '%H:%i') AS hora_fin,
    h.tipo,
    h.frecuencia,
    h.punto_referencia,
    h.notas,
    b.nombre AS barrio_nombre,
    b.comuna AS barrio_comuna
  FROM horarios h
  INNER JOIN barrios b ON b.id = h.barrio_id
  WHERE h.activo = 1
`;

async function listar({ barrioId, dia, tipo, q }) {
  const filtros = [];
  const params = [];

  if (barrioId) {
    filtros.push('h.barrio_id = ?');
    params.push(barrioId);
  }
  if (dia !== undefined && dia !== null && dia !== '') {
    filtros.push('h.dia_semana = ?');
    params.push(Number(dia));
  }
  if (tipo) {
    filtros.push('h.tipo = ?');
    params.push(tipo);
  }
  if (q) {
    filtros.push('(b.nombre LIKE ? OR b.comuna LIKE ? OR h.punto_referencia LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  const where = filtros.length ? ` AND ${filtros.join(' AND ')}` : '';
  const [filas] = await pool.query(
    `${SELECT}${where} ORDER BY b.nombre, h.dia_semana, h.hora`,
    params,
  );
  return filas;
}

router.post('/admin/iniciar', async (req, res, next) => {
  try {
    const clave = process.env.INIT_KEY;
    if (!clave || req.get('x-init-key') !== clave) {
      res.status(401).json({ error: 'No autorizado.' });
      return;
    }
    const resultado = await iniciarBase();
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

router.get('/salud', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, zona: 'America/Bogota' });
  } catch (error) {
    next(error);
  }
});

router.get('/catalogo', (_req, res) => {
  res.json({
    dias: DIAS.map((nombre, id) => ({ id, nombre })),
    tipos: Object.entries(TIPOS).map(([id, nombre]) => ({ id, nombre })),
  });
});

router.get('/barrios', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const ahora = ahoraBogota();
    const filas = await listar({ q });
    const grupos = new Map();

    for (const fila of filas) {
      const horario = presentar(fila, ahora);
      if (!grupos.has(horario.barrio.id)) {
        grupos.set(horario.barrio.id, {
          ...horario.barrio,
          horarios: [],
          proxima: null,
        });
      }
      const grupo = grupos.get(horario.barrio.id);
      grupo.horarios.push(horario);
      if (!grupo.proxima || horario.espera < grupo.proxima.espera) {
        grupo.proxima = horario;
      }
    }

    if (grupos.size === 0 && q) {
      const like = `%${q}%`;
      const [barrios] = await pool.query(
        `SELECT id, nombre, comuna FROM barrios
         WHERE nombre LIKE ? OR comuna LIKE ?
         ORDER BY nombre`,
        [like, like],
      );
      res.json({ ahora, barrios: barrios.map((barrio) => ({ ...barrio, horarios: [], proxima: null })) });
      return;
    }

    const barrios = [...grupos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    res.json({ ahora, barrios });
  } catch (error) {
    next(error);
  }
});

router.get('/barrios/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [barrios] = await pool.query(
      'SELECT id, nombre, comuna FROM barrios WHERE id = ?',
      [id],
    );
    if (!barrios.length) {
      res.status(404).json({ error: 'No encontramos ese barrio.' });
      return;
    }

    const ahora = ahoraBogota();
    const horarios = (await listar({ barrioId: id }))
      .map((fila) => presentar(fila, ahora))
      .sort((a, b) => a.espera - b.espera);
    const proxima = horarios[0] || null;

    res.json({
      ahora,
      barrio: barrios[0],
      proxima,
      horarios,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/horarios', async (req, res, next) => {
  try {
    const ahora = ahoraBogota();
    const horarios = (await listar({
      barrioId: req.query.barrioId,
      dia: req.query.dia,
      tipo: req.query.tipo,
      q: String(req.query.q || '').trim(),
    })).map((fila) => presentar(fila, ahora));

    res.json({ ahora, horarios });
  } catch (error) {
    next(error);
  }
});

router.get('/resumen', async (req, res, next) => {
  try {
    const ahora = ahoraBogota();
    const barrioId = req.query.barrioId ? Number(req.query.barrioId) : undefined;
    const tipo = req.query.tipo || undefined;
    const filas = await listar({ barrioId, tipo });
    const horarios = filas.map((fila) => presentar(fila, ahora));
    const hoy = horarios
      .filter((horario) => horario.diaSemana === ahora.dia)
      .sort((a, b) => a.hora.localeCompare(b.hora));
    const proximos = [...horarios].sort((a, b) => a.espera - b.espera);

    res.json({
      ahora,
      proxima: proximos[0] || null,
      hoy,
      semana: DIAS.map((nombre, dia) => ({
        dia,
        nombre,
        esHoy: dia === ahora.dia,
        total: horarios.filter((horario) => horario.diaSemana === dia).length,
      })),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
