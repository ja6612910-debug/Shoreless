import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import PWABadge from './PWABadge'
import { useSesion } from './sesion'
import Entrar from './pages/Entrar'
import Galeria from './pages/Galeria'
import Inicio from './pages/Inicio'
import Metodo from './pages/Metodo'
import Perfil from './pages/Perfil'
import Progreso from './pages/Progreso'
import Recuperar from './pages/Recuperar'
import Registro from './pages/Registro'
import Restablecer from './pages/Restablecer'
import Subir from './pages/Subir'
const Visor = lazy(() => import('./pages/Visor'))
const Exportar = lazy(() => import('./pages/Exportar'))
const Publico = lazy(() => import('./pages/Publico'))

function Espera() {
  return <div className="grid min-h-dvh place-items-center bg-papel text-sm text-[#6e7a8c]">Cargando…</div>
}

function RutaPrivada() {
  const { usuario, listo } = useSesion()
  if (!listo) {
    return <div className="grid min-h-dvh place-items-center bg-papel text-sm text-[#6e7a8c]">Cargando…</div>
  }
  if (!usuario) return <Navigate to="/entrar" replace />
  return <Outlet />
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/recuperar" element={<Recuperar />} />
        <Route path="/restablecer/:token" element={<Restablecer />} />
        <Route path="/v/:token" element={<Suspense fallback={<Espera />}><Publico /></Suspense>} />
        <Route element={<RutaPrivada />}>
          <Route path="/galeria" element={<Galeria />} />
          <Route path="/nuevo" element={<Subir />} />
          <Route path="/nuevo/metodo" element={<Metodo />} />
          <Route path="/trabajos/:id" element={<Progreso />} />
          <Route path="/modelos/:id" element={<Suspense fallback={<Espera />}><Visor /></Suspense>} />
          <Route path="/modelos/:id/exportar" element={<Suspense fallback={<Espera />}><Exportar /></Suspense>} />
          <Route path="/perfil" element={<Perfil />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <PWABadge />
    </>
  )
}
