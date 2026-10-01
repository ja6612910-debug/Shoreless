import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export function hayWebGL() {
  try {
    const lienzo = document.createElement('canvas')
    return Boolean(lienzo.getContext('webgl2') || lienzo.getContext('webgl'))
  } catch {
    return false
  }
}

export default function Escena({ blob, luzSuave, fondoClaro, malla, alCaptura }) {
  const caja = useRef(null)
  const estado = useRef({})

  useEffect(() => {
    const el = caja.current
    if (!el || !blob) return undefined
    let vivo = true

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)

    const escena = new THREE.Scene()
    const camara = new THREE.PerspectiveCamera(40, 1, 0.01, 100)
    camara.position.set(1.8, 1.25, 2.1)

    const controles = new OrbitControls(camara, renderer.domElement)
    controles.enableDamping = true
    controles.target.set(0, 0, 0)
    controles.touches.ONE = THREE.TOUCH.ROTATE
    controles.touches.TWO = THREE.TOUCH.DOLLY_PAN

    const ambiente = new THREE.AmbientLight(0xffffff, 0.8)
    const direccional = new THREE.DirectionalLight(0xffffff, 1.4)
    direccional.position.set(3, 4, 2)
    const relleno = new THREE.DirectionalLight(0x5cc8e8, 0.35)
    relleno.position.set(-2, 1, -2)
    escena.add(ambiente, direccional, relleno)

    const url = URL.createObjectURL(blob)
    const grupo = new THREE.Group()
    escena.add(grupo)

    new GLTFLoader().load(url, (gltf) => {
      if (!vivo) return
      const modelo = gltf.scene
      const limites = new THREE.Box3().setFromObject(modelo)
      const centro = limites.getCenter(new THREE.Vector3())
      const tamano = limites.getSize(new THREE.Vector3())
      modelo.position.sub(centro)
      const mayor = Math.max(tamano.x, tamano.y, tamano.z, 0.001)
      modelo.scale.setScalar(1.5 / mayor)
      grupo.add(modelo)
    })

    const ajustar = () => {
      const rect = el.getBoundingClientRect()
      const ancho = Math.max(rect.width, 1)
      const alto = Math.max(rect.height, 1)
      renderer.setSize(ancho, alto, false)
      camara.aspect = ancho / alto
      camara.updateProjectionMatrix()
    }
    ajustar()
    const observador = new ResizeObserver(ajustar)
    observador.observe(el)

    let frame = 0
    const dibujar = () => {
      controles.update()
      renderer.render(escena, camara)
      frame = requestAnimationFrame(dibujar)
    }
    dibujar()

    estado.current = { renderer, ambiente, direccional, relleno, grupo }
    alCaptura?.(() => renderer.domElement.toDataURL('image/png'))

    return () => {
      vivo = false
      cancelAnimationFrame(frame)
      observador.disconnect()
      controles.dispose()
      renderer.dispose()
      URL.revokeObjectURL(url)
      el.replaceChildren()
    }
  }, [blob, alCaptura])

  useEffect(() => {
    const { renderer, ambiente, direccional, relleno, grupo } = estado.current
    if (!renderer) return
    renderer.setClearColor(fondoClaro ? 0xf2f4f8 : 0x1e2a3b, 1)
    ambiente.intensity = luzSuave ? 1.15 : 0.25
    direccional.intensity = luzSuave ? 1.1 : 2.2
    relleno.intensity = luzSuave ? 0.45 : 0.05
    grupo?.traverse((nodo) => {
      if (nodo.isMesh && nodo.material) {
        const materiales = Array.isArray(nodo.material) ? nodo.material : [nodo.material]
        materiales.forEach((material) => {
          material.wireframe = malla
          material.needsUpdate = true
        })
      }
    })
  }, [luzSuave, fondoClaro, malla, blob])

  return <div ref={caja} className="h-full w-full" />
}
