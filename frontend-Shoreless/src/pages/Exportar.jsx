import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, descargarArchivo } from '../api'
import { Aviso, Boton, Columna, Encabezado, useTitulo } from '../components/ui'

const FORMATOS = [
  { id: 'glb', titulo: 'GLB', detalle: 'Visor y web' },
  { id: 'obj', titulo: 'OBJ', detalle: 'Edición' },
  { id: 'stl', titulo: 'STL', detalle: 'Impresión' },
]

export default function Exportar() {
  const { id } = useParams()
  const [modelo, setModelo] = useState(null)
  const [formato, setFormato] = useState('glb')
  const [enlace, setEnlace] = useState(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [descargando, setDescargando] = useState(false)
  useTitulo('Exportar modelo')

  useEffect(() => {
    let activo = true
    api(`/api/modelos/${id}`)
      .then((datos) => { if (activo) setModelo(datos) })
      .catch((fallo) => { if (activo) setError(fallo.message) })
    api(`/api/modelos/${id}/enlaces`)
      .then(async (lista) => {
        if (!activo) return
        const vigente = lista.find((item) => !item.revocadoEn && (!item.expiraEn || new Date(item.expiraEn) > new Date()))
        if (vigente) setEnlace(vigente)
        else setEnlace(await api(`/api/modelos/${id}/enlaces`, { method: 'POST', json: { dias: 7 } }))
      })
      .catch((fallo) => { if (activo) setError(fallo.message) })
    return () => { activo = false }
  }, [id])

  async function descargar() {
    setDescargando(true)
    setError('')
    try {
      const base = (modelo?.nombre || 'modelo').replace(/[^\w\-]+/g, '_').slice(0, 40) || 'modelo'
      await descargarArchivo(`/api/modelos/${id}/exportar`, { formato }, `${base}.${formato}`)
    } catch (fallo) {
      setError(fallo.message)
    } finally {
      setDescargando(false)
    }
  }

  async function copiar() {
    if (!enlace?.token) return
    const url = `${window.location.origin}/v/${enlace.token}`
    try {
      await navigator.clipboard.writeText(url)
      setAviso('Enlace copiado.')
    } catch {
      setAviso(url)
    }
  }

  async function revocar() {
    if (!enlace?.id) return
    try {
      await api(`/api/enlaces/${enlace.id}`, { method: 'DELETE' })
      setEnlace(null)
      setAviso('El enlace dejó de funcionar.')
    } catch (fallo) {
      setError(fallo.message)
    }
  }

  const urlCorta = enlace?.token ? `${window.location.host}/v/${enlace.token.slice(0, 8)}` : 'Generando enlace…'

  return (
    <main className="min-h-dvh bg-papel text-pizarra">
      <Columna>
        <Encabezado sobre="Compartir" titulo="Exportar modelo" />
        <div className="flex flex-1 flex-col px-5 pt-4 pb-8 md:px-0">
          <p className="text-sm leading-relaxed text-[#6e7a8c]">Elige un formato. El archivo queda en tu historial de exportaciones.</p>
          <Aviso>{error}</Aviso>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {FORMATOS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFormato(item.id)}
                className={`rounded-2xl border bg-white px-3 py-3.5 text-left ${formato === item.id ? 'border-cobalto' : 'border-pizarra/10'}`}
                aria-pressed={formato === item.id}
              >
                <span className="block text-base font-bold">{item.titulo}</span>
                <span className="mt-1 block text-xs text-[#6e7a8c]">{item.detalle}</span>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <Boton onClick={descargar} disabled={descargando}>{descargando ? 'Preparando archivo…' : `Descargar ${formato.toUpperCase()}`}</Boton>
          </div>
          <p className="mt-6 text-sm font-medium">Enlace de solo lectura</p>
          <div className="mt-2 flex items-center gap-3 rounded-xl border border-pizarra/10 bg-white px-3 py-3">
            <span className="min-w-0 flex-1 truncate text-sm text-[#6e7a8c]">{urlCorta}</span>
            <button type="button" onClick={copiar} className="shrink-0 text-sm font-semibold text-cobalto">Copiar</button>
          </div>
          <p className="mt-2 text-xs text-[#6e7a8c]">Vence en 7 días. No muestra tus otros proyectos.</p>
          {enlace ? <button type="button" onClick={revocar} className="mt-3 self-start text-sm font-semibold text-[#d14343]">Revocar enlace</button> : null}
          {aviso ? <p className="mt-3 text-sm text-[#1f8a4c]">{aviso}</p> : null}
          {enlace?.visitas ? <p className="mt-2 text-xs text-[#6e7a8c]">{enlace.visitas} {enlace.visitas === 1 ? 'visita' : 'visitas'}</p> : null}
        </div>
      </Columna>
    </main>
  )
}
