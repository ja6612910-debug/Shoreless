import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Aviso, Boton, Campo, Columna, Encabezado, useTitulo } from '../components/ui'
import { useSesion } from '../sesion'

export default function Entrar() {
  const { usuario, listo, entrar } = useSesion()
  const navigate = useNavigate()
  const [formulario, setFormulario] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  useTitulo('Iniciar sesión')

  if (listo && usuario) return <Navigate to="/galeria" replace />

  async function enviar(evento) {
    evento.preventDefault()
    setEnviando(true)
    setError('')
    try {
      await entrar(formulario)
      navigate('/galeria', { replace: true })
    } catch (fallo) {
      setError(fallo.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="min-h-dvh bg-papel text-pizarra">
      <Columna>
        <Encabezado sobre="Cuenta" titulo="Iniciar sesión" />
        <form onSubmit={enviar} className="flex flex-1 flex-col gap-4 px-5 pt-4 pb-8 md:px-0">
          <p className="text-sm leading-relaxed text-[#6e7a8c]">Entra para ver tu galería. La sesión se mantiene al volver a abrir la app.</p>
          <Aviso>{error}</Aviso>
          <Campo id="email" name="email" type="email" etiqueta="Correo" placeholder="tunombre@correo.com" autoComplete="email" value={formulario.email} onChange={(evento) => setFormulario((actual) => ({ ...actual, email: evento.target.value }))} required />
          <Campo id="password" name="password" type="password" etiqueta="Contraseña" placeholder="Tu contraseña" autoComplete="current-password" value={formulario.password} onChange={(evento) => setFormulario((actual) => ({ ...actual, password: evento.target.value }))} required />
          <Link to="/recuperar" className="text-sm font-semibold text-cobalto">Olvidé mi contraseña</Link>
          <div className="mt-auto pt-8">
            <Boton type="submit" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</Boton>
            <p className="mt-4 text-center text-sm">
              <Link to="/registro" className="font-semibold text-cobalto">Crear una cuenta</Link>
            </p>
          </div>
        </form>
      </Columna>
    </main>
  )
}
