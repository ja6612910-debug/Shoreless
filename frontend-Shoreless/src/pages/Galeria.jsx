import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Aviso, Icono, MarcoApp, Miniatura, Pastilla, estadoVisual, fondoTarjeta, useTitulo } from '../components/ui'

const CACHE = 'alzado-galeria'

export default function Galeria() {
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState('recientes')
  const [datos, setDatos] = useState({ proyectos: [], total: 0, pagina: 1 })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  useTitulo('Tu galería')

  useEffect(() => {
    let activo = true
    const espera = setTimeout(() => {
      setCargando(true)
      const params = new URLSearchParams({ q: busqueda, orden: orden === 'nombre' ? 'nombre' : 'recientes', limite: '24' })
      api(`/api/proyectos?${params}`)
        .then((respuesta) => {
          if (!activo) return
          setDatos(respuesta)
          setError('')
          localStorage.setItem(CACHE, JSON.stringify(respuesta))
        })
        .catch((fallo) => {
          if (!activo) return
          const guardado = localStorage.getItem(CACHE)
          if (guardado && !navigator.onLine) {
            setDatos(JSON.parse(guardado))
            setError('Estás sin conexión. Mostramos la última galería guardada.')
          } else {
            setError(fallo.message)
          }
        })
        .finally(() => { if (activo) setCargando(false) })
    }, 250)
    return () => {
      activo = false
      clearTimeout(espera)
    }
  }, [busqueda, orden])

  async function abrir(proyecto) {
    const trabajo = proyecto.trabajo
    if (trabajo?.estado === 'fallido' || trabajo?.estado === 'cancelado') {
      try {
        const nuevo = await api(`/api/trabajos/${trabajo.id}/reintentar`, { method: 'POST' })
        navigate(`/trabajos/${nuevo.id}`)
      } catch (fallo) {
        setError(fallo.message)
      }
      return
    }
    if (trabajo && ['pendiente', 'procesando'].includes(trabajo.estado)) {
      navigate(`/trabajos/${trabajo.id}`)
      return
    }
    if (proyecto.modelo) navigate(`/modelos/${proyecto.modelo.id}`)
  }

  const total = datos.total ?? datos.proyectos.length
  const etiqueta = total === 1 ? '1 modelo' : `${total} modelos`

  return (
    <MarcoApp>
      <header className="flex items-center gap-2.5 pt-7 lg:pt-8">
        <img src="/logo-icono.svg" alt="" width={32} height={32} className="size-8 rounded-[10px] lg:hidden" />
        <div className="lg:hidden">
          <h1 className="text-lg font-bold leading-none">Tu galería</h1>
          <p className="mt-1 text-xs text-[#6e7a8c]">{etiqueta}</p>
        </div>
        <div className="hidden lg:block">
          <h1 className="text-3xl font-bold">Tu galería</h1>
          <p className="mt-1 text-sm text-[#6e7a8c]">{etiqueta}</p>
        </div>
      </header>

      <label className="mt-4 flex items-center gap-2 rounded-xl border border-pizarra/10 bg-white px-3 py-3">
        <Icono nombre="buscar" className="size-[18px] text-[#8b95a7]" />
        <input
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar por nombre"
          className="w-full bg-transparent text-sm outline-none placeholder:text-[#8b95a7]"
          aria-label="Buscar por nombre"
        />
      </label>

      <div className="mt-3.5 flex gap-2">
        <Pastilla activa={orden === 'recientes'} onClick={() => setOrden('recientes')}>Recientes</Pastilla>
        <Pastilla activa={orden === 'nombre'} onClick={() => setOrden('nombre')}>Nombre</Pastilla>
      </div>

      <Aviso>{error}</Aviso>

      {cargando && !datos.proyectos.length ? <p className="mt-8 text-sm text-[#6e7a8c]">Cargando tu galería…</p> : null}

      {!cargando && !datos.proyectos.length ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="grid size-28 place-items-center rounded-3xl bg-[#243044]">
            <Miniatura className="size-16" />
          </div>
          <p className="mt-4 font-semibold">Todavía no tienes modelos</p>
          <p className="mt-1 max-w-xs text-sm text-[#6e7a8c]">Sube una imagen y conviértela en un objeto que puedes girar.</p>
          <Link to="/nuevo" className="mt-5 inline-flex h-12 items-center rounded-[14px] bg-cobalto px-5 text-sm font-semibold text-white">Nueva conversión</Link>
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {datos.proyectos.map((proyecto, indice) => {
            const visual = estadoVisual(proyecto.trabajo?.estado)
            return (
              <li key={proyecto.id}>
                <button type="button" onClick={() => abrir(proyecto)} className="w-full overflow-hidden rounded-2xl bg-white text-left">
                  <span className="grid h-28 w-full place-items-center sm:h-36" style={{ background: fondoTarjeta(indice) }}>
                    <Miniatura className="size-[78px]" />
                  </span>
                  <span className="block px-2.5 pt-2.5 pb-3">
                    <span className="block truncate text-[13px] font-semibold">{proyecto.nombre}</span>
                    <span className={`mt-1 block text-[11px] font-semibold ${visual.clase}`}>{visual.texto}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </MarcoApp>
  )
}
