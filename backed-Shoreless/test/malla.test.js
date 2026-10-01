const test = require('node:test');
const assert = require('node:assert/strict');
const { mallaDesdeAlturas, construirGlb, leerMalla, aObj, aStl } = require('../src/lib/mesh');
const { tipoReal } = require('../src/lib/archivos');
const { contrasenaValida, correoValido } = require('../src/lib/sesion');

test('la contraseña exige letras y números', () => {
  assert.equal(contrasenaValida('corta1'), false);
  assert.equal(contrasenaValida('sololetras'), false);
  assert.equal(contrasenaValida('12345678'), false);
  assert.equal(contrasenaValida('Alzado123'), true);
});

test('el correo tiene forma válida', () => {
  assert.equal(correoValido('ana@correo.com'), true);
  assert.equal(correoValido('ana'), false);
});

test('reconoce jpg, png y webp por su contenido', () => {
  assert.equal(tipoReal(Buffer.from([0xff, 0xd8, 0xff, 0x00])).mime, 'image/jpeg');
  assert.equal(tipoReal(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])).mime, 'image/png');
  const webp = Buffer.alloc(12);
  webp.write('RIFF', 0);
  webp.write('WEBP', 8);
  assert.equal(tipoReal(webp).mime, 'image/webp');
  assert.equal(tipoReal(Buffer.from('hola')), null);
});

test('un relieve pequeño se exporta a GLB, OBJ y STL', () => {
  const alturas = Float32Array.from([0, 0.2, 0.4, 1]);
  const malla = mallaDesdeAlturas(alturas, 2, 2, 0.5);
  assert.equal(malla.indices.length, 6);
  const glb = construirGlb(malla.posiciones, malla.indices);
  assert.equal(glb.readUInt32LE(0), 0x46546c67);
  const leida = leerMalla(glb);
  assert.equal(leida.indices.length, 6);
  assert.equal(leida.posiciones.length, 12);
  assert.match(aObj(leida.posiciones, leida.indices).toString(), /^# Alzado/);
  const stl = aStl(leida.posiciones, leida.indices);
  assert.equal(stl.readUInt32LE(80), 2);
});
