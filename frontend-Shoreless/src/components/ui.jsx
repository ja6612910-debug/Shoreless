import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

export function useTitulo(titulo) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · Alzado` : 'Alzado'
  }, [titulo])
}

export function useEnLinea() {
  const [enLinea, setEnLinea] = useState(() => navigator.onLine)
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
  return enLinea
}

export function Icono({ nombre, className = 'size-[22px]' }) {
  const comunes = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': true,
  }
  if (nombre === 'atras') {
    return <svg {...comunes}><path d="M14.5 6 9 12l5.5 6" /></svg>
  }
  if (nombre === 'buscar') {
    return <svg {...comunes}><circle cx="11" cy="11" r="6.5" /><path d="m16 16.5 4 4" /></svg>
  }
  if (nombre === 'galeria') {
    return <svg {...comunes}><path d="M4 10.5 12 4l8 6.5" /><path d="M6.5 9.5V20h11V9.5" /></svg>
  }
  if (nombre === 'mas') {
    return <svg {...comunes} strokeWidth={2.2}><path d="M12 6v12M6 12h12" /></svg>
  }
  if (nombre === 'perfil') {
    return <svg {...comunes}><circle cx="12" cy="8.5" r="3" /><path d="M5.5 19.5c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5" /></svg>
  }
  return null
}

export function Marca({ clara = false, tamano = 36 }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/logo-icono.svg" alt="" width={tamano} height={tamano} className="shrink-0 rounded-[10px]" style={{ width: tamano, height: tamano }} />
      <span className={`text-lg font-bold ${clara ? 'text-papel' : 'text-pizarra'}`}>Alzado</span>
    </div>
  )
}

export function Miniatura({ className = 'size-[78px]' }) {
  return <img src="/modelo.svg" alt="" width={168} height={168} className={className} />
}

export function Boton({ children, variante = 'primario', className = '', ...props }) {
  const estilos = {
    primario: 'bg-cobalto text-white',
    secundario: 'border border-pizarra/15 bg-white text-pizarra',
    fantasma: 'border-[1.5px] border-white/30 text-papel',
    peligro: 'text-[#d14343]',
  }
  return (
    <button
      type="button"
      className={`inline-flex h-[49px] w-full items-center justify-center rounded-[14px] px-4 text-[15px] font-semibold transition active:scale-[0.99] disabled:opacity-50 ${estilos[variante]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Campo({ id, etiqueta, error, ayuda, ...props }) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1.5 block text-sm font-medium">{etiqueta}</span>
      <input
        id={id}
        className={`h-12 w-full rounded-xl border bg-white px-4 text-base outline-none placeholder:text-[#8b95a7] focus:border-cobalto ${error ? 'border-[#d14343]' : 'border-pizarra/10'}`}
        {...props}
      />
      {error ? <span className="mt-1.5 block text-xs text-[#d14343]">{error}</span> : null}
      {ayuda && !error ? <span className="mt-1.5 block text-xs leading-5 text-[#6e7a8c]">{ayuda}</span> : null}
    </label>
  )
}

export function Aviso({ children }) {
  if (!children) return null
  return <p className="rounded-xl bg-[#d14343]/10 px-3 py-2 text-sm text-[#d14343]" role="alert">{children}</p>
}

export function Pista({ valor, min, max, onChange, etiqueta, texto }) {
  const avance = ((Number(valor) - min) / (max - min)) * 100
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between text-sm">
        <span>{etiqueta}</span>
        <span className="font-semibold">{texto}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={valor}
        onChange={(evento) => onChange(Number(evento.target.value))}
        className="pista"
        style={{ '--avance': `${avance}%` }}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={valor}
        aria-valuetext={String(texto)}
      />
    </label>
  )
}

export function Pastilla({ activa, children, ...props }) {
  return (
    <button
      type="button"
      className={`rounded-full px-3 py-2 text-xs font-semibold ${activa ? 'bg-cobalto text-white' : 'border border-pizarra/10 bg-white text-pizarra'}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Encabezado({ sobre, titulo }) {
  const navigate = useNavigate()
  return (
    <header className="flex items-center gap-3 px-5 pt-6 pb-2 md:px-0">
      <button type="button" onClick={() => navigate(-1)} aria-label="Volver" className="grid size-10 shrink-0 place-items-center rounded-full border border-pizarra/10 bg-white">
        <Icono nombre="atras" className="size-[18px]" />
      </button>
      <div className="min-w-0">
        <p className="text-[13px] text-[#6e7a8c]">{sobre}</p>
        <h1 className="truncate text-[22px] font-bold leading-tight md:text-[26px]">{titulo}</h1>
      </div>
    </header>
  )
}

export function Columna({ children, className = '' }) {
  return (
    <div className={`mx-auto flex min-h-dvh w-full max-w-lg flex-col md:max-w-xl md:px-6 lg:max-w-2xl lg:py-6 ${className}`}>
      {children}
    </div>
  )
}

function enlaces(claseInactiva, claseActiva) {
  return ({ isActive }) => (isActive ? claseActiva : claseInactiva)
}

export function MarcoApp({ children }) {
  const enLinea = useEnLinea()
  const [instalar, setInstalar] = useState(null)

  useEffect(() => {
    const guardar = (evento) => {
      evento.preventDefault()
      setInstalar(evento)
    }
    window.addEventListener('beforeinstallprompt', guardar)
    return () => window.removeEventListener('beforeinstallprompt', guardar)
  }, [])

  return (
    <div className="min-h-dvh bg-papel text-pizarra">
      {enLinea ? null : (
        <p className="bg-pizarra px-4 py-2 text-center text-xs text-papel">Sin conexión. Puedes ver tu galería y los modelos que ya abriste.</p>
      )}
      <header className="sticky top-0 z-20 hidden border-b border-pizarra/10 bg-papel/95 backdrop-blur lg:block">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-8 px-8">
          <NavLink to="/galeria" aria-label="Alzado"><Marca tamano={32} /></NavLink>
          <nav className="ml-auto flex items-center gap-2">
            <NavLink to="/galeria" className={enlaces('rounded-full px-4 py-2 text-sm font-semibold text-[#6e7a8c]', 'rounded-full bg-cobalto px-4 py-2 text-sm font-semibold text-white')}>Galería</NavLink>
            <NavLink to="/nuevo" className="grid size-11 place-items-center rounded-full bg-cobalto text-white" aria-label="Nueva conversión"><Icono nombre="mas" /></NavLink>
            <NavLink to="/perfil" className={enlaces('rounded-full px-4 py-2 text-sm font-semibold text-[#6e7a8c]', 'rounded-full bg-cobalto px-4 py-2 text-sm font-semibold text-white')}>Perfil</NavLink>
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-lg px-5 pb-28 md:max-w-3xl md:px-8 lg:max-w-6xl lg:pb-12">
        {instalar ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
            <p className="text-sm">Instala Alzado para abrirla como una app.</p>
            <button
              type="button"
              className="shrink-0 text-sm font-semibold text-cobalto"
              onClick={async () => {
                instalar.prompt()
                setInstalar(null)
              }}
            >
              Instalar
            </button>
          </div>
        ) : null}
        {children}
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-pizarra/5 bg-white pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5 lg:hidden" aria-label="Principal">
        <div className="mx-auto flex max-w-lg items-center px-3">
          <NavLink to="/galeria" className="flex flex-1 flex-col items-center gap-1 text-[11px] font-semibold text-[#8b95a7] aria-[current=page]:text-cobalto">
            <Icono nombre="galeria" />
            Galería
          </NavLink>
          <NavLink to="/nuevo" aria-label="Nueva conversión" className="grid size-[52px] place-items-center rounded-full bg-cobalto text-white">
            <Icono nombre="mas" />
          </NavLink>
          <NavLink to="/perfil" className="flex flex-1 flex-col items-center gap-1 text-[11px] font-semibold text-[#8b95a7] aria-[current=page]:text-cobalto">
            <Icono nombre="perfil" />
            Perfil
          </NavLink>
        </div>
      </nav>
    </div>
  )
}

export function estadoVisual(estado) {
  if (estado === 'completado') return { texto: 'Completado', clase: 'text-[#1f8a4c]' }
  if (estado === 'procesando' || estado === 'pendiente') return { texto: 'Procesando', clase: 'text-cobalto' }
  if (estado === 'fallido') return { texto: 'Fallido · Reintentar', clase: 'text-[#d14343]' }
  if (estado === 'cancelado') return { texto: 'Cancelado', clase: 'text-[#8b95a7]' }
  return { texto: 'Sin convertir', clase: 'text-[#8b95a7]' }
}

const FONDOS = ['#243044', '#1a2333', '#2a2433', '#1c2836']
export function fondoTarjeta(indice) {
  return FONDOS[indice % FONDOS.length]
}
