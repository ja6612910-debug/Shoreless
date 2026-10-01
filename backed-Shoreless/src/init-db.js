require('dotenv').config();

const fs = require('fs');
const path = require('path');
const pool = require('./db');

function sentencias(archivo) {
  const texto = fs.readFileSync(path.join(__dirname, '..', 'sql', archivo), 'utf8')
    .split('\n')
    .filter((linea) => !linea.trim().startsWith('--'))
    .join('\n');
  return texto
    .split(';')
    .map((sql) => sql.trim())
    .filter(Boolean);
}

async function main() {
  const conexion = await pool.getConnection();
  try {
    for (const sql of sentencias('schema.sql')) {
      await conexion.query(sql);
    }
    const [metodos] = await conexion.query('SELECT COUNT(*) AS total FROM metodos_conversion');
    console.log(`Esquema de Alzado listo. Métodos de conversión: ${metodos[0].total}.`);
  } finally {
    conexion.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
