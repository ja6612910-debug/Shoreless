# Guía de marca — Alzado

**Alzado** es un nombre propuesto: en arquitectura, el alzado es la vista frontal de un volumen, y también significa "levantar". Es justo lo que hace la app: toma una imagen plana y la levanta en 3D. Si prefieres otro nombre, los logos se actualizan cambiando solo el texto de `logo-horizontal.svg`.

## Concepto del logo

Tres capas en perspectiva isométrica, separadas por un pequeño espacio, que se apilan hacia arriba. La capa superior es la imagen original; las de abajo son el volumen que gana al convertirse a 3D.

## Paleta

| Nombre | Hex | Uso |
|---|---|---|
| Pizarra | `#1E2A3B` | Fondo del ícono, texto principal |
| Cobalto | `#3355FF` | Capa base, acciones principales |
| Cian | `#5CC8E8` | Capa intermedia, acentos |
| Papel | `#F2F4F8` | Capa superior, fondos claros |

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `logo-icono.svg` | Ícono principal en color (avatar, redes, cabecera compacta). |
| `logo-horizontal.svg` | Ícono con el nombre, para cabeceras y documentos. |
| `logo-monocromo.svg` | Una sola tinta oscura sobre fondos claros (impresión, sellos). |
| `logo-monocromo-blanco.svg` | Una sola tinta clara sobre fondos oscuros o fotos. |
| `favicon.svg` | Favicon del navegador (copia del ícono principal). |
| `icon-192.png`, `icon-512.png` | Íconos del manifest de la PWA. |
| `icon-maskable-512.png`, `icono-maskable.svg` | Ícono "maskable" de la PWA: el sistema lo recorta con la forma que prefiera (círculo, cuadrado redondeado). |
| `apple-touch-icon-180.png` | Ícono para iOS al añadir a la pantalla de inicio. |

## Reglas de uso

- Deja alrededor del logo un margen mínimo equivalente a un cuarto de su alto.
- Tamaño mínimo: 24 px de alto para el ícono y 96 px de ancho para el logo horizontal.
- No cambies los colores de las capas, no las inclines ni les agregues sombras.
- El texto de `logo-horizontal.svg` usa la tipografía Sora y, si no está instalada, una fuente del sistema. Para impresión o para distribuir el logo, convierte el texto a contornos en tu editor de diseño (Figma, Inkscape o Illustrator).

## Cómo usarlos en la PWA

En `index.html`:

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon-180.png" />
<meta name="theme-color" content="#1E2A3B" />
```

En el manifest (con `vite-plugin-pwa`):

```js
manifest: {
  name: 'Alzado',
  short_name: 'Alzado',
  theme_color: '#1E2A3B',
  background_color: '#1E2A3B',
  display: 'standalone',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
}
```

Copia los archivos de íconos a la carpeta `public/` de tu proyecto React.

## Colores en Tailwind

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      pizarra: '#1E2A3B',
      cobalto: '#3355FF',
      cian: '#5CC8E8',
      papel: '#F2F4F8',
    },
  },
}
```
