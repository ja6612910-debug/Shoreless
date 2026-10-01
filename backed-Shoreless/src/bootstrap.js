const fs = require('fs');
const path = require('path');
const pool = require('./db');

function sentencias(archivo) {
  const ruta = path.join(__dirname, '..', 'sql', archivo);
  return fs.readFileSync(ruta, 'utf8')
    .split(/;\s*\n/)
    .map((sql) => sql.trim())
    .filter((sql) => sql && !sql.startsWith('--'));
}

async function iniciarBase() {
  const conexion = await pool.getConnection();
  try {
    for (const sql of sentencias('schema.sql')) {
      await conexion.query(sql);
    }

    const [conteo] = await conexion.query('SELECT COUNT(*) AS total FROM barrios');
    if (conteo[0].total > 0) {
      return { creado: false, mensaje: 'La base ya tiene barrios. No se volvió a cargar el ejemplo.' };
    }

    for (const sql of sentencias('seed.sql')) {
      await conexion.query(sql);
    }

    return { creado: true, mensaje: 'Barrios y horarios de ejemplo cargados.' };
  } finally {
    conexion.release();
  }
}

module.exports = { iniciarBase };
