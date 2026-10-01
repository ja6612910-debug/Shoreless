import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { blobConAuth, api } from '../api'
import Escena, { hayWebGL } from '../components/Escena'
import { Aviso, Marca, useTitulo } from '../components/ui'

export default function Publico() {
  const { token } = useParams()
  const [modelo, setModelo] = useState(null)
  const [blob, setBlob] = useState(null)
  const [error, setError] = useState('')
  useTitulo(modelo?.nombre || 'Modelo compartido')

  useEffect(() => {
    let activo = true
    api(`/api/publico/${token}`)
      .then((datos) => { if (activo) setModelo(datos) })
      .catch((fallo) => { if (activo) setError(fallo.message) })
    blobConAuth(`/api/publico/${token}/archivo`)
      .then((datos) => { if (activo) setBlob(datos) })
      .catch((fallo) => { if (activo) setError(fallo.message) })
    return () => { activo = false }
  }, [token])

  return (
    <main className="min-h-dvh bg-papel text-pizarra">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-6 md:px-8">
        <Marca tamano={32} />
        <p className="mt-6 text-xs text-[#6e7a8c]">Solo lectura</p>
        <h1 className="text-2xl font-bold md:text-4xl">{modelo?.nombre || 'Modelo compartido'}</h1>
        <Aviso>{error}</Aviso>
        <div className="mt-4 min-h-[420px] flex-1 overflow-hidden rounded-[24px] bg-pizarra md:min-h-[560px]">
          {hayWebGL() && blob ? <Escena blob={blob} luzSuave fondoClaro={false} malla={false} /> : (
            <p className="grid h-full min-h-[420px] place-items-center px-6 text-center text-sm text-[#c5d0de]">
              {error || (hayWebGL() ? 'Cargando el modelo…' : 'Este dispositivo no puede mostrar el visor 3D.')}
            </p>
          )}
        </div>
        <p className="mt-3 text-center text-xs text-[#6e7a8c]">Un dedo gira · dos dedos acercan</p>
      </div>
    </main>
  )
}
