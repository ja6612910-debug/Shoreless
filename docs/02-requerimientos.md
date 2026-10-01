# Requerimientos — Alzado

Las metas numéricas son propuestas iniciales para validar con el equipo y ajustar según las pruebas reales.

## 1. Requerimientos funcionales

### Cuentas y acceso

| ID | Requerimiento | Prioridad | Historia |
|---|---|---|---|
| RF-01 | El sistema permite registrar usuarios con nombre, correo único y contraseña. | Alta | HU-01 |
| RF-02 | El sistema autentica usuarios con correo y contraseña y emite un token de acceso y uno de refresco. | Alta | HU-02 |
| RF-03 | El sistema permite cerrar sesión e invalida el token de refresco en el servidor. | Alta | HU-03 |
| RF-04 | El sistema permite restablecer la contraseña mediante un enlace de un solo uso enviado por correo. | Media | HU-04 |
| RF-05 | El sistema permite editar el perfil, cambiar la contraseña y eliminar la cuenta con todos sus datos. | Media | HU-05 |

### Imágenes

| ID | Requerimiento | Prioridad | Historia |
|---|---|---|---|
| RF-06 | El sistema permite subir imágenes JPG, PNG o WebP de hasta 10 MB, validando tipo real y tamaño en el servidor. | Alta | HU-06 |
| RF-07 | El sistema permite capturar una imagen con la cámara del dispositivo. | Media | HU-07 |
| RF-08 | El sistema permite recortar y girar la imagen antes de convertirla. | Media | HU-08 |

### Conversión a 3D

| ID | Requerimiento | Prioridad | Historia |
|---|---|---|---|
| RF-09 | El sistema ofrece los métodos de conversión activos del catálogo: relieve por profundidad, objeto completo con IA y extrusión de silueta. | Alta | HU-09 |
| RF-10 | El sistema permite ajustar parámetros según el método y guarda los parámetros usados en cada trabajo. | Media | HU-10 |
| RF-11 | El sistema procesa las conversiones de forma asíncrona y expone su estado (pendiente, procesando, completado, fallido, cancelado) y su progreso. | Alta | HU-11 |
| RF-12 | El sistema permite cancelar trabajos pendientes o en proceso y reintentar los fallidos. | Media | HU-12 |
| RF-13 | El sistema envía una notificación push al terminar una conversión si el usuario la autorizó. | Media | HU-13 |

### Visor 3D

| ID | Requerimiento | Prioridad | Historia |
|---|---|---|---|
| RF-14 | El sistema muestra el modelo en un visor 3D con rotación, zoom y desplazamiento por ratón y por gestos táctiles. | Alta | HU-14 |
| RF-15 | El visor permite cambiar iluminación, color de fondo y modo malla. | Baja | HU-15 |
| RF-16 | El visor permite descargar una captura PNG de la vista actual, con opción de fondo transparente. | Baja | HU-16 |

### Proyectos y galería

| ID | Requerimiento | Prioridad | Historia |
|---|---|---|---|
| RF-17 | El sistema permite crear, renombrar y archivar proyectos que agrupan imágenes y modelos. | Alta | HU-17 |
| RF-18 | El sistema permite eliminar proyectos con borrado lógico y depuración definitiva a los 30 días. | Alta | HU-17 |
| RF-19 | El sistema ofrece una galería paginada con búsqueda por nombre y descripción y orden por fecha o nombre. | Media | HU-18 |
| RF-20 | El sistema conserva todas las versiones de modelos generadas a partir de una imagen y permite marcar una como principal. | Media | HU-19 |

### Exportar y compartir

| ID | Requerimiento | Prioridad | Historia |
|---|---|---|---|
| RF-21 | El sistema permite exportar modelos en GLB, OBJ y STL y registra cada exportación. | Alta | HU-20 |
| RF-22 | El sistema permite generar enlaces públicos de solo lectura con vencimiento opcional. | Media | HU-21 |
| RF-23 | El sistema permite revocar enlaces compartidos y muestra el número de visitas de cada uno. | Media | HU-22 |

### PWA

| ID | Requerimiento | Prioridad | Historia |
|---|---|---|---|
| RF-24 | La aplicación es instalable (manifest, íconos y service worker). | Media | HU-23 |
| RF-25 | La aplicación carga su interfaz base y los modelos ya descargados sin conexión, e indica el estado de conexión. | Media | HU-24 |
| RF-26 | La aplicación detecta versiones nuevas y ofrece actualizar sin interrumpir trabajos en curso. | Baja | HU-25 |

### Administración

| ID | Requerimiento | Prioridad | Historia |
|---|---|---|---|
| RF-27 | El sistema permite a administradores buscar, desactivar y reactivar cuentas. | Media | HU-26 |
| RF-28 | El sistema permite a administradores activar o desactivar métodos de conversión. | Baja | HU-27 |
| RF-29 | El sistema ofrece un panel con totales de trabajos por estado y método, tasa de fallos y trabajos atascados. | Media | HU-28 |

---

## 2. Requerimientos no funcionales

### Rendimiento

| ID | Requerimiento | Métrica |
|---|---|---|
| RNF-01 | La primera carga debe ser rápida en redes móviles. | LCP menor a 2,5 s en 4G. |
| RNF-02 | Las respuestas de la API (excepto conversiones) deben ser ágiles. | Percentil 95 menor a 500 ms. |
| RNF-03 | El visor 3D debe ser fluido en móviles de gama media. | Al menos 30 fps con modelos de hasta 200 000 caras. |
| RNF-04 | Iniciar una conversión no debe bloquear al usuario. | La API responde en menos de 1 s con el identificador del trabajo (HTTP 202). |
| RNF-05 | El método de relieve ejecutado en el navegador debe terminar en un tiempo razonable. | Menos de 15 s para una imagen de 2 MP en un móvil de gama media. |

### Seguridad

| ID | Requerimiento | Métrica o criterio |
|---|---|---|
| RNF-06 | Todo el tráfico viaja cifrado. | HTTPS obligatorio con cabeceras HSTS. |
| RNF-07 | Las contraseñas se almacenan con hash seguro. | bcrypt (coste ≥ 12) o argon2id; nunca en texto plano. |
| RNF-08 | La sesión usa tokens de vida corta. | Token de acceso de 15 min y token de refresco rotativo almacenado como hash. |
| RNF-09 | Los archivos subidos se validan en el servidor. | Verificación del tipo real por contenido, límite de 10 MB y nombres de archivo generados por el sistema. |
| RNF-10 | Se previene la inyección SQL. | Consultas parametrizadas en el 100 % de los accesos a la base de datos. |
| RNF-11 | Se limitan abusos y orígenes no autorizados. | Límite de solicitudes por IP y por usuario, CORS restringido y cabeceras de seguridad (helmet). |
| RNF-12 | Cada recurso solo es accesible por su propietario. | Toda consulta filtra por el usuario autenticado; pruebas automáticas de autorización. |
| RNF-13 | Los enlaces compartidos no son adivinables. | Token aleatorio de al menos 256 bits. |

### Privacidad

| ID | Requerimiento | Métrica o criterio |
|---|---|---|
| RNF-14 | Los archivos del usuario son privados por defecto. | Acceso mediante URLs firmadas de corta duración. |
| RNF-15 | El usuario puede eliminar su cuenta y sus datos. | Borrado completo de base de datos y almacenamiento en menos de 30 días. |

### Disponibilidad y datos

| ID | Requerimiento | Métrica o criterio |
|---|---|---|
| RNF-16 | El servicio debe estar disponible de forma estable. | Objetivo de disponibilidad mensual del 99 %. |
| RNF-17 | La base de datos se respalda periódicamente. | Copia diaria con restauración probada. |
| RNF-18 | El backend usa pocas conexiones a MySQL por las limitaciones del plan. | Pool de 3 a 5 conexiones; confirmar el límite del plan contratado en Clever Cloud. |
| RNF-19 | Las imágenes y los modelos no se guardan dentro de MySQL. | Archivos en almacenamiento de objetos (por ejemplo Cellar de Clever Cloud); en la base solo claves y metadatos. |

### Usabilidad y accesibilidad

| ID | Requerimiento | Métrica o criterio |
|---|---|---|
| RNF-20 | La interfaz es responsive. | Funcional desde 360 px de ancho, con prioridad móvil. |
| RNF-21 | La interfaz cumple pautas de accesibilidad. | WCAG 2.1 nivel AA: contraste, foco visible y navegación por teclado. |
| RNF-22 | La interfaz está en español y preparada para otros idiomas. | Textos externalizados en archivos de traducción. |
| RNF-23 | Los errores son claros. | Cada mensaje indica qué ocurrió y cómo resolverlo. |

### Compatibilidad

| ID | Requerimiento | Métrica o criterio |
|---|---|---|
| RNF-24 | Compatible con los navegadores principales. | Últimas 2 versiones de Chrome, Edge y Firefox; Safari 16 o superior. |
| RNF-25 | El visor requiere WebGL 2. | Mensaje de alternativa si no está disponible. |

### PWA

| ID | Requerimiento | Métrica o criterio |
|---|---|---|
| RNF-26 | La aplicación cumple los criterios de instalación. | Auditoría Lighthouse de PWA aprobada. |
| RNF-27 | Estrategia de caché definida. | Interfaz base con cache-first; lecturas de API con stale-while-revalidate; nunca se cachean datos de autenticación. |
| RNF-28 | El manifest incluye íconos adecuados. | Íconos de 192 y 512 px, con versión maskable. |

### Mantenibilidad y operación

| ID | Requerimiento | Métrica o criterio |
|---|---|---|
| RNF-29 | Código modular y con estilo uniforme. | ESLint y Prettier en el repositorio y en integración continua. |
| RNF-30 | Pruebas automáticas del backend. | Cobertura de al menos 70 %. |
| RNF-31 | Secretos fuera del código. | Variables de entorno; ningún secreto en el repositorio. |
| RNF-32 | El esquema de base de datos está versionado. | Migraciones numeradas y reproducibles. |
| RNF-33 | Registros estructurados. | Logs en JSON con identificador de solicitud. |

### Escalabilidad

| ID | Requerimiento | Métrica o criterio |
|---|---|---|
| RNF-34 | El procesamiento de conversiones está desacoplado de la API. | Cola de trabajos con workers independientes, escalables sin cambiar la API. |
