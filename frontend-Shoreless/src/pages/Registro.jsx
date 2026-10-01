import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Aviso, Boton, Campo, Columna, Encabezado, useTitulo } from '../components/ui'
import { useSesion } from '../sesion'

export default function Registro() {
  const { usuario, listo, registrar } = useSesion()
  const navigate = useNavigate()
  const [formulario, setFormulario] = useState({ nombre: '', email: '', password: '' })
  const [campos, setCampos] = useState({})
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  useTitulo('Crear cuenta')

  if (listo && usuario) return <Navigate to="/galeria" replace />

  function cambiar(evento) {
    setFormulario((actual) => ({ ...actual, [evento.target.name]: evento.target.value }))
  }

  async function enviar(evento) {
    evento.preventDefault()
    setEnviando(true)
    setError('')
    setCampos({})
    try {
      await registrar(formulario)
      navigate('/galeria', { replace: true })
    } catch (fallo) {
      setError(fallo.message)
      setCampos(fallo.campos || {})
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="min-h-dvh bg-papel text-pizarra">
      <Columna>
        <Encabezado sobre="Cuenta" titulo="Crear cuenta" />
        <form onSubmit={enviar} className="flex flex-1 flex-col gap-4 px-5 pt-4 pb-8 md:px-0">
          <p className="text-sm leading-relaxed text-[#6e7a8c]">Guarda tus proyectos y modelos en este dispositivo.</p>
          <Aviso>{error && !Object.keys(campos).length ? error : ''}</Aviso>
          <Campo id="nombre" name="nombre" etiqueta="Nombre" placeholder="Tu nombre" autoComplete="name" value={formulario.nombre} onChange={cambiar} error={campos.nombre} required />
          <Campo id="email" name="email" type="email" etiqueta="Correo" placeholder="tunombre@correo.com" autoComplete="email" value={formulario.email} onChange={cambiar} error={campos.email} required />
          <Campo id="password" name="password" type="password" etiqueta="Contraseña" placeholder="Mínimo 8 caracteres" autoComplete="new-password" value={formulario.password} onChange={cambiar} error={campos.password} ayuda="Letras y números. Si algo falla, te decimos qué campo corregir." required />
          <div className="mt-auto pt-8">
            <Boton type="submit" disabled={enviando}>{enviando ? 'Creando cuenta…' : 'Registrarme'}</Boton>
            <p className="mt-4 text-center text-sm text-[#6e7a8c]">
              ¿Ya tienes cuenta? <Link to="/entrar" className="font-semibold text-cobalto">Inicia sesión</Link>
            </p>
          </div>
        </form>
      </Columna>
    </main>
  )
}
