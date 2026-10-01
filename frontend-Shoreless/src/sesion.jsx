import { createContext, useContext, useEffect, useState } from 'react'
import { api as solicitarApi, base as API, guardarSesion, leerSesion } from './api'

export { API }
const Contexto = createContext(null)

export function SesionProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [listo, setListo] = useState(false)
  const [enLinea, setEnLinea] = useState(navigator.onLine)

  useEffect(() => {
    const si = () => setEnLinea(true)
    const no = () => setEnLinea(false)
    window.addEventListener('online', si)
    window.addEventListener('offline', no)
    return () => {
      window.removeEventListener('online', si)
      window.removeEventListener('offline', no)
    }
  }, [])

  useEffect(() => {
    const sesion = leerSesion()
    if (!sesion?.acceso) {
      setListo(true)
      return
    }
    setUsuario(sesion.usuario || null)
    solicitarApi('/api/perfil')
      .then((perfil) => {
        setUsuario(perfil)
        const actual = leerSesion()
        if (actual) guardarSesion({ ...actual, usuario: perfil })
      })
      .catch(() => {
        guardarSesion(null)
        setUsuario(null)
      })
      .finally(() => setListo(true))
  }, [])

  function guardar(sesion) {
    guardarSesion(sesion)
    setUsuario(sesion?.usuario || null)
  }

  async function salir() {
    const sesion = leerSesion()
    try {
      await solicitarApi('/api/auth/salir', { method: 'POST', json: { refresco: sesion?.refresco || '' } })
    } catch {
      /* La sesión local se borra aunque el servidor no responda. */
    }
    guardarSesion(null)
    setUsuario(null)
    localStorage.removeItem('alzado-galeria')
  }

  async function registrar(datos) {
    const sesion = await solicitarApi('/api/auth/registro', { method: 'POST', json: datos })
    guardar(sesion)
    return sesion
  }

  async function entrar(datos) {
    const sesion = await solicitarApi('/api/auth/entrar', { method: 'POST', json: datos })
    guardar(sesion)
    return sesion
  }

  function actualizar(perfil) {
    setUsuario(perfil)
    const sesion = leerSesion()
    if (sesion) guardarSesion({ ...sesion, usuario: perfil })
  }

  return (
    <Contexto.Provider value={{
      usuario,
      listo,
      enLinea,
      api: API,
      guardar,
      salir,
      registrar,
      entrar,
      actualizar,
      solicitar: solicitarApi,
    }}
    >
      {children}
    </Contexto.Provider>
  )
}

export function useSesion() {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('useSesion debe usarse dentro de SesionProvider')
  return valor
}
