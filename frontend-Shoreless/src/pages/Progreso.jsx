import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { resumirParametros } from '../metodos'
import { Aviso, Boton, Columna, Encabezado, Miniatura, useTitulo } from '../components/ui'

export default function Progreso() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [trabajo, setTrabajo] = useState(null)
  const [error, setError] = useState('')
  const [cancelando, setCancelando] = useState(false)
  useTitulo('Convirtiendo')

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  useEffect(() => {
    let activo = true
    let timer
    async function consultar() {
      try {
        const datos = await api(`/api/trabajos/${id}`)
        if (!activo) return
        setTrabajo(datos)
        setError('')
        if (datos.estado === 'pendiente' || datos.estado === 'procesando') {
          timer = setTimeout(consultar, 1500)
        } else if (datos.estado === 'completado' && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          const aviso = new Notification('Modelo listo', { body: 'Tu conversión en Alzado terminó.' })
          aviso.onclick = () => {
            window.focus()
            if (datos.modeloId) navigate(`/modelos/${datos.modeloId}`)
          }
        }
      } catch (fallo) {
        if (activo) {
          setError(fallo.message)
          timer = setTimeout(consultar, 3000)
        }
      }
    }
    consultar()
    return () => {
      activo = false
      clearTimeout(timer)
    }
  }, [id, navigate])

  async function cancelar() {
    setCancelando(true)
    try {
      await api(`/api/trabajos/${id}/cancelar`, { method: 'POST' })
      navigate('/galeria', { replace: true })
    } catch (fallo) {
      setError(fallo.message)
      setCancelando(false)
    }
  }

  async function reintentar() {
    try {
      const nuevo = await api(`/api/trabajos/${id}/reintentar`, { method: 'POST' })
      navigate(`/trabajos/${nuevo.id}`, { replace: true })
    } catch (fallo) {
      setError(fallo.message)
    }
  }

  const progreso = trabajo?.progreso || 0
  const detalle = trabajo ? resumirParametros(trabajo.codigo, trabajo.parametros) : ''
  const enCurso = !trabajo || trabajo.estado === 'pendiente' || trabajo.estado === 'procesando'

  return (
    <main className="min-h-dvh bg-papel text-pizarra">
      <Columna>
        <Encabezado sobre="Paso 3 de 3" titulo="Convirtiendo" />
        <div className="flex flex-1 flex-col px-5 pt-4 pb-6 md:px-0">
          <Aviso>{error}</Aviso>
          <div className="flex items-center gap-3 rounded-2xl bg-white p-3">
            <span className="grid size-[72px] shrink-0 place-items-center rounded-xl bg-[#243044]">
              <Miniatura className="size-14" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{trabajo?.nombre || 'Conversión'}</span>
              <span className="mt-0.5 block text-xs text-[#6e7a8c]">{[trabajo?.metodo, detalle].filter(Boolean).join(' · ')}</span>
              <span className={`mt-2 inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${enCurso ? 'bg-cobalto/10 text-cobalto' : trabajo?.estado === 'completado' ? 'bg-[#1f8a4c]/10 text-[#1f8a4c]' : 'bg-[#d14343]/10 text-[#d14343]'}`}>
                {enCurso ? 'Procesando' : trabajo?.estado === 'completado' ? 'Completado' : trabajo?.estado === 'cancelado' ? 'Cancelado' : 'Fallido'}
              </span>
            </span>
          </div>
          <p className="mt-6 text-5xl font-extrabold tracking-tight">{progreso}%</p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#e6ebf2]" aria-hidden="true">
            <div className="h-full rounded-full bg-cobalto transition-all" style={{ width: `${progreso}%` }} />
          </div>
          <p className="sr-only" role="status">Avance {progreso} por ciento</p>
          {trabajo?.mensajeError ? <p className="mt-4 text-sm text-[#d14343]">{trabajo.mensajeError}</p> : (
            <p className="mt-4 text-sm leading-relaxed text-[#6e7a8c]">Puedes cerrar la app. Te avisamos cuando el modelo esté listo.</p>
          )}
          <div className="mt-auto pt-8">
            {trabajo?.estado === 'completado' && trabajo.modeloId ? (
              <Boton onClick={() => navigate(`/modelos/${trabajo.modeloId}`)}>Ver modelo</Boton>
            ) : null}
            {trabajo?.estado === 'fallido' ? <Boton onClick={reintentar}>Reintentar</Boton> : null}
            {enCurso ? (
              <button type="button" onClick={cancelar} disabled={cancelando} className="inline-flex h-[52px] w-full items-center justify-center rounded-[14px] border border-pizarra/15 bg-white text-[15px] font-semibold disabled:opacity-50">
                {cancelando ? 'Cancelando…' : 'Cancelar conversión'}
              </button>
            ) : null}
          </div>
        </div>
      </Columna>
    </main>
  )
}
