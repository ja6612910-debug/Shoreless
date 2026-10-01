import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, subirImagen } from '../api'
import { leerArchivo } from '../borrador'
import { METODOS, parametrosApi, valoresIniciales } from '../metodos'
import { Aviso, Boton, Columna, Encabezado, Pista, useEnLinea, useTitulo } from '../components/ui'

export default function Metodo() {
  const navigate = useNavigate()
  const enLinea = useEnLinea()
  const archivo = leerArchivo()
  const [activos, setActivos] = useState(METODOS.map((metodo) => metodo.codigo))
  const [codigo, setCodigo] = useState('relieve')
  const [valores, setValores] = useState(() => valoresIniciales(METODOS[0]))
  const [error, setError] = useState('')
  const [progreso, setProgreso] = useState(0)
  const [enviando, setEnviando] = useState(false)
  useTitulo('Cómo convertir')

  useEffect(() => {
    if (!archivo) navigate('/nuevo', { replace: true })
  }, [archivo, navigate])

  useEffect(() => {
    api('/api/metodos')
      .then((lista) => {
        const codigos = lista.map((item) => item.codigo)
        if (!codigos.length) return
        setActivos(codigos)
        setCodigo((actual) => (codigos.includes(actual) ? actual : codigos[0]))
      })
      .catch(() => {})
  }, [])

  const metodo = useMemo(
    () => METODOS.find((item) => item.codigo === codigo) || METODOS[0],
    [codigo],
  )

  function elegir(siguiente) {
    setCodigo(siguiente.codigo)
    setValores(valoresIniciales(siguiente))
  }

  async function convertir() {
    if (!enLinea) {
      setError('Sin conexión. Conectar a internet para convertir la imagen.')
      return
    }
    setEnviando(true)
    setError('')
    setProgreso(0)
    try {
      const nombre = archivo.name.replace(/\.[^.]+$/, '').slice(0, 150) || 'Modelo'
      const proyecto = await api('/api/proyectos', { method: 'POST', json: { nombre } })
      const imagen = await subirImagen(proyecto.id, archivo, setProgreso)
      const trabajo = await api('/api/trabajos', {
        method: 'POST',
        json: { imagenId: imagen.id, metodo: metodo.codigo, parametros: parametrosApi(metodo, valores) },
      })
      navigate(`/trabajos/${trabajo.id}`, { replace: true })
    } catch (fallo) {
      setError(fallo.message)
      setEnviando(false)
    }
  }

  return (
    <main className="min-h-dvh bg-papel text-pizarra">
      <Columna>
        <Encabezado sobre="Paso 2 de 3" titulo="Cómo convertir" />
        <div className="flex flex-1 flex-col px-5 pt-3 pb-6 md:px-0">
          <Aviso>{error}</Aviso>
          <div className="mt-2 flex flex-col gap-2.5">
            {METODOS.filter((item) => activos.includes(item.codigo)).map((item) => {
              const activo = item.codigo === codigo
              return (
                <button
                  key={item.codigo}
                  type="button"
                  onClick={() => elegir(item)}
                  className={`flex items-center gap-3 rounded-2xl border bg-white px-3.5 py-3 text-left ${activo ? 'border-cobalto' : 'border-pizarra/10'}`}
                  aria-pressed={activo}
                >
                  <span className={`grid size-[22px] place-items-center rounded-full border-2 ${activo ? 'border-cobalto' : 'border-pizarra/20'}`}>
                    {activo ? <span className="size-2.5 rounded-full bg-cobalto" /> : null}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{item.nombre}</span>
                    <span className="block text-xs text-[#6e7a8c]">{item.detalle}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-5 text-sm font-medium">Parámetros</p>
          <div className="mt-3 flex flex-col gap-4">
            {metodo.controles.map((control) => (
              <Pista
                key={control.id}
                etiqueta={control.etiqueta}
                min={control.min}
                max={control.max}
                valor={valores[control.id] ?? control.defecto}
                texto={control.texto(valores[control.id] ?? control.defecto)}
                onChange={(valor) => setValores((actual) => ({ ...actual, [control.id]: valor }))}
              />
            ))}
          </div>
          <button type="button" onClick={() => setValores(valoresIniciales(metodo))} className="mt-4 self-start text-sm font-semibold text-cobalto">
            Restablecer
          </button>
          <div className="mt-auto pt-8">
            <Boton onClick={convertir} disabled={enviando || !enLinea}>
              {enviando ? (progreso && progreso < 100 ? `Subiendo ${progreso}%` : 'Convirtiendo…') : 'Convertir'}
            </Boton>
          </div>
        </div>
      </Columna>
    </main>
  )
}
