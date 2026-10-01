import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Aviso, Boton, Campo, MarcoApp, useTitulo } from '../components/ui'
import { useSesion } from '../sesion'

export default function Perfil() {
  const { usuario, actualizar, salir } = useSesion()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState(usuario?.nombre || '')
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [campos, setCampos] = useState({})
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [borrar, setBorrar] = useState(false)
  const [confirmacion, setConfirmacion] = useState('')
  useTitulo('Tu perfil')

  async function guardar() {
    setEnviando(true)
    setError('')
    setAviso('')
    setCampos({})
    try {
      if (nombre.trim() && nombre.trim() !== usuario?.nombre) {
        const perfil = await api('/api/perfil', { method: 'PATCH', json: { nombre: nombre.trim() } })
        actualizar(perfil)
      }
      if (nueva || actual) {
        await api('/api/perfil/contrasena', { method: 'POST', json: { actual, nueva } })
        setActual('')
        setNueva('')
        setAviso('Contraseña actualizada. Tus otras sesiones se cerraron.')
      } else {
        setAviso('Cambios guardados.')
      }
    } catch (fallo) {
      setError(fallo.message)
      setCampos(fallo.campos || {})
    } finally {
      setEnviando(false)
    }
  }

  async function cerrar() {
    await salir()
    navigate('/entrar', { replace: true })
  }

  async function eliminar() {
    setError('')
    try {
      await api('/api/perfil', { method: 'DELETE', json: { confirmacion } })
      await salir()
      navigate('/', { replace: true })
    } catch (fallo) {
      setError(fallo.message)
    }
  }

  return (
    <MarcoApp>
      <div className="mx-auto w-full max-w-lg pt-7 lg:pt-10">
        <div className="flex items-center gap-4">
          <img src="/logo-icono.svg" alt="" width={64} height={64} className="size-16 rounded-2xl" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Tu perfil</h1>
            <p className="truncate text-sm text-[#6e7a8c]">{usuario?.email}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-4">
          <Aviso>{error}</Aviso>
          {aviso ? <p className="rounded-xl bg-[#1f8a4c]/10 px-3 py-2 text-sm text-[#1f8a4c]">{aviso}</p> : null}
          <Campo id="nombre" etiqueta="Nombre" value={nombre} onChange={(evento) => setNombre(evento.target.value)} error={campos.nombre} />
          <Campo id="correo" etiqueta="Correo" value={usuario?.email || ''} readOnly />
          <Campo id="actual" type="password" etiqueta="Contraseña actual" placeholder="••••••••" autoComplete="current-password" value={actual} onChange={(evento) => setActual(evento.target.value)} error={campos.actual} />
          <Campo id="nueva" type="password" etiqueta="Nueva contraseña" placeholder="Mínimo 8 caracteres" autoComplete="new-password" value={nueva} onChange={(evento) => setNueva(evento.target.value)} error={campos.nueva} />
          <Boton onClick={guardar} disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar cambios'}</Boton>
          <button type="button" onClick={cerrar} className="inline-flex h-[52px] w-full items-center justify-center rounded-[14px] border border-pizarra/15 bg-white text-[15px] font-semibold">
            Cerrar sesión
          </button>
          {borrar ? (
            <div className="rounded-2xl bg-white p-4">
              <p className="text-sm text-[#6e7a8c]">Se borran tu cuenta, tus proyectos y tus modelos. Escribe ELIMINAR para confirmar.</p>
              <input value={confirmacion} onChange={(evento) => setConfirmacion(evento.target.value)} className="mt-3 h-12 w-full rounded-xl border border-pizarra/10 px-4" aria-label="Confirmación" />
              <div className="mt-3">
                <Boton onClick={eliminar}>Eliminar cuenta</Boton>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setBorrar(true)} className="self-start text-sm font-semibold text-[#d14343]">Eliminar cuenta</button>
          )}
        </div>
      </div>
    </MarcoApp>
  )
}
