import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { guardarArchivo } from '../borrador'
import { Aviso, Boton, Columna, Encabezado, Miniatura, useEnLinea, useTitulo } from '../components/ui'

function validar(archivo) {
  if (!archivo) return 'Elige una imagen JPG, PNG o WebP.'
  const nombre = archivo.name.toLowerCase()
  const tipoOk = ['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type) || /\.(jpe?g|png|webp)$/.test(nombre)
  if (!tipoOk) return 'El archivo no es JPG, PNG o WebP. Elige otro.'
  if (archivo.size > 10 * 1024 * 1024) return 'La imagen supera 10 MB. Elige un archivo más liviano.'
  return ''
}

function peso(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function extension(nombre) {
  const parte = nombre.split('.').pop()
  return parte ? parte.toUpperCase() : 'IMG'
}

export default function Subir() {
  const navigate = useNavigate()
  const enLinea = useEnLinea()
  const archivoRef = useRef(null)
  const camaraRef = useRef(null)
  const [archivo, setArchivo] = useState(null)
  const [vista, setVista] = useState('')
  const [error, setError] = useState('')
  const [arrastrando, setArrastrando] = useState(false)
  useTitulo('Nueva conversión')

  useEffect(() => () => { if (vista) URL.revokeObjectURL(vista) }, [vista])

  function elegir(siguiente) {
    const mensaje = validar(siguiente)
    setError(mensaje)
    if (mensaje) return
    if (vista) URL.revokeObjectURL(vista)
    setArchivo(siguiente)
    setVista(URL.createObjectURL(siguiente))
  }

  function continuar() {
    if (!enLinea) {
      setError('Sin conexión. La subida vuelve a estar disponible cuando haya internet.')
      return
    }
    const mensaje = validar(archivo)
    if (mensaje) {
      setError(mensaje)
      return
    }
    guardarArchivo(archivo)
    navigate('/nuevo/metodo')
  }

  return (
    <main className="min-h-dvh bg-papel text-pizarra">
      <Columna>
        <Encabezado sobre="Paso 1 de 3" titulo="Nueva conversión" />
        <div className="flex flex-1 flex-col px-5 pt-4 pb-6 md:px-0">
          <Aviso>{error}</Aviso>
          <button
            type="button"
            onClick={() => archivoRef.current?.click()}
            onDragOver={(evento) => { evento.preventDefault(); setArrastrando(true) }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(evento) => {
              evento.preventDefault()
              setArrastrando(false)
              elegir(evento.dataTransfer.files?.[0])
            }}
            className={`mt-4 flex min-h-56 flex-col items-center justify-center rounded-[20px] border bg-white px-4 py-6 text-center ${arrastrando ? 'border-cobalto' : 'border-pizarra/10'}`}
          >
            {vista ? (
              <img src={vista} alt="" className="size-24 rounded-2xl object-cover" />
            ) : (
              <span className="grid size-24 place-items-center rounded-2xl bg-[#243044]">
                <Miniatura className="size-16" />
              </span>
            )}
            <span className="mt-3 text-sm font-semibold">{archivo ? archivo.name : 'Elige una imagen'}</span>
            <span className="mt-1 text-xs text-[#6e7a8c]">{archivo ? `${peso(archivo.size)} · ${extension(archivo.name)}` : 'JPG, PNG o WebP'}</span>
            <span className="mt-2 text-xs text-[#8b95a7]">{archivo ? 'Toca para cambiar el archivo' : 'O arrastra el archivo aquí'}</span>
          </button>
          <p className="mt-3 text-sm leading-relaxed text-[#6e7a8c]">JPG, PNG o WebP, hasta 10 MB. También puedes arrastrar el archivo.</p>
          <button type="button" onClick={() => camaraRef.current?.click()} className="mt-4 inline-flex h-[52px] w-full items-center justify-center rounded-[14px] border border-pizarra/15 bg-white text-[15px] font-semibold">
            Usar cámara
          </button>
          <input ref={archivoRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(evento) => elegir(evento.target.files?.[0])} />
          <input ref={camaraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(evento) => elegir(evento.target.files?.[0])} />
          <div className="mt-auto pt-8">
            <Boton onClick={continuar} disabled={!archivo || !enLinea}>Continuar</Boton>
          </div>
        </div>
      </Columna>
    </main>
  )
}
