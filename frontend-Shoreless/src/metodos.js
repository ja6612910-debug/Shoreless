export const METODOS = [
  {
    codigo: 'relieve',
    nombre: 'Relieve',
    detalle: 'La luz de la foto se vuelve altura.',
    controles: [
      { id: 'profundidad', etiqueta: 'Profundidad', min: 10, max: 100, defecto: 60, texto: (v) => `${v}%`, aApi: (v) => v / 100 },
      { id: 'resolucion', etiqueta: 'Resolución', min: 0, max: 2, defecto: 1, texto: (v) => ['1K', '2K', '4K'][v], aApi: (v) => [64, 128, 192][v] },
      { id: 'suavizado', etiqueta: 'Suavizado', min: 0, max: 2, defecto: 1, texto: (v) => ['Bajo', 'Medio', 'Alto'][v], aApi: (v) => [0, 2, 4][v] },
    ],
  },
  {
    codigo: 'objeto_ia',
    nombre: 'Objeto con IA',
    detalle: 'Reconstruye un volumen cerrado.',
    controles: [
      { id: 'calidad', etiqueta: 'Calidad', min: 0, max: 2, defecto: 1, texto: (v) => ['Baja', 'Media', 'Alta'][v], aApi: (v) => ['baja', 'media', 'alta'][v] },
    ],
  },
  {
    codigo: 'extrusion',
    nombre: 'Extrusión de silueta',
    detalle: 'Da grosor uniforme al contorno.',
    controles: [
      { id: 'grosor', etiqueta: 'Grosor', min: 5, max: 80, defecto: 20, texto: (v) => `${v}%`, aApi: (v) => v / 100 },
      { id: 'umbral', etiqueta: 'Umbral', min: 20, max: 230, defecto: 128, texto: (v) => String(v), aApi: (v) => v },
    ],
  },
]

export function valoresIniciales(metodo) {
  return Object.fromEntries(metodo.controles.map((control) => [control.id, control.defecto]))
}

export function parametrosApi(metodo, valores) {
  return Object.fromEntries(metodo.controles.map((control) => [control.id, control.aApi(valores[control.id])]))
}

export function resumirParametros(codigo, parametros = {}) {
  if (codigo === 'relieve' && parametros.profundidad != null) {
    return `profundidad ${Math.round(Number(parametros.profundidad) * 100)}%`
  }
  if (codigo === 'extrusion' && parametros.grosor != null) {
    return `grosor ${Math.round(Number(parametros.grosor) * 100)}%`
  }
  if (codigo === 'objeto_ia' && parametros.calidad) return `calidad ${parametros.calidad}`
  return ''
}
