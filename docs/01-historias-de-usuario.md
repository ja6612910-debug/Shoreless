# Historias de usuario — Alzado

PWA para convertir imágenes en modelos 3D.
Stack: React + Tailwind (frontend), Node.js + Express (backend), MySQL en Clever Cloud (base de datos).

**Roles**
- **Visitante:** persona sin sesión iniciada.
- **Usuario:** persona registrada que crea proyectos y modelos.
- **Administrador:** gestiona usuarios, métodos de conversión y monitorea el sistema.

**Prioridad (MoSCoW):** Alta = imprescindible para el MVP · Media = deseable en la primera versión · Baja = mejora posterior.

---

## Épica 1 · Cuentas y acceso

### HU-01 · Registrarme
**Como** visitante, **quiero** crear una cuenta con nombre, correo y contraseña **para** guardar mis proyectos y modelos.
- El correo debe ser válido y no estar registrado.
- La contraseña exige mínimo 8 caracteres, con letras y números.
- Si el registro es correcto, entro directamente a mi espacio de trabajo.
- Si algo falla, el mensaje dice qué campo corregir.

**Prioridad:** Alta · **Requerimiento:** RF-01

### HU-02 · Iniciar sesión
**Como** usuario, **quiero** iniciar sesión con mi correo y contraseña **para** acceder a mis proyectos.
- Con credenciales correctas accedo a mi galería.
- Con credenciales incorrectas veo un mensaje genérico, sin revelar si el correo existe.
- Tras varios intentos fallidos seguidos el sistema bloquea temporalmente nuevos intentos.
- La sesión se mantiene al cerrar y volver a abrir la app.

**Prioridad:** Alta · **Requerimiento:** RF-02

### HU-03 · Cerrar sesión
**Como** usuario, **quiero** cerrar sesión **para** proteger mi cuenta en dispositivos compartidos.
- Al cerrar sesión se invalidan mis tokens en el servidor.
- Se borran los datos privados guardados en el dispositivo.

**Prioridad:** Alta · **Requerimiento:** RF-03

### HU-04 · Recuperar mi contraseña
**Como** usuario, **quiero** restablecer mi contraseña por correo **para** volver a entrar si la olvidé.
- Recibo un enlace de un solo uso que vence en 1 hora.
- Al cambiar la contraseña se cierran todas mis otras sesiones.

**Prioridad:** Media · **Requerimiento:** RF-04

### HU-05 · Editar mi perfil
**Como** usuario, **quiero** cambiar mi nombre, foto y contraseña **para** mantener mis datos al día.
- Para cambiar la contraseña debo escribir la actual.
- Puedo eliminar mi cuenta y todos mis datos; antes se me pide confirmación.

**Prioridad:** Media · **Requerimiento:** RF-05

---

## Épica 2 · Imágenes

### HU-06 · Subir una imagen
**Como** usuario, **quiero** subir una imagen desde mi dispositivo **para** convertirla en 3D.
- Acepta JPG, PNG y WebP de hasta 10 MB.
- Puedo arrastrar y soltar el archivo o elegirlo desde mis archivos.
- Si el formato o el tamaño no son válidos, veo el motivo y qué hacer.
- Veo una barra de progreso durante la subida.

**Prioridad:** Alta · **Requerimiento:** RF-06

### HU-07 · Tomar una foto con la cámara
**Como** usuario de móvil, **quiero** tomar una foto desde la app **para** convertir un objeto que tengo delante.
- La app pide permiso de cámara solo cuando toco "Usar cámara".
- Si niego el permiso, puedo subir una imagen desde mis archivos.

**Prioridad:** Media · **Requerimiento:** RF-07

### HU-08 · Recortar y previsualizar la imagen
**Como** usuario, **quiero** recortar y ver la imagen antes de convertirla **para** quedarme solo con la parte que me interesa.
- Puedo recortar con proporción libre o fija.
- Puedo girar la imagen en pasos de 90°.
- Puedo volver a la imagen original.

**Prioridad:** Media · **Requerimiento:** RF-08

---

## Épica 3 · Conversión a 3D

### HU-09 · Elegir el método de conversión
**Como** usuario, **quiero** elegir cómo se convierte mi imagen (relieve, objeto completo con IA o extrusión de silueta) **para** obtener el resultado que busco.
- Cada método muestra una descripción corta y un ejemplo del resultado.
- Solo veo los métodos activos.

**Prioridad:** Alta · **Requerimiento:** RF-09

### HU-10 · Ajustar los parámetros
**Como** usuario, **quiero** ajustar parámetros como profundidad, resolución y suavizado **para** controlar el nivel de detalle del modelo.
- Los controles disponibles cambian según el método elegido.
- Hay valores por defecto razonables y un botón "Restablecer".
- Se guardan los parámetros usados en cada conversión.

**Prioridad:** Media · **Requerimiento:** RF-10

### HU-11 · Ver el progreso de la conversión
**Como** usuario, **quiero** ver el estado de mi conversión **para** saber cuánto falta.
- Los estados son: pendiente, procesando, completado y fallido.
- Veo un porcentaje de avance cuando el método lo permite.
- Si falla, veo la causa en lenguaje claro y puedo reintentar.

**Prioridad:** Alta · **Requerimiento:** RF-11

### HU-12 · Cancelar o reintentar una conversión
**Como** usuario, **quiero** cancelar una conversión en curso o reintentar una fallida **para** no perder tiempo.
- Solo puedo cancelar trabajos pendientes o en proceso.
- Reintentar reutiliza la misma imagen y los mismos parámetros.

**Prioridad:** Media · **Requerimiento:** RF-12

### HU-13 · Recibir aviso cuando termine
**Como** usuario, **quiero** recibir una notificación cuando mi modelo esté listo **para** poder cerrar la app mientras espero.
- La app pide permiso de notificaciones y explica para qué se usan.
- Al tocar la notificación se abre el modelo terminado.
- Si no acepto notificaciones, el estado se actualiza al volver a la app.

**Prioridad:** Media · **Requerimiento:** RF-13

---

## Épica 4 · Visor 3D

### HU-14 · Explorar el modelo en 3D
**Como** usuario, **quiero** rotar, acercar y mover el modelo **para** revisarlo desde todos los ángulos.
- Funciona con ratón, y con gestos táctiles (un dedo gira, dos dedos acercan y desplazan).
- El visor muestra el modelo en menos de 3 segundos tras abrirlo.
- Si el dispositivo no soporta WebGL, veo un mensaje con alternativas.

**Prioridad:** Alta · **Requerimiento:** RF-14

### HU-15 · Ajustar la visualización
**Como** usuario, **quiero** cambiar la luz, el color de fondo y activar el modo malla (wireframe) **para** evaluar la forma y la calidad del modelo.
- Los cambios se ven al instante.
- Se recuerda mi última configuración.

**Prioridad:** Baja · **Requerimiento:** RF-15

### HU-16 · Capturar una imagen del modelo
**Como** usuario, **quiero** guardar una captura del visor **para** compartir cómo se ve mi modelo.
- Descarga un PNG con la vista actual.
- Puedo elegir fondo transparente.

**Prioridad:** Baja · **Requerimiento:** RF-16

---

## Épica 5 · Proyectos y galería

### HU-17 · Gestionar mis proyectos
**Como** usuario, **quiero** crear, renombrar, archivar y eliminar proyectos **para** mantener mi trabajo organizado.
- Un proyecto agrupa imágenes y modelos relacionados.
- Eliminar pide confirmación y mueve el proyecto a una papelera durante 30 días antes de borrarlo definitivamente.
- Solo yo puedo ver y modificar mis proyectos.

**Prioridad:** Alta · **Requerimientos:** RF-17, RF-18

### HU-18 · Buscar en mi galería
**Como** usuario, **quiero** ver mis modelos en una galería y buscarlos por nombre **para** encontrarlos rápido.
- La galería muestra miniaturas y carga más resultados al avanzar.
- La búsqueda considera el nombre y la descripción del proyecto.
- Puedo ordenar por fecha o por nombre.

**Prioridad:** Media · **Requerimiento:** RF-19

### HU-19 · Generar nuevas versiones de un modelo
**Como** usuario, **quiero** volver a convertir la misma imagen con otros parámetros **para** comparar resultados.
- Cada conversión crea una versión nueva sin borrar las anteriores.
- Puedo marcar una versión como la principal del proyecto.

**Prioridad:** Media · **Requerimiento:** RF-20

---

## Épica 6 · Exportar y compartir

### HU-20 · Exportar mi modelo
**Como** usuario, **quiero** descargar el modelo en GLB, OBJ o STL **para** usarlo en otros programas o imprimirlo en 3D.
- Elijo el formato antes de descargar.
- El archivo se abre sin errores en un visor estándar.
- Queda registrado en mi historial de exportaciones.

**Prioridad:** Alta · **Requerimiento:** RF-21

### HU-21 · Compartir un enlace
**Como** usuario, **quiero** generar un enlace para que otras personas vean mi modelo **para** mostrarlo sin que necesiten una cuenta.
- Quien abre el enlace ve el modelo en modo solo lectura.
- Puedo definir una fecha de vencimiento opcional.
- Los enlaces no muestran mis otros proyectos ni mis datos personales.

**Prioridad:** Media · **Requerimiento:** RF-22

### HU-22 · Revocar un enlace compartido
**Como** usuario, **quiero** desactivar un enlace que compartí **para** dejar de mostrar mi modelo.
- Al revocarlo, el enlace deja de funcionar de inmediato.
- Veo la lista de mis enlaces activos y cuántas visitas tuvo cada uno.

**Prioridad:** Media · **Requerimiento:** RF-23

---

## Épica 7 · Experiencia PWA

### HU-23 · Instalar la app
**Como** usuario, **quiero** instalar Alzado en mi móvil o computador **para** abrirla como una app más.
- La app ofrece instalarse cuando el navegador lo permite.
- Una vez instalada, abre en pantalla completa con su ícono y nombre.

**Prioridad:** Media · **Requerimiento:** RF-24

### HU-24 · Ver mis modelos sin conexión
**Como** usuario, **quiero** abrir la app y ver los modelos que ya descargué sin internet **para** seguir consultando mi trabajo en cualquier lugar.
- La interfaz base carga sin conexión.
- Se indica claramente cuando no hay conexión.
- Las acciones que requieren internet (subir, convertir) se desactivan con una explicación.

**Prioridad:** Media · **Requerimiento:** RF-25

### HU-25 · Recibir actualizaciones de la app
**Como** usuario, **quiero** que la app me avise cuando haya una versión nueva **para** usar siempre las mejoras más recientes.
- Aparece un aviso "Hay una versión nueva" con el botón "Actualizar".
- La actualización no interrumpe una conversión en curso.

**Prioridad:** Baja · **Requerimiento:** RF-26

---

## Épica 8 · Administración

### HU-26 · Gestionar usuarios
**Como** administrador, **quiero** ver, desactivar y reactivar cuentas **para** controlar el uso de la plataforma.
- Puedo buscar usuarios por correo o nombre.
- Una cuenta desactivada no puede iniciar sesión.
- Las acciones quedan registradas con fecha y responsable.

**Prioridad:** Media · **Requerimiento:** RF-27

### HU-27 · Gestionar los métodos de conversión
**Como** administrador, **quiero** activar o desactivar métodos de conversión **para** controlar costos y disponibilidad.
- Un método desactivado deja de aparecer para los usuarios.
- Las conversiones en curso con ese método terminan normalmente.

**Prioridad:** Baja · **Requerimiento:** RF-28

### HU-28 · Monitorear las conversiones
**Como** administrador, **quiero** ver el estado de los trabajos, la tasa de fallos y los trabajos atascados **para** detectar problemas rápido.
- Veo totales por estado y por método de los últimos 30 días.
- Puedo identificar trabajos que llevan más de 15 minutos procesando.

**Prioridad:** Media · **Requerimiento:** RF-29
