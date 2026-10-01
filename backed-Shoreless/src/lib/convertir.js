const sharp = require('sharp');
const { mallaDesdeAlturas, suavizar, construirGlb } = require('./mesh');

function numero(valor, defecto, minimo, maximo) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return defecto;
  return Math.min(maximo, Math.max(minimo, n));
}

async function luminancia(buffer, lado) {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize(lado, lado, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const valores = new Float32Array(info.width * info.height);
  for (let i = 0; i < valores.length; i += 1) {
    const base = i * info.channels;
    valores[i] = (data[base] * 0.2126 + data[base + 1] * 0.7152 + data[base + 2] * 0.0722) / 255;
  }
  return { valores, ancho: info.width, alto: info.height };
}

async function convertirImagen(buffer, codigo, parametros = {}) {
  if (codigo === 'objeto_ia') {
    const error = new Error('El método de objeto con IA necesita un servicio externo y todavía no está configurado. Usa relieve o extrusión.');
    error.estado = 422;
    throw error;
  }

  if (codigo === 'relieve') {
    const lado = Math.round(numero(parametros.resolucion, 128, 32, 192));
    const profundidad = numero(parametros.profundidad, 0.5, 0.05, 2);
    const radio = numero(parametros.suavizado, 2, 0, 4);
    const { valores, ancho, alto } = await luminancia(buffer, lado);
    const suaves = suavizar(valores, ancho, alto, radio);
    const malla = mallaDesdeAlturas(suaves, ancho, alto, profundidad);
    return {
      glb: construirGlb(malla.posiciones, malla.indices),
      vertices: malla.posiciones.length / 3,
      caras: malla.indices.length / 3,
    };
  }

  if (codigo === 'extrusion') {
    const lado = 96;
    const grosor = numero(parametros.grosor, 0.2, 0.02, 2);
    const umbral = numero(parametros.umbral, 128, 1, 254) / 255;
    const { valores, ancho, alto } = await luminancia(buffer, lado);
    const mascara = Float32Array.from(valores, (valor) => (valor < umbral ? 1 : 0));
    const malla = mallaDesdeAlturas(mascara, ancho, alto, grosor);
    return {
      glb: construirGlb(malla.posiciones, malla.indices),
      vertices: malla.posiciones.length / 3,
      caras: malla.indices.length / 3,
    };
  }

  const error = new Error('Ese método de conversión no existe.');
  error.estado = 400;
  throw error;
}

module.exports = { convertirImagen };
