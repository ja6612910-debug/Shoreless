const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const RAIZ = path.resolve(process.env.STORAGE_DIR || path.join(__dirname, '..', '..', 'storage'));

function usarMysql() {
  return process.env.STORAGE_BACKEND === 'mysql' || process.env.VERCEL === '1';
}

function pool() {
  return require('../db');
}

function tipoReal(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', extension: 'jpg' };
  }
  if (
    buffer.length >= 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
  ) {
    return { mime: 'image/png', extension: 'png' };
  }
  if (
    buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mime: 'image/webp', extension: 'webp' };
  }
  return null;
}

function rutaSegura(clave) {
  const limpia = String(clave || '').replace(/\\/g, '/');
  if (!limpia || limpia.includes('..')) {
    throw new Error('Clave de archivo no válida.');
  }
  const absoluta = path.resolve(RAIZ, limpia);
  if (absoluta !== RAIZ && !absoluta.startsWith(`${RAIZ}${path.sep}`)) {
    throw new Error('Clave de archivo no válida.');
  }
  return absoluta;
}

async function guardar(clave, buffer) {
  if (usarMysql()) {
    await pool().query(
      `INSERT INTO archivos (clave, contenido) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE contenido = VALUES(contenido)`,
      [clave, buffer],
    );
    return clave;
  }
  const destino = rutaSegura(clave);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, buffer);
  return clave;
}

async function leer(clave) {
  if (usarMysql()) {
    const [filas] = await pool().query('SELECT contenido FROM archivos WHERE clave = ? LIMIT 1', [clave]);
    if (!filas[0]) {
      const error = new Error('No encontramos el archivo.');
      error.estado = 404;
      throw error;
    }
    return filas[0].contenido;
  }
  return fs.readFile(rutaSegura(clave));
}

async function borrar(clave) {
  if (!clave) return;
  if (usarMysql()) {
    await pool().query('DELETE FROM archivos WHERE clave = ?', [clave]);
    return;
  }
  await fs.rm(rutaSegura(clave), { force: true });
}

function claveNueva(carpeta, extension) {
  return `${carpeta}/${crypto.randomUUID()}.${extension}`;
}

module.exports = {
  RAIZ,
  tipoReal,
  guardar,
  leer,
  borrar,
  claveNueva,
  rutaSegura,
};
