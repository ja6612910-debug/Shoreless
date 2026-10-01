let archivo = null

export function guardarArchivo(siguiente) {
  archivo = siguiente
}

export function leerArchivo() {
  return archivo
}
