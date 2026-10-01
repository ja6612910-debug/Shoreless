-- =====================================================================
-- Alzado · Consultas SQL para el backend (MySQL 8)
-- =====================================================================
-- Los signos ? son parámetros: úsalos siempre con consultas
-- parametrizadas (mysql2) para evitar inyección SQL.
-- Casi todas filtran por usuario_id: así un usuario solo accede a lo suyo.
-- Nota para mysql2: LIMIT ? OFFSET ? funciona con pool.query(), no siempre
-- con pool.execute(); convierte esos valores a número antes de pasarlos.
-- =====================================================================


-- =====================================================================
-- 1. CUENTAS Y SESIÓN
-- =====================================================================

-- Registrar usuario (el hash lo genera bcrypt/argon2 en Node)
INSERT INTO usuarios (nombre, email, password_hash)
VALUES (?, ?, ?);

-- Buscar usuario para iniciar sesión
SELECT id, nombre, email, password_hash, rol
FROM usuarios
WHERE email = ? AND activo = 1
LIMIT 1;

-- Perfil del usuario autenticado
SELECT id, nombre, email, rol, avatar_clave, creado_en
FROM usuarios
WHERE id = ?;

-- Actualizar perfil
UPDATE usuarios SET nombre = ?, avatar_clave = ? WHERE id = ?;

-- Cambiar contraseña
UPDATE usuarios SET password_hash = ? WHERE id = ?;

-- Guardar token de refresco (se guarda el hash SHA-256, nunca el token)
INSERT INTO tokens_usuario (usuario_id, tipo, token_hash, expira_en)
VALUES (?, 'refresco', ?, ?);

-- Validar token de refresco
SELECT t.id, t.usuario_id
FROM tokens_usuario t
JOIN usuarios u ON u.id = t.usuario_id AND u.activo = 1
WHERE t.token_hash = ?
  AND t.tipo = 'refresco'
  AND t.revocado_en IS NULL
  AND t.expira_en > NOW();

-- Rotar: revocar el token usado (después se inserta el nuevo)
UPDATE tokens_usuario SET revocado_en = NOW() WHERE id = ? AND revocado_en IS NULL;

-- Cerrar sesión en todos los dispositivos / tras cambiar contraseña
UPDATE tokens_usuario
SET revocado_en = NOW()
WHERE usuario_id = ? AND tipo = 'refresco' AND revocado_en IS NULL;

-- Solicitar recuperación de contraseña (vence en 1 hora)
INSERT INTO tokens_usuario (usuario_id, tipo, token_hash, expira_en)
VALUES (?, 'recuperacion', ?, DATE_ADD(NOW(), INTERVAL 1 HOUR));

-- Canjear token de recuperación (un solo uso)
UPDATE tokens_usuario
SET usado_en = NOW()
WHERE token_hash = ?
  AND tipo = 'recuperacion'
  AND usado_en IS NULL
  AND revocado_en IS NULL
  AND expira_en > NOW();
-- Si affectedRows = 1, cambiar la contraseña del usuario dueño del token.

-- Registrar o actualizar suscripción push del dispositivo
INSERT INTO suscripciones_push (usuario_id, endpoint_hash, endpoint, p256dh, auth)
VALUES (?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
  usuario_id = VALUES(usuario_id),
  p256dh = VALUES(p256dh),
  auth = VALUES(auth);

-- Suscripciones de un usuario (para enviar la notificación)
SELECT endpoint, p256dh, auth FROM suscripciones_push WHERE usuario_id = ?;


-- =====================================================================
-- 2. PROYECTOS Y GALERÍA
-- =====================================================================

-- Crear proyecto
INSERT INTO proyectos (usuario_id, nombre, descripcion) VALUES (?, ?, ?);

-- Listar proyectos con total de modelos y miniatura (paginado)
SELECT
  p.id, p.nombre, p.descripcion, p.estado, p.actualizado_en,
  (SELECT COUNT(*)
     FROM modelos_3d m
    WHERE m.proyecto_id = p.id AND m.eliminado_en IS NULL) AS total_modelos,
  (SELECT m.clave_miniatura
     FROM modelos_3d m
    WHERE m.proyecto_id = p.id AND m.eliminado_en IS NULL
    ORDER BY m.es_principal DESC, m.creado_en DESC
    LIMIT 1) AS miniatura
FROM proyectos p
WHERE p.usuario_id = ?
  AND p.eliminado_en IS NULL
  AND p.estado = 'activo'
ORDER BY p.actualizado_en DESC
LIMIT ? OFFSET ?;

-- Buscar proyectos por nombre o descripción (FULLTEXT)
SELECT p.id, p.nombre, p.descripcion, p.actualizado_en
FROM proyectos p
WHERE p.usuario_id = ?
  AND p.eliminado_en IS NULL
  AND MATCH (p.nombre, p.descripcion) AGAINST (? IN NATURAL LANGUAGE MODE)
LIMIT ? OFFSET ?;
-- Para términos muy cortos, FULLTEXT puede no devolver resultados;
-- alternativa: AND (p.nombre LIKE CONCAT('%', ?, '%'))

-- Detalle de un proyecto del usuario
SELECT id, nombre, descripcion, estado, creado_en, actualizado_en
FROM proyectos
WHERE id = ? AND usuario_id = ? AND eliminado_en IS NULL;

-- Renombrar / editar
UPDATE proyectos
SET nombre = ?, descripcion = ?
WHERE id = ? AND usuario_id = ? AND eliminado_en IS NULL;

-- Archivar / desarchivar
UPDATE proyectos
SET estado = ?   -- 'archivado' o 'activo'
WHERE id = ? AND usuario_id = ? AND eliminado_en IS NULL;

-- Enviar a la papelera (borrado lógico)
UPDATE proyectos
SET eliminado_en = NOW()
WHERE id = ? AND usuario_id = ? AND eliminado_en IS NULL;

-- Restaurar desde la papelera
UPDATE proyectos
SET eliminado_en = NULL
WHERE id = ? AND usuario_id = ? AND eliminado_en IS NOT NULL;

-- Ver la papelera
SELECT id, nombre, eliminado_en
FROM proyectos
WHERE usuario_id = ? AND eliminado_en IS NOT NULL
ORDER BY eliminado_en DESC;


-- =====================================================================
-- 3. IMÁGENES
-- =====================================================================

-- Registrar imagen subida; solo inserta si el proyecto es del usuario.
-- Verifica affectedRows = 1.
INSERT INTO imagenes
  (proyecto_id, nombre_original, clave_almacenamiento, mime_type,
   tamano_bytes, ancho_px, alto_px, hash_sha256)
SELECT p.id, ?, ?, ?, ?, ?, ?, ?
FROM proyectos p
WHERE p.id = ? AND p.usuario_id = ? AND p.eliminado_en IS NULL;
-- Parámetros: nombre_original, clave, mime, tamano, ancho, alto, hash, proyecto_id, usuario_id

-- Imágenes de un proyecto
SELECT i.id, i.nombre_original, i.clave_almacenamiento, i.ancho_px, i.alto_px, i.creado_en
FROM imagenes i
JOIN proyectos p ON p.id = i.proyecto_id
WHERE i.proyecto_id = ? AND p.usuario_id = ? AND p.eliminado_en IS NULL
ORDER BY i.creado_en DESC;

-- Catálogo de métodos disponibles para el usuario
SELECT id, codigo, nombre, descripcion, parametros_por_defecto
FROM metodos_conversion
WHERE activo = 1
ORDER BY id;


-- =====================================================================
-- 4. TRABAJOS DE CONVERSIÓN
-- =====================================================================

-- Crear trabajo (valida propiedad de la imagen y que el método esté activo).
-- Verifica affectedRows = 1; luego lee LAST_INSERT_ID() / insertId.
INSERT INTO trabajos_conversion (imagen_id, metodo_id, usuario_id, parametros)
SELECT i.id, m.id, p.usuario_id, ?
FROM imagenes i
JOIN proyectos p ON p.id = i.proyecto_id AND p.eliminado_en IS NULL
JOIN metodos_conversion m ON m.id = ? AND m.activo = 1
WHERE i.id = ? AND p.usuario_id = ?;
-- Parámetros: parametros (JSON como texto), metodo_id, imagen_id, usuario_id

-- Estado de un trabajo del usuario (para consultar el progreso)
SELECT t.id, t.estado, t.progreso, t.mensaje_error, t.creado_en, t.finalizado_en,
       mo.id AS modelo_id
FROM trabajos_conversion t
LEFT JOIN modelos_3d mo ON mo.trabajo_id = t.id
WHERE t.id = ? AND t.usuario_id = ?;

-- Trabajos activos del usuario
SELECT t.id, t.estado, t.progreso, mc.nombre AS metodo, t.creado_en
FROM trabajos_conversion t
JOIN metodos_conversion mc ON mc.id = t.metodo_id
WHERE t.usuario_id = ? AND t.estado IN ('pendiente','procesando')
ORDER BY t.creado_en;

-- ---- Worker: tomar el siguiente trabajo sin que dos workers lo repitan ----
START TRANSACTION;

SELECT id, imagen_id, metodo_id, usuario_id, parametros
FROM trabajos_conversion
WHERE estado = 'pendiente'
ORDER BY creado_en
LIMIT 1
FOR UPDATE SKIP LOCKED;

UPDATE trabajos_conversion
SET estado = 'procesando', iniciado_en = NOW(), intentos = intentos + 1
WHERE id = ?;

COMMIT;

-- Worker: actualizar progreso
UPDATE trabajos_conversion
SET progreso = ?
WHERE id = ? AND estado = 'procesando';

-- Worker: marcar como completado
UPDATE trabajos_conversion
SET estado = 'completado', progreso = 100, finalizado_en = NOW()
WHERE id = ? AND estado = 'procesando';

-- Worker: marcar como fallido
UPDATE trabajos_conversion
SET estado = 'fallido', mensaje_error = ?, finalizado_en = NOW()
WHERE id = ? AND estado = 'procesando';

-- Cancelar (solo pendiente o procesando, y solo el dueño)
UPDATE trabajos_conversion
SET estado = 'cancelado', finalizado_en = NOW()
WHERE id = ? AND usuario_id = ? AND estado IN ('pendiente','procesando');

-- Reintentar un trabajo fallido (mismos parámetros e imagen)
UPDATE trabajos_conversion
SET estado = 'pendiente', progreso = 0, mensaje_error = NULL,
    iniciado_en = NULL, finalizado_en = NULL
WHERE id = ? AND usuario_id = ? AND estado = 'fallido';

-- Recuperar trabajos atascados (procesando hace más de 15 minutos)
UPDATE trabajos_conversion
SET estado = 'pendiente', iniciado_en = NULL
WHERE estado = 'procesando'
  AND iniciado_en < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
  AND intentos < 3;


-- =====================================================================
-- 5. MODELOS 3D
-- =====================================================================

-- Registrar el modelo generado; la versión se calcula por proyecto.
-- Parámetros: nombre, clave_glb, clave_miniatura, tamano_bytes,
--             num_vertices, num_caras, trabajo_id
INSERT INTO modelos_3d
  (proyecto_id, trabajo_id, nombre, version,
   clave_glb, clave_miniatura, tamano_bytes, num_vertices, num_caras)
SELECT i.proyecto_id, t.id, ?,
       COALESCE((SELECT MAX(m.version) FROM modelos_3d m
                  WHERE m.proyecto_id = i.proyecto_id), 0) + 1,
       ?, ?, ?, ?, ?
FROM trabajos_conversion t
JOIN imagenes i ON i.id = t.imagen_id
WHERE t.id = ?;

-- Modelos de un proyecto (versiones)
SELECT m.id, m.nombre, m.version, m.es_principal, m.clave_miniatura,
       m.num_caras, m.tamano_bytes, m.creado_en
FROM modelos_3d m
JOIN proyectos p ON p.id = m.proyecto_id
WHERE m.proyecto_id = ? AND p.usuario_id = ?
  AND m.eliminado_en IS NULL AND p.eliminado_en IS NULL
ORDER BY m.version DESC;

-- Modelo para el visor (valida propiedad)
SELECT m.id, m.nombre, m.version, m.clave_glb, m.num_vertices, m.num_caras
FROM modelos_3d m
JOIN proyectos p ON p.id = m.proyecto_id
WHERE m.id = ? AND p.usuario_id = ?
  AND m.eliminado_en IS NULL AND p.eliminado_en IS NULL;

-- Marcar una versión como principal (una sola sentencia)
UPDATE modelos_3d m
JOIN proyectos p ON p.id = m.proyecto_id
SET m.es_principal = (m.id = ?)
WHERE m.proyecto_id = ? AND p.usuario_id = ?;

-- Eliminar un modelo (borrado lógico)
UPDATE modelos_3d m
JOIN proyectos p ON p.id = m.proyecto_id
SET m.eliminado_en = NOW()
WHERE m.id = ? AND p.usuario_id = ? AND m.eliminado_en IS NULL;


-- =====================================================================
-- 6. EXPORTACIONES
-- =====================================================================

-- Registrar una exportación (valida propiedad del modelo)
INSERT INTO exportaciones (modelo_id, usuario_id, formato)
SELECT m.id, p.usuario_id, ?
FROM modelos_3d m
JOIN proyectos p ON p.id = m.proyecto_id
WHERE m.id = ? AND p.usuario_id = ? AND m.eliminado_en IS NULL;
-- Parámetros: formato ('glb' | 'obj' | 'stl'), modelo_id, usuario_id

-- Historial de exportaciones del usuario
SELECT e.id, e.formato, e.creado_en, m.nombre AS modelo
FROM exportaciones e
JOIN modelos_3d m ON m.id = e.modelo_id
WHERE e.usuario_id = ?
ORDER BY e.creado_en DESC
LIMIT ? OFFSET ?;


-- =====================================================================
-- 7. ENLACES COMPARTIDOS
-- =====================================================================

-- Crear enlace (el token aleatorio de 32 bytes en hex lo genera Node)
INSERT INTO enlaces_compartidos (modelo_id, creado_por, token, expira_en)
SELECT m.id, p.usuario_id, ?, ?
FROM modelos_3d m
JOIN proyectos p ON p.id = m.proyecto_id
WHERE m.id = ? AND p.usuario_id = ?
  AND m.eliminado_en IS NULL AND p.eliminado_en IS NULL;
-- Parámetros: token, expira_en (o NULL), modelo_id, usuario_id

-- Abrir enlace público (sin sesión)
SELECT m.id, m.nombre, m.clave_glb, m.num_caras
FROM enlaces_compartidos e
JOIN modelos_3d m ON m.id = e.modelo_id AND m.eliminado_en IS NULL
JOIN proyectos p ON p.id = m.proyecto_id AND p.eliminado_en IS NULL
WHERE e.token = ?
  AND e.revocado_en IS NULL
  AND (e.expira_en IS NULL OR e.expira_en > NOW());

-- Contar visita
UPDATE enlaces_compartidos SET visitas = visitas + 1 WHERE token = ?;

-- Mis enlaces con visitas
SELECT e.id, e.token, e.expira_en, e.revocado_en, e.visitas, e.creado_en,
       m.nombre AS modelo
FROM enlaces_compartidos e
JOIN modelos_3d m ON m.id = e.modelo_id
WHERE e.creado_por = ?
ORDER BY e.creado_en DESC;

-- Revocar enlace
UPDATE enlaces_compartidos
SET revocado_en = NOW()
WHERE id = ? AND creado_por = ? AND revocado_en IS NULL;


-- =====================================================================
-- 8. ADMINISTRACIÓN
-- =====================================================================

-- Buscar usuarios
SELECT id, nombre, email, rol, activo, creado_en
FROM usuarios
WHERE nombre LIKE CONCAT('%', ?, '%') OR email LIKE CONCAT('%', ?, '%')
ORDER BY creado_en DESC
LIMIT ? OFFSET ?;

-- Desactivar / reactivar cuenta (al desactivar, revocar sus tokens aparte)
UPDATE usuarios SET activo = ? WHERE id = ? AND rol <> 'admin';

-- Activar / desactivar un método de conversión
UPDATE metodos_conversion SET activo = ? WHERE id = ?;

-- Trabajos por estado y método (últimos 30 días)
SELECT mc.nombre AS metodo, t.estado, COUNT(*) AS total
FROM trabajos_conversion t
JOIN metodos_conversion mc ON mc.id = t.metodo_id
WHERE t.creado_en >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY mc.nombre, t.estado
ORDER BY mc.nombre, t.estado;

-- Tasa de fallos por método (últimos 30 días)
SELECT mc.nombre AS metodo,
       COUNT(*) AS total,
       SUM(t.estado = 'fallido') AS fallidos,
       ROUND(100 * SUM(t.estado = 'fallido') / COUNT(*), 1) AS porcentaje_fallos
FROM trabajos_conversion t
JOIN metodos_conversion mc ON mc.id = t.metodo_id
WHERE t.creado_en >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  AND t.estado IN ('completado','fallido')
GROUP BY mc.nombre;

-- Tiempo promedio de conversión por método (segundos)
SELECT mc.nombre AS metodo,
       ROUND(AVG(TIMESTAMPDIFF(SECOND, t.iniciado_en, t.finalizado_en)), 1) AS segundos_promedio
FROM trabajos_conversion t
JOIN metodos_conversion mc ON mc.id = t.metodo_id
WHERE t.estado = 'completado'
  AND t.finalizado_en >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY mc.nombre;

-- Trabajos atascados (procesando hace más de 15 minutos)
SELECT t.id, t.usuario_id, t.metodo_id, t.iniciado_en, t.intentos
FROM trabajos_conversion t
WHERE t.estado = 'procesando'
  AND t.iniciado_en < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
ORDER BY t.iniciado_en;

-- Almacenamiento usado por usuario (imágenes + modelos), de mayor a menor
SELECT u.id, u.email,
       COALESCE(SUM(x.bytes), 0) AS bytes_totales
FROM usuarios u
LEFT JOIN (
  SELECT p.usuario_id, i.tamano_bytes AS bytes
    FROM imagenes i JOIN proyectos p ON p.id = i.proyecto_id
  UNION ALL
  SELECT p.usuario_id, m.tamano_bytes
    FROM modelos_3d m JOIN proyectos p ON p.id = m.proyecto_id
) x ON x.usuario_id = u.id
GROUP BY u.id, u.email
ORDER BY bytes_totales DESC
LIMIT 20;


-- =====================================================================
-- 9. MANTENIMIENTO (tareas programadas)
-- =====================================================================

-- Eliminar tokens vencidos o revocados hace más de 7 días
DELETE FROM tokens_usuario
WHERE expira_en < DATE_SUB(NOW(), INTERVAL 7 DAY)
   OR revocado_en < DATE_SUB(NOW(), INTERVAL 7 DAY);

-- Depurar proyectos en la papelera hace más de 30 días.
-- IMPORTANTE: antes de ejecutar el DELETE, lee las claves de archivos
-- para borrarlas del almacenamiento de objetos.
SELECT p.id, i.clave_almacenamiento AS clave
FROM proyectos p
JOIN imagenes i ON i.proyecto_id = p.id
WHERE p.eliminado_en < DATE_SUB(NOW(), INTERVAL 30 DAY)
UNION ALL
SELECT p.id, m.clave_glb
FROM proyectos p
JOIN modelos_3d m ON m.proyecto_id = p.id
WHERE p.eliminado_en < DATE_SUB(NOW(), INTERVAL 30 DAY)
UNION ALL
SELECT p.id, m.clave_miniatura
FROM proyectos p
JOIN modelos_3d m ON m.proyecto_id = p.id
WHERE p.eliminado_en < DATE_SUB(NOW(), INTERVAL 30 DAY)
  AND m.clave_miniatura IS NOT NULL;

DELETE FROM proyectos
WHERE eliminado_en < DATE_SUB(NOW(), INTERVAL 30 DAY);
-- Las imágenes, trabajos, modelos, exportaciones y enlaces se eliminan en cascada.

-- Eliminar la cuenta de un usuario (lee y borra sus archivos antes, como arriba)
DELETE FROM usuarios WHERE id = ?;
