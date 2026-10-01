import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { Aviso, Boton, Campo, Columna, Encabezado, useTitulo } from '../components/ui'

export default function Restablecer() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [campos, setCampos] = useState({})
  const [enviando, setEnviando] = useState(false)
  useTitulo('Nueva contraseña')

  async function enviar(evento) {
    evento.preventDefault()
    setEnviando(true)
    setError('')
    setCampos({})
    try {
      await api('/api/auth/restablecer', { method: 'POST', json: { token, password } })
      navigate('/entrar', { replace: true })
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
        <Encabezado sobre="Cuenta" titulo="Nueva contraseña" />
        <form onSubmit={enviar} className="flex flex-1 flex-col gap-4 px-5 pt-4 pb-8 md:px-0">
          <p className="text-sm leading-relaxed text-[#6e7a8c]">Elige una contraseña nueva. Al guardarla se cierran tus otras sesiones.</p>
          <Aviso>{error && !campos.password ? error : ''}</Aviso>
          <Campo id="password" type="password" etiqueta="Nueva contraseña" placeholder="Mínimo 8 caracteres" autoComplete="new-password" value={password} onChange={(evento) => setPassword(evento.target.value)} error={campos.password} ayuda="Letras y números, mínimo 8 caracteres." required />
          <div className="mt-auto pt-8">
            <Boton type="submit" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar contraseña'}</Boton>
            <p className="mt-4 text-center text-sm">
              <Link to="/entrar" className="font-semibold text-cobalto">Volver a iniciar sesión</Link>
            </p>
          </div>
        </form>
      </Columna>
    </main>
  )
}
