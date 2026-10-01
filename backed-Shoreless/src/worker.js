const pool = require('./db');
const archivos = require('./lib/archivos');
const { convertirImagen } = require('./lib/convertir');

let ocupado = false;

async function depurarPapelera() {
  const [proyectos] = await pool.query(
    `SELECT id FROM proyectos
     WHERE eliminado_en IS NOT NULL
       AND eliminado_en < DATE_SUB(NOW(), INTERVAL 30 DAY)`,
  );
  for (const proyecto of proyectos) {
    const [imagenes] = await pool.query(
      'SELECT clave_almacenamiento FROM imagenes WHERE proyecto_id = ?',
      [proyecto.id],
    );
    const [modelos] = await pool.query(
      'SELECT clave_glb FROM modelos_3d WHERE proyecto_id = ?',
      [proyecto.id],
    );
    await Promise.all([
      ...imagenes.map((fila) => archivos.borrar(fila.clave_almacenamiento)),
      ...modelos.map((fila) => archivos.borrar(fila.clave_glb)),
    ]);
    await pool.query('DELETE FROM proyectos WHERE id = ?', [proyecto.id]);
  }
}

async function procesarTrabajo(id) {
  const [reclamado] = await pool.query(
    `UPDATE trabajos_conversion
     SET estado = 'procesando', iniciado_en = NOW(), intentos = intentos + 1, progreso = 10
     WHERE id = ? AND estado = 'pendiente'`,
    [id],
  );
  if (!reclamado.affectedRows) return;

  const [filas] = await pool.query(
    `SELECT t.id, t.parametros, t.usuario_id, t.imagen_id,
            i.clave_almacenamiento, i.proyecto_id, i.nombre_original,
            m.codigo
     FROM trabajos_conversion t
     JOIN imagenes i ON i.id = t.imagen_id
     JOIN metodos_conversion m ON m.id = t.metodo_id
     WHERE t.id = ?`,
    [id],
  );
  const trabajo = filas[0];
  if (!trabajo) return;

  try {
    const buffer = await archivos.leer(trabajo.clave_almacenamiento);
    await pool.query('UPDATE trabajos_conversion SET progreso = 40 WHERE id = ? AND estado = \'procesando\'', [id]);
    const resultado = await convertirImagen(buffer, trabajo.codigo, trabajo.parametros || {});

    const [vigente] = await pool.query(
      'SELECT estado FROM trabajos_conversion WHERE id = ?',
      [id],
    );
    if (vigente[0]?.estado === 'cancelado') return;

    const clave = archivos.claveNueva(`usuarios/${trabajo.usuario_id}/modelos`, 'glb');
    await archivos.guardar(clave, resultado.glb);

    const [versiones] = await pool.query(
      'SELECT COUNT(*) AS total FROM modelos_3d WHERE proyecto_id = ?',
      [trabajo.proyecto_id],
    );
    const version = Number(versiones[0].total) + 1;
    const nombre = trabajo.nombre_original.replace(/\.[^.]+$/, '') || 'Modelo';

    await pool.query(
      `INSERT INTO modelos_3d
        (proyecto_id, trabajo_id, nombre, version, es_principal, clave_glb, tamano_bytes, num_vertices, num_caras)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trabajo.proyecto_id,
        trabajo.id,
        nombre,
        version,
        version === 1 ? 1 : 0,
        clave,
        resultado.glb.length,
        resultado.vertices,
        resultado.caras,
      ],
    );
    await pool.query(
      `UPDATE trabajos_conversion
       SET estado = 'completado', progreso = 100, finalizado_en = NOW(), mensaje_error = NULL
       WHERE id = ? AND estado = 'procesando'`,
      [id],
    );
  } catch (error) {
    await pool.query(
      `UPDATE trabajos_conversion
       SET estado = 'fallido', progreso = 0, mensaje_error = ?, finalizado_en = NOW()
       WHERE id = ? AND estado = 'procesando'`,
      [String(error.message || 'No se pudo convertir la imagen.').slice(0, 500), id],
    );
  }
}

async function procesarPendientes() {
  if (ocupado) return;
  ocupado = true;
  try {
    const [pendientes] = await pool.query(
      `SELECT id FROM trabajos_conversion
       WHERE estado = 'pendiente'
       ORDER BY creado_en
       LIMIT 1`,
    );
    if (pendientes[0]) await procesarTrabajo(pendientes[0].id);
  } finally {
    ocupado = false;
  }
}

function iniciarWorker() {
  const cada = Number(process.env.WORKER_MS || 2000);
  setInterval(() => {
    procesarPendientes().catch((error) => {
      console.error(JSON.stringify({ nivel: 'error', mensaje: error.message }));
    });
  }, cada);
  setInterval(() => {
    depurarPapelera().catch((error) => {
      console.error(JSON.stringify({ nivel: 'error', mensaje: error.message }));
    });
  }, 60 * 60 * 1000);
}

module.exports = { iniciarWorker, procesarPendientes, depurarPapelera };
