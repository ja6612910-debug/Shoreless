export const base = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://shoreless.vercel.app')
const CLAVE = 'alzado-sesion'

export function leerSesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) || 'null')
  } catch {
    return null
  }
}

export function guardarSesion(sesion) {
  if (!sesion) localStorage.removeItem(CLAVE)
  else localStorage.setItem(CLAVE, JSON.stringify(sesion))
}

let renovacion = null

async function renovar() {
  if (!renovacion) {
    renovacion = (async () => {
      const sesion = leerSesion()
      if (!sesion?.refresco) return null
      const respuesta = await fetch(`${base}/api/auth/refrescar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresco: sesion.refresco }),
      })
      if (!respuesta.ok) {
        guardarSesion(null)
        return null
      }
      const datos = await respuesta.json()
      guardarSesion(datos)
      return datos
    })().finally(() => {
      renovacion = null
    })
  }
  return renovacion
}

function errorDe(datos, estado) {
  const error = new Error(datos.error || 'No pudimos completar la acción. Intenta de nuevo.')
  error.campos = datos.campos || {}
  error.estado = estado
  return error
}

export async function api(ruta, opciones = {}, reintento = true) {
  const sesion = leerSesion()
  const headers = new Headers(opciones.headers || {})
  if (sesion?.acceso) headers.set('Authorization', `Bearer ${sesion.acceso}`)
  let cuerpo = opciones.body
  if (opciones.json) {
    headers.set('Content-Type', 'application/json')
    cuerpo = JSON.stringify(opciones.json)
  }

  let respuesta
  try {
    respuesta = await fetch(`${base}${ruta}`, {
      method: opciones.method || 'GET',
      headers,
      body: cuerpo,
      signal: opciones.signal || AbortSignal.timeout(20000),
    })
  } catch {
    throw new Error('Sin conexión. Revisa tu red e intenta de nuevo.')
  }

  if (respuesta.status === 401 && reintento && sesion?.refresco && !ruta.startsWith('/api/auth/')) {
    const nueva = await renovar()
    if (nueva?.acceso) return api(ruta, opciones, false)
    guardarSesion(null)
  }

  const tipo = respuesta.headers.get('content-type') || ''
  if (!tipo.includes('application/json')) {
    if (!respuesta.ok) throw new Error('No pudimos completar la acción.')
    return respuesta
  }

  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw errorDe(datos, respuesta.status)
  return datos
}

export function subirImagen(proyectoId, archivo, alProgreso) {
  const enviar = (acceso) => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${base}/api/proyectos/${proyectoId}/imagenes`)
    if (acceso) xhr.setRequestHeader('Authorization', `Bearer ${acceso}`)
    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable) alProgreso?.(Math.round((evento.loaded / evento.total) * 100))
    }
    xhr.onload = () => {
      let datos = {}
      try { datos = JSON.parse(xhr.responseText || '{}') } catch { datos = {} }
      if (xhr.status >= 200 && xhr.status < 300) resolve(datos)
      else reject(errorDe(datos, xhr.status))
    }
    xhr.onerror = () => reject(new Error('No pudimos subir la imagen. Revisa tu conexión.'))
    const cuerpo = new FormData()
    cuerpo.append('archivo', archivo)
    xhr.send(cuerpo)
  })

  return enviar(leerSesion()?.acceso).catch(async (error) => {
    if (error.estado !== 401) throw error
    const nueva = await renovar()
    if (!nueva?.acceso) throw error
    return enviar(nueva.acceso)
  })
}

export async function blobConAuth(ruta) {
  const cache = await caches.open('alzado-modelos').catch(() => null)
  const clave = new Request(`${base}${ruta}`)
  if (cache && !navigator.onLine) {
    const guardado = await cache.match(clave)
    if (guardado) return guardado.blob()
  }
  const respuesta = await api(ruta)
  const blob = await respuesta.blob()
  if (cache) await cache.put(clave, new Response(blob.slice(), { headers: { 'Content-Type': 'model/gltf-binary' } }))
  return blob
}

export async function descargarArchivo(ruta, cuerpo, nombre) {
  const respuesta = await api(ruta, { method: 'POST', json: cuerpo })
  const blob = await respuesta.blob()
  const enlace = document.createElement('a')
  enlace.href = URL.createObjectURL(blob)
  enlace.download = nombre
  enlace.click()
  URL.revokeObjectURL(enlace.href)
}
