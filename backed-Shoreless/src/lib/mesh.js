function alinear(buffer, relleno) {
  const falta = (4 - (buffer.length % 4)) % 4;
  if (!falta) return buffer;
  return Buffer.concat([buffer, Buffer.alloc(falta, relleno)]);
}

function mallaDesdeAlturas(alturas, ancho, alto, profundidad) {
  const posiciones = [];
  const indices = [];

  for (let y = 0; y < alto; y += 1) {
    for (let x = 0; x < ancho; x += 1) {
      const altura = alturas[y * ancho + x] * profundidad;
      posiciones.push(
        (x / Math.max(1, ancho - 1) - 0.5) * 2,
        altura,
        (y / Math.max(1, alto - 1) - 0.5) * 2,
      );
    }
  }

  for (let y = 0; y < alto - 1; y += 1) {
    for (let x = 0; x < ancho - 1; x += 1) {
      const a = y * ancho + x;
      const b = a + 1;
      const c = a + ancho;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  return { posiciones, indices };
}

function suavizar(valores, ancho, alto, radio) {
  const pasos = Math.max(0, Math.round(radio));
  if (!pasos) return valores;
  const salida = new Float32Array(valores.length);
  for (let y = 0; y < alto; y += 1) {
    for (let x = 0; x < ancho; x += 1) {
      let suma = 0;
      let cuenta = 0;
      for (let dy = -pasos; dy <= pasos; dy += 1) {
        const yy = Math.min(alto - 1, Math.max(0, y + dy));
        for (let dx = -pasos; dx <= pasos; dx += 1) {
          const xx = Math.min(ancho - 1, Math.max(0, x + dx));
          suma += valores[yy * ancho + xx];
          cuenta += 1;
        }
      }
      salida[y * ancho + x] = suma / cuenta;
    }
  }
  return salida;
}

function construirGlb(posiciones, indices) {
  const pos = Float32Array.from(posiciones);
  const ind = Uint32Array.from(indices);
  const posBuf = Buffer.from(pos.buffer, pos.byteOffset, pos.byteLength);
  const indBuf = Buffer.from(ind.buffer, ind.byteOffset, ind.byteLength);
  const bin = alinear(Buffer.concat([indBuf, posBuf]), 0);

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) {
    for (let eje = 0; eje < 3; eje += 1) {
      min[eje] = Math.min(min[eje], pos[i + eje]);
      max[eje] = Math.max(max[eje], pos[i + eje]);
    }
  }

  const json = {
    asset: { version: '2.0', generator: 'alzado' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 1 },
        indices: 0,
        mode: 4,
      }],
    }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5125,
        count: ind.length,
        type: 'SCALAR',
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: pos.length / 3,
        type: 'VEC3',
        min,
        max,
      },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: indBuf.length, target: 34963 },
      { buffer: 0, byteOffset: indBuf.length, byteLength: posBuf.length, target: 34962 },
    ],
    buffers: [{ byteLength: bin.length }],
  };

  const jsonBuf = alinear(Buffer.from(JSON.stringify(json)), 0x20);
  const total = 12 + 8 + jsonBuf.length + 8 + bin.length;
  const cabecera = Buffer.alloc(12);
  cabecera.writeUInt32LE(0x46546c67, 0);
  cabecera.writeUInt32LE(2, 4);
  cabecera.writeUInt32LE(total, 8);

  const chunkJson = Buffer.alloc(8);
  chunkJson.writeUInt32LE(jsonBuf.length, 0);
  chunkJson.writeUInt32LE(0x4e4f534a, 4);

  const chunkBin = Buffer.alloc(8);
  chunkBin.writeUInt32LE(bin.length, 0);
  chunkBin.writeUInt32LE(0x004e4942, 4);

  return Buffer.concat([cabecera, chunkJson, jsonBuf, chunkBin, bin]);
}

function leerMalla(glb) {
  const jsonLen = glb.readUInt32LE(12);
  const json = JSON.parse(glb.subarray(20, 20 + jsonLen).toString('utf8'));
  const bin = glb.subarray(20 + jsonLen + 8);
  const vistaI = json.bufferViews[0];
  const vistaP = json.bufferViews[1];
  const accI = json.accessors[0];
  const accP = json.accessors[1];
  const indices = [];
  for (let i = 0; i < accI.count; i += 1) {
    indices.push(bin.readUInt32LE(vistaI.byteOffset + i * 4));
  }
  const posiciones = [];
  for (let i = 0; i < accP.count * 3; i += 1) {
    posiciones.push(bin.readFloatLE(vistaP.byteOffset + i * 4));
  }
  return { posiciones, indices };
}

function aObj(posiciones, indices) {
  const lineas = ['# Alzado'];
  for (let i = 0; i < posiciones.length; i += 3) {
    lineas.push(`v ${posiciones[i]} ${posiciones[i + 1]} ${posiciones[i + 2]}`);
  }
  for (let i = 0; i < indices.length; i += 3) {
    lineas.push(`f ${indices[i] + 1} ${indices[i + 1] + 1} ${indices[i + 2] + 1}`);
  }
  return Buffer.from(`${lineas.join('\n')}\n`);
}

function aStl(posiciones, indices) {
  const triangulos = indices.length / 3;
  const buffer = Buffer.alloc(84 + triangulos * 50);
  buffer.write('Alzado', 0);
  buffer.writeUInt32LE(triangulos, 80);
  let offset = 84;
  for (let i = 0; i < indices.length; i += 3) {
    const puntos = [0, 1, 2].map((n) => {
      const base = indices[i + n] * 3;
      return [posiciones[base], posiciones[base + 1], posiciones[base + 2]];
    });
    const [a, b, c] = puntos;
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    buffer.writeFloatLE(uy * vz - uz * vy, offset);
    buffer.writeFloatLE(uz * vx - ux * vz, offset + 4);
    buffer.writeFloatLE(ux * vy - uy * vx, offset + 8);
    puntos.forEach((punto, n) => {
      buffer.writeFloatLE(punto[0], offset + 12 + n * 12);
      buffer.writeFloatLE(punto[1], offset + 16 + n * 12);
      buffer.writeFloatLE(punto[2], offset + 20 + n * 12);
    });
    offset += 50;
  }
  return buffer;
}

module.exports = {
  mallaDesdeAlturas,
  suavizar,
  construirGlb,
  leerMalla,
  aObj,
  aStl,
};
