import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { Aviso, Boton, Campo, Columna, Encabezado, useTitulo } from '../components/ui'

export default function Recuperar() {
  const [email, setEmail] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [enlace, setEnlace] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  useTitulo('Recuperar contraseña')

  async function enviar(evento) {
    evento.preventDefault()
    setEnviando(true)
    setError('')
    try {
      const datos = await api('/api/auth/recuperar', { method: 'POST', json: { email } })
      setMensaje(datos.mensaje)
      setEnlace(datos.enlace || '')
    } catch (fallo) {
      setError(fallo.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="min-h-dvh bg-papel text-pizarra">
      <Columna>
        <Encabezado sobre="Cuenta" titulo="Recuperar contraseña" />
        <form onSubmit={enviar} className="flex flex-1 flex-col gap-4 px-5 pt-4 pb-8 md:px-0">
          <p className="text-sm leading-relaxed text-[#6e7a8c]">Te enviamos un enlace de un solo uso. Vence en 1 hora y, al usarlo, se cierran tus otras sesiones.</p>
          <Aviso>{error}</Aviso>
          {mensaje ? <p className="rounded-xl bg-white px-3 py-2 text-sm text-[#1f8a4c]">{mensaje}</p> : null}
          {enlace ? <a href={enlace} className="text-sm font-semibold break-all text-cobalto">Abrir el enlace de restablecimiento</a> : null}
          <Campo id="email" type="email" etiqueta="Correo" placeholder="tunombre@correo.com" autoComplete="email" value={email} onChange={(evento) => setEmail(evento.target.value)} required />
          <div className="mt-auto pt-8">
            <Boton type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar enlace'}</Boton>
            <p className="mt-4 text-center text-sm">
              <Link to="/entrar" className="font-semibold text-cobalto">Volver a iniciar sesión</Link>
            </p>
          </div>
        </form>
      </Columna>
    </main>
  )
}
