import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, blobConAuth } from '../api'
import Escena, { hayWebGL } from '../components/Escena'
import { Aviso, Columna, Encabezado, Pastilla, useTitulo } from '../components/ui'

function preferencia(clave, defecto) {
  const valor = localStorage.getItem(clave)
  if (valor == null) return defecto
  return valor === '1'
}

export default function Visor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [modelo, setModelo] = useState(null)
  const [blob, setBlob] = useState(null)
  const [error, setError] = useState('')
  const [luz, setLuz] = useState(() => preferencia('alzado-luz', true))
  const [fondo, setFondo] = useState(() => preferencia('alzado-fondo', false))
  const [malla, setMalla] = useState(() => preferencia('alzado-malla', false))
  const [capturar, setCapturar] = useState(null)
  const webgl = hayWebGL()
  useTitulo(modelo?.nombre || 'Visor')

  const registrarCaptura = useCallback((funcion) => setCapturar(() => funcion), [])

  useEffect(() => {
    let activo = true
    api(`/api/modelos/${id}`)
      .then((datos) => { if (activo) setModelo(datos) })
      .catch((fallo) => { if (activo) setError(fallo.message) })
    blobConAuth(`/api/modelos/${id}/archivo`)
      .then((datos) => { if (activo) setBlob(datos) })
      .catch((fallo) => { if (activo) setError(fallo.message) })
    return () => { activo = false }
  }, [id])

  function guardar(clave, valor, asignar) {
    localStorage.setItem(clave, valor ? '1' : '0')
    asignar(valor)
  }

  function descargarCaptura() {
    if (!capturar) return
    const enlace = document.createElement('a')
    enlace.href = capturar()
    enlace.download = `${(modelo?.nombre || 'modelo').replace(/[^\w\-]+/g, '_')}.png`
    enlace.click()
  }

  return (
    <main className="min-h-dvh bg-papel text-pizarra">
      <Columna className="lg:max-w-6xl">
        <Encabezado sobre="Modelo listo" titulo={modelo?.nombre || 'Modelo'} />
        <div className="flex min-h-[420px] flex-1 flex-col px-5 pt-2 pb-6 md:px-0">
          <Aviso>{error}</Aviso>
          <div className={`relative mt-2 min-h-[360px] flex-1 overflow-hidden rounded-[24px] md:min-h-[480px] ${fondo ? 'bg-papel' : 'bg-pizarra'}`}>
            {webgl && blob ? (
              <Escena blob={blob} luzSuave={luz} fondoClaro={fondo} malla={malla} alCaptura={registrarCaptura} />
            ) : (
              <p className="grid h-full place-items-center px-6 text-center text-sm text-[#c5d0de]">
                {webgl ? 'Cargando el modelo…' : 'Este dispositivo no puede mostrar el visor 3D. Aún puedes exportar el archivo desde el botón de abajo.'}
              </p>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-[#6e7a8c] lg:hidden">Un dedo gira · dos dedos acercan</p>
          <p className="mt-3 hidden text-center text-xs text-[#6e7a8c] lg:block">Arrastra para girar · la rueda acerca</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Pastilla activa={luz} onClick={() => guardar('alzado-luz', !luz, setLuz)}>Luz suave</Pastilla>
            <Pastilla activa={fondo} onClick={() => guardar('alzado-fondo', !fondo, setFondo)}>Fondo</Pastilla>
            <Pastilla activa={malla} onClick={() => guardar('alzado-malla', !malla, setMalla)}>Malla</Pastilla>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" onClick={descargarCaptura} disabled={!capturar} className="inline-flex h-[49px] items-center justify-center rounded-[14px] border border-pizarra/15 bg-white text-sm font-semibold disabled:opacity-50">Capturar</button>
            <button type="button" onClick={() => navigate(`/modelos/${id}/exportar`)} className="inline-flex h-[49px] items-center justify-center rounded-[14px] bg-cobalto text-sm font-semibold text-white">Exportar</button>
          </div>
        </div>
      </Columna>
    </main>
  )
}
