const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const pool = require('../db');
const archivos = require('../lib/archivos');
const { exigirAuth } = require('../lib/sesion');
const { procesarPendientes } = require('../worker');
const { leerMalla, aObj, aStl } = require('../lib/mesh');

const router = express.Router();
const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function escaparLike(valor) {
  return String(valor || '').replace(/[\\%_]/g, '').slice(0, 80);
}

router.get('/metodos', exigirAuth, async (_req, res) => {
  const [filas] = await pool.query(
    `SELECT id, codigo, nombre, descripcion, requiere_ia, parametros_por_defecto
     FROM metodos_conversion WHERE activo = 1 ORDER BY id`,
  );
  res.json(filas);
});

router.get('/proyectos', exigirAuth, async (req, res) => {
  const q = escaparLike(req.query.q);
  const pagina = Math.max(1, Number(req.query.pagina) || 1);
  const limite = Math.min(24, Math.max(1, Number(req.query.limite) || 12));
  const offset = (pagina - 1) * limite;
  const papelera = req.query.estado === 'papelera';
  const archivado = req.query.estado === 'archivado';
  const ordenNombre = req.query.orden === 'nombre';
  const filtroEstado = papelera
    ? 'p.eliminado_en IS NOT NULL'
    : archivado
      ? "p.eliminado_en IS NULL AND p.estado = 'archivado'"
      : "p.eliminado_en IS NULL AND p.estado = 'activo'";
  const orden = ordenNombre ? 'p.nombre ASC' : 'p.actualizado_en DESC';
  const donde = `p.usuario_id = ? AND ${filtroEstado}
    AND (? = '' OR p.nombre LIKE CONCAT('%', ?, '%') OR IFNULL(p.descripcion, '') LIKE CONCAT('%', ?, '%'))`;
  const params = [req.usuario.id, q, q, q];

  const [conteo] = await pool.query(
    `SELECT COUNT(*) AS total FROM proyectos p WHERE ${donde}`,
    params,
  );
  const [filas] = await pool.query(
    `SELECT p.id, p.nombre, p.descripcion, p.estado, p.eliminado_en, p.actualizado_en,
            t.id AS trabajo_id, t.estado AS trabajo_estado, t.progreso, t.mensaje_error,
            m.id AS modelo_id, m.nombre AS modelo_nombre
     FROM proyectos p
     LEFT JOIN imagenes i ON i.id = (
       SELECT id FROM imagenes WHERE proyecto_id = p.id ORDER BY creado_en DESC LIMIT 1
     )
     LEFT JOIN trabajos_conversion t ON t.id = (
       SELECT id FROM trabajos_conversion WHERE imagen_id = i.id ORDER BY creado_en DESC LIMIT 1
     )
     LEFT JOIN modelos_3d m ON m.trabajo_id = t.id AND m.eliminado_en IS NULL
     WHERE ${donde}
     ORDER BY ${orden}
     LIMIT ${limite} OFFSET ${offset}`,
    params,
  );

  res.json({
    pagina,
    total: Number(conteo[0].total),
    proyectos: filas.map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      descripcion: fila.descripcion,
      estado: fila.eliminado_en ? 'papelera' : fila.estado,
      actualizadoEn: fila.actualizado_en,
      trabajo: fila.trabajo_id ? {
        id: fila.trabajo_id,
        estado: fila.trabajo_estado,
        progreso: fila.progreso,
        mensajeError: fila.mensaje_error,
      } : null,
      modelo: fila.modelo_id ? { id: fila.modelo_id, nombre: fila.modelo_nombre } : null,
    })),
  });
});

router.post('/proyectos', exigirAuth, async (req, res) => {
  const nombre = String(req.body?.nombre || '').trim();
  const descripcion = String(req.body?.descripcion || '').trim() || null;
  if (nombre.length < 2 || nombre.length > 150) {
    res.status(400).json({ error: 'El proyecto necesita un nombre de 2 a 150 caracteres.' });
    return;
  }
  const [creado] = await pool.query(
    'INSERT INTO proyectos (usuario_id, nombre, descripcion) VALUES (?, ?, ?)',
    [req.usuario.id, nombre, descripcion],
  );
  res.status(201).json({ id: creado.insertId, nombre, descripcion });
});

router.patch('/proyectos/:id', exigirAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [filas] = await pool.query(
    'SELECT id FROM proyectos WHERE id = ? AND usuario_id = ? AND eliminado_en IS NULL',
    [id, req.usuario.id],
  );
  if (!filas[0]) {
    res.status(404).json({ error: 'No encontramos ese proyecto.' });
    return;
  }
  const nombre = req.body?.nombre != null ? String(req.body.nombre).trim() : null;
  const descripcion = req.body?.descripcion != null ? String(req.body.descripcion).trim() : null;
  const estado = req.body?.estado;
  if (nombre != null && (nombre.length < 2 || nombre.length > 150)) {
    res.status(400).json({ error: 'El nombre debe tener entre 2 y 150 caracteres.' });
    return;
  }
  if (estado && !['activo', 'archivado'].includes(estado)) {
    res.status(400).json({ error: 'El estado solo puede ser activo o archivado.' });
    return;
  }
  await pool.query(
    `UPDATE proyectos
     SET nombre = COALESCE(?, nombre),
         descripcion = COALESCE(?, descripcion),
         estado = COALESCE(?, estado)
     WHERE id = ?`,
    [nombre, descripcion, estado || null, id],
  );
  res.json({ ok: true });
});

router.delete('/proyectos/:id', exigirAuth, async (req, res) => {
  const [resultado] = await pool.query(
    `UPDATE proyectos SET eliminado_en = NOW()
     WHERE id = ? AND usuario_id = ? AND eliminado_en IS NULL`,
    [Number(req.params.id), req.usuario.id],
  );
  if (!resultado.affectedRows) {
    res.status(404).json({ error: 'No encontramos ese proyecto.' });
    return;
  }
  res.json({ mensaje: 'El proyecto pasó a la papelera. Se borra de forma definitiva a los 30 días.' });
});

router.post('/proyectos/:id/restaurar', exigirAuth, async (req, res) => {
  const [resultado] = await pool.query(
    `UPDATE proyectos SET eliminado_en = NULL, estado = 'activo'
     WHERE id = ? AND usuario_id = ? AND eliminado_en IS NOT NULL`,
    [Number(req.params.id), req.usuario.id],
  );
  if (!resultado.affectedRows) {
    res.status(404).json({ error: 'Ese proyecto no está en la papelera.' });
    return;
  }
  res.json({ ok: true });
});

router.post('/proyectos/:id/imagenes', exigirAuth, subida.single('archivo'), async (req, res) => {
  const proyectoId = Number(req.params.id);
  const [proyectos] = await pool.query(
    'SELECT id FROM proyectos WHERE id = ? AND usuario_id = ? AND eliminado_en IS NULL',
    [proyectoId, req.usuario.id],
  );
  if (!proyectos[0]) {
    res.status(404).json({ error: 'No encontramos ese proyecto.' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: 'Elige una imagen JPG, PNG o WebP de hasta 10 MB.' });
    return;
  }
  const tipo = archivos.tipoReal(req.file.buffer);
  if (!tipo) {
    res.status(400).json({ error: 'El archivo no es una imagen JPG, PNG o WebP. Elige otro archivo.' });
    return;
  }
  let meta;
  try {
    meta = await sharp(req.file.buffer).metadata();
  } catch {
    res.status(400).json({ error: 'No pudimos leer la imagen. Prueba con otro archivo.' });
    return;
  }
  const clave = archivos.claveNueva(`usuarios/${req.usuario.id}/imagenes`, tipo.extension);
  await archivos.guardar(clave, req.file.buffer);
  const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
  const [creada] = await pool.query(
    `INSERT INTO imagenes
      (proyecto_id, nombre_original, clave_almacenamiento, mime_type, tamano_bytes, ancho_px, alto_px, hash_sha256)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proyectoId,
      (req.file.originalname || `imagen.${tipo.extension}`).slice(0, 255),
      clave,
      tipo.mime,
      req.file.size,
      meta.width || null,
      meta.height || null,
      hash,
    ],
  );
  res.status(201).json({
    id: creada.insertId,
    proyectoId,
    nombre: req.file.originalname,
    ancho: meta.width || null,
    alto: meta.height || null,
  });
});

router.post('/trabajos', exigirAuth, async (req, res) => {
  const imagenId = Number(req.body?.imagenId);
  const codigo = String(req.body?.metodo || '');
  const parametros = req.body?.parametros && typeof req.body.parametros === 'object' ? req.body.parametros : {};
  const [imagenes] = await pool.query(
    `SELECT i.id, i.proyecto_id
     FROM imagenes i
     JOIN proyectos p ON p.id = i.proyecto_id
     WHERE i.id = ? AND p.usuario_id = ? AND p.eliminado_en IS NULL`,
    [imagenId, req.usuario.id],
  );
  if (!imagenes[0]) {
    res.status(404).json({ error: 'No encontramos esa imagen.' });
    return;
  }
  const [metodos] = await pool.query(
    'SELECT id, activo, parametros_por_defecto FROM metodos_conversion WHERE codigo = ? LIMIT 1',
    [codigo],
  );
  if (!metodos[0] || !metodos[0].activo) {
    res.status(400).json({ error: 'Ese método no está disponible.' });
    return;
  }
  const base = typeof metodos[0].parametros_por_defecto === 'string'
    ? JSON.parse(metodos[0].parametros_por_defecto)
    : (metodos[0].parametros_por_defecto || {});
  const [creado] = await pool.query(
    `INSERT INTO trabajos_conversion (imagen_id, metodo_id, usuario_id, parametros)
     VALUES (?, ?, ?, ?)`,
    [imagenId, metodos[0].id, req.usuario.id, JSON.stringify({ ...base, ...parametros })],
  );
  res.status(202).json({ id: creado.insertId, estado: 'pendiente', progreso: 0 });
  procesarPendientes().catch(() => {});
});

router.get('/trabajos/:id', exigirAuth, async (req, res) => {
  const [filas] = await pool.query(
    `SELECT t.id, t.estado, t.progreso, t.mensaje_error, t.parametros, t.creado_en,
            m.codigo, m.nombre AS metodo, mo.id AS modelo_id, i.nombre_original
     FROM trabajos_conversion t
     JOIN imagenes i ON i.id = t.imagen_id
     JOIN metodos_conversion m ON m.id = t.metodo_id
     LEFT JOIN modelos_3d mo ON mo.trabajo_id = t.id
     WHERE t.id = ? AND t.usuario_id = ?`,
    [Number(req.params.id), req.usuario.id],
  );
  if (!filas[0]) {
    res.status(404).json({ error: 'No encontramos esa conversión.' });
    return;
  }
  if (filas[0].estado === 'pendiente') {
    if (process.env.VERCEL) await procesarPendientes();
    else procesarPendientes().catch(() => {});
  }
  if (process.env.VERCEL && filas[0].estado === 'pendiente') {
    const [actualizado] = await pool.query(
      `SELECT t.id, t.estado, t.progreso, t.mensaje_error, t.parametros, t.creado_en,
              m.codigo, m.nombre AS metodo, mo.id AS modelo_id, i.nombre_original
       FROM trabajos_conversion t
       JOIN imagenes i ON i.id = t.imagen_id
       JOIN metodos_conversion m ON m.id = t.metodo_id
       LEFT JOIN modelos_3d mo ON mo.trabajo_id = t.id
       WHERE t.id = ? AND t.usuario_id = ?`,
      [Number(req.params.id), req.usuario.id],
    );
    if (actualizado[0]) filas[0] = actualizado[0];
  }
  const fila = filas[0];
  res.json({
    id: fila.id,
    estado: fila.estado,
    progreso: fila.progreso,
    mensajeError: fila.mensaje_error,
    parametros: fila.parametros,
    metodo: fila.metodo,
    codigo: fila.codigo,
    nombre: String(fila.nombre_original || '').replace(/\.[^.]+$/, '') || fila.metodo,
    modeloId: fila.modelo_id,
    creadoEn: fila.creado_en,
  });
});

router.post('/trabajos/:id/cancelar', exigirAuth, async (req, res) => {
  const [resultado] = await pool.query(
    `UPDATE trabajos_conversion
     SET estado = 'cancelado', finalizado_en = NOW()
     WHERE id = ? AND usuario_id = ? AND estado IN ('pendiente', 'procesando')`,
    [Number(req.params.id), req.usuario.id],
  );
  if (!resultado.affectedRows) {
    res.status(409).json({ error: 'Solo puedes cancelar una conversión pendiente o en proceso.' });
    return;
  }
  res.json({ ok: true });
});

router.post('/trabajos/:id/reintentar', exigirAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [filas] = await pool.query(
    `SELECT imagen_id, metodo_id, parametros, estado
     FROM trabajos_conversion WHERE id = ? AND usuario_id = ?`,
    [id, req.usuario.id],
  );
  if (!filas[0]) {
    res.status(404).json({ error: 'No encontramos esa conversión.' });
    return;
  }
  if (!['fallido', 'cancelado'].includes(filas[0].estado)) {
    res.status(409).json({ error: 'Solo puedes reintentar una conversión fallida o cancelada.' });
    return;
  }
  const [creado] = await pool.query(
    `INSERT INTO trabajos_conversion (imagen_id, metodo_id, usuario_id, parametros)
     VALUES (?, ?, ?, ?)`,
    [filas[0].imagen_id, filas[0].metodo_id, req.usuario.id, JSON.stringify(filas[0].parametros || {})],
  );
  res.status(202).json({ id: creado.insertId, estado: 'pendiente' });
  procesarPendientes().catch(() => {});
});

async function modeloDelUsuario(id, usuarioId) {
  const [filas] = await pool.query(
    `SELECT mo.id, mo.nombre, mo.version, mo.es_principal, mo.clave_glb, mo.num_vertices, mo.num_caras,
            mo.proyecto_id, mo.creado_en, p.nombre AS proyecto
     FROM modelos_3d mo
     JOIN proyectos p ON p.id = mo.proyecto_id
     WHERE mo.id = ? AND p.usuario_id = ? AND mo.eliminado_en IS NULL AND p.eliminado_en IS NULL`,
    [id, usuarioId],
  );
  return filas[0] || null;
}

router.get('/modelos/:id', exigirAuth, async (req, res) => {
  const modelo = await modeloDelUsuario(Number(req.params.id), req.usuario.id);
  if (!modelo) {
    res.status(404).json({ error: 'No encontramos ese modelo.' });
    return;
  }
  res.json({
    id: modelo.id,
    nombre: modelo.nombre,
    version: modelo.version,
    esPrincipal: Boolean(modelo.es_principal),
    vertices: modelo.num_vertices,
    caras: modelo.num_caras,
    proyectoId: modelo.proyecto_id,
    proyecto: modelo.proyecto,
    creadoEn: modelo.creado_en,
  });
});

router.get('/modelos/:id/archivo', exigirAuth, async (req, res) => {
  const modelo = await modeloDelUsuario(Number(req.params.id), req.usuario.id);
  if (!modelo) {
    res.status(404).json({ error: 'No encontramos ese modelo.' });
    return;
  }
  const buffer = await archivos.leer(modelo.clave_glb);
  res.setHeader('Content-Type', 'model/gltf-binary');
  res.send(buffer);
});

router.post('/modelos/:id/principal', exigirAuth, async (req, res) => {
  const modelo = await modeloDelUsuario(Number(req.params.id), req.usuario.id);
  if (!modelo) {
    res.status(404).json({ error: 'No encontramos ese modelo.' });
    return;
  }
  await pool.query(
    'UPDATE modelos_3d SET es_principal = 0 WHERE proyecto_id = ?',
    [modelo.proyecto_id],
  );
  await pool.query('UPDATE modelos_3d SET es_principal = 1 WHERE id = ?', [modelo.id]);
  res.json({ ok: true });
});

router.post('/modelos/:id/exportar', exigirAuth, async (req, res) => {
  const formato = String(req.body?.formato || 'glb');
  if (!['glb', 'obj', 'stl'].includes(formato)) {
    res.status(400).json({ error: 'Elige GLB, OBJ o STL.' });
    return;
  }
  const modelo = await modeloDelUsuario(Number(req.params.id), req.usuario.id);
  if (!modelo) {
    res.status(404).json({ error: 'No encontramos ese modelo.' });
    return;
  }
  const glb = await archivos.leer(modelo.clave_glb);
  await pool.query(
    'INSERT INTO exportaciones (modelo_id, usuario_id, formato) VALUES (?, ?, ?)',
    [modelo.id, req.usuario.id, formato],
  );
  const base = modelo.nombre.replace(/[^\w\-]+/g, '_').slice(0, 40) || 'modelo';
  if (formato === 'glb') {
    res.setHeader('Content-Type', 'model/gltf-binary');
    res.setHeader('Content-Disposition', `attachment; filename="${base}.glb"`);
    res.send(glb);
    return;
  }
  const malla = leerMalla(glb);
  if (formato === 'obj') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${base}.obj"`);
    res.send(aObj(malla.posiciones, malla.indices));
    return;
  }
  res.setHeader('Content-Type', 'model/stl');
  res.setHeader('Content-Disposition', `attachment; filename="${base}.stl"`);
  res.send(aStl(malla.posiciones, malla.indices));
});

router.get('/modelos/:id/enlaces', exigirAuth, async (req, res) => {
  const modelo = await modeloDelUsuario(Number(req.params.id), req.usuario.id);
  if (!modelo) {
    res.status(404).json({ error: 'No encontramos ese modelo.' });
    return;
  }
  const [filas] = await pool.query(
    `SELECT id, token, expira_en, revocado_en, visitas, creado_en
     FROM enlaces_compartidos WHERE modelo_id = ? AND creado_por = ?
     ORDER BY creado_en DESC`,
    [modelo.id, req.usuario.id],
  );
  res.json(filas.map((fila) => ({
    id: fila.id,
    token: fila.token,
    expiraEn: fila.expira_en,
    revocadoEn: fila.revocado_en,
    visitas: fila.visitas,
    creadoEn: fila.creado_en,
  })));
});

router.post('/modelos/:id/enlaces', exigirAuth, async (req, res) => {
  const modelo = await modeloDelUsuario(Number(req.params.id), req.usuario.id);
  if (!modelo) {
    res.status(404).json({ error: 'No encontramos ese modelo.' });
    return;
  }
  const dias = Number(req.body?.dias);
  const token = crypto.randomBytes(32).toString('hex');
  const expira = Number.isFinite(dias) && dias > 0 ? new Date(Date.now() + dias * 24 * 60 * 60 * 1000) : null;
  const [creado] = await pool.query(
    'INSERT INTO enlaces_compartidos (modelo_id, creado_por, token, expira_en) VALUES (?, ?, ?, ?)',
    [modelo.id, req.usuario.id, token, expira],
  );
  res.status(201).json({ id: creado.insertId, token, expiraEn: expira, visitas: 0 });
});

router.delete('/enlaces/:id', exigirAuth, async (req, res) => {
  const [resultado] = await pool.query(
    `UPDATE enlaces_compartidos SET revocado_en = NOW()
     WHERE id = ? AND creado_por = ? AND revocado_en IS NULL`,
    [Number(req.params.id), req.usuario.id],
  );
  if (!resultado.affectedRows) {
    res.status(404).json({ error: 'No encontramos ese enlace.' });
    return;
  }
  res.json({ ok: true });
});

router.get('/publico/:token', async (req, res) => {
  const token = String(req.params.token || '');
  const [filas] = await pool.query(
    `SELECT e.id, mo.id AS modelo_id, mo.nombre, mo.num_vertices, mo.num_caras
     FROM enlaces_compartidos e
     JOIN modelos_3d mo ON mo.id = e.modelo_id AND mo.eliminado_en IS NULL
     WHERE e.token = ?
       AND e.revocado_en IS NULL
       AND (e.expira_en IS NULL OR e.expira_en > NOW())
     LIMIT 1`,
    [token],
  );
  if (!filas[0]) {
    res.status(404).json({ error: 'Este enlace ya no está disponible.' });
    return;
  }
  await pool.query('UPDATE enlaces_compartidos SET visitas = visitas + 1 WHERE id = ?', [filas[0].id]);
  res.json({
    nombre: filas[0].nombre,
    vertices: filas[0].num_vertices,
    caras: filas[0].num_caras,
  });
});

router.get('/publico/:token/archivo', async (req, res) => {
  const [filas] = await pool.query(
    `SELECT mo.clave_glb
     FROM enlaces_compartidos e
     JOIN modelos_3d mo ON mo.id = e.modelo_id AND mo.eliminado_en IS NULL
     WHERE e.token = ?
       AND e.revocado_en IS NULL
       AND (e.expira_en IS NULL OR e.expira_en > NOW())
     LIMIT 1`,
    [String(req.params.token || '')],
  );
  if (!filas[0]) {
    res.status(404).json({ error: 'Este enlace ya no está disponible.' });
    return;
  }
  const buffer = await archivos.leer(filas[0].clave_glb);
  res.setHeader('Content-Type', 'model/gltf-binary');
  res.send(buffer);
});

module.exports = router;
