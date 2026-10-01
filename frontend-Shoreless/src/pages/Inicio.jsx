import { Navigate, Link } from 'react-router-dom'
import { Marca, Miniatura, useTitulo } from '../components/ui'
import { useSesion } from '../sesion'

export default function Inicio() {
  const { usuario, listo } = useSesion()
  useTitulo('')
  if (!listo) return <div className="min-h-dvh bg-pizarra" />
  if (usuario) return <Navigate to="/galeria" replace />

  return (
    <main className="min-h-dvh bg-pizarra text-papel">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 pt-12 pb-8 md:max-w-3xl md:px-10 lg:max-w-6xl lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-16 lg:py-16">
        <div className="flex flex-col">
          <Marca clara tamano={36} />
          <h1 className="mt-6 max-w-xl text-[34px] leading-[1.05] font-extrabold md:text-5xl lg:text-6xl">
            De una foto a un modelo 3D
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#c5d0de] md:text-base">
            Sube una imagen y conviértela en un objeto que puedes girar, exportar e imprimir.
          </p>
          <div className="mt-8 flex flex-1 items-center justify-center py-6 lg:hidden">
            <Miniatura className="size-40 md:size-52" />
          </div>
          <div className="mt-auto flex flex-col gap-3 lg:mt-10">
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-cobalto px-3 py-2 text-xs font-semibold text-white">Relieve</span>
              <span className="rounded-full border border-pizarra/10 bg-white px-3 py-2 text-xs font-semibold text-pizarra">Objeto IA</span>
              <span className="rounded-full border border-pizarra/10 bg-white px-3 py-2 text-xs font-semibold text-pizarra">Silueta</span>
            </div>
            <Link to="/registro" className="inline-flex h-[49px] items-center justify-center rounded-[14px] bg-cobalto text-[15px] font-semibold text-white">
              Crear cuenta
            </Link>
            <Link to="/entrar" className="inline-flex h-[52px] items-center justify-center rounded-[14px] border-[1.5px] border-white/30 text-[15px] font-semibold text-papel">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
        <div className="hidden items-center justify-center lg:flex">
          <Miniatura className="size-72" />
        </div>
      </div>
    </main>
  )
}
