-- =====================================================================
-- Alzado · Esquema de base de datos (MySQL 8 · InnoDB · utf8mb4)
-- =====================================================================
-- En Clever Cloud la base de datos ya viene creada con el add-on:
-- ejecuta este script directamente sobre ella (no incluye CREATE DATABASE).
-- Orden: tablas padre primero, tablas hijas después.
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- usuarios
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre           VARCHAR(100)    NOT NULL,
  email            VARCHAR(190)    NOT NULL,
  password_hash    VARCHAR(255)    NOT NULL,
  rol              ENUM('usuario','admin') NOT NULL DEFAULT 'usuario',
  avatar_clave     VARCHAR(500)    NULL,
  activo           TINYINT(1)      NOT NULL DEFAULT 1,
  creado_en        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- tokens_usuario: refresco de sesión, recuperación de contraseña,
-- verificación de correo. Se guarda siempre el hash SHA-256 del token.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tokens_usuario (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id   BIGINT UNSIGNED NOT NULL,
  tipo         ENUM('refresco','recuperacion','verificacion_email') NOT NULL,
  token_hash   CHAR(64)        NOT NULL,
  expira_en    DATETIME        NOT NULL,
  usado_en     DATETIME        NULL,
  revocado_en  DATETIME        NULL,
  creado_en    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tokens_hash (token_hash),
  KEY idx_tokens_usuario_tipo (usuario_id, tipo),
  KEY idx_tokens_expira (expira_en),
  CONSTRAINT fk_tokens_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- suscripciones_push: Web Push por dispositivo
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suscripciones_push (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id     BIGINT UNSIGNED NOT NULL,
  endpoint_hash  CHAR(64)        NOT NULL,
  endpoint       TEXT            NOT NULL,
  p256dh         VARCHAR(255)    NOT NULL,
  auth           VARCHAR(255)    NOT NULL,
  creado_en      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_push_endpoint (endpoint_hash),
  KEY idx_push_usuario (usuario_id),
  CONSTRAINT fk_push_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- proyectos (borrado lógico con eliminado_en)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proyectos (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id      BIGINT UNSIGNED NOT NULL,
  nombre          VARCHAR(150)    NOT NULL,
  descripcion     TEXT            NULL,
  estado          ENUM('activo','archivado') NOT NULL DEFAULT 'activo',
  eliminado_en    DATETIME        NULL,
  creado_en       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_proyectos_usuario (usuario_id, eliminado_en, actualizado_en),
  FULLTEXT KEY ft_proyectos_busqueda (nombre, descripcion),
  CONSTRAINT fk_proyectos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- imagenes: metadatos; el archivo vive en el almacenamiento de objetos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS imagenes (
  id                    BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  proyecto_id           BIGINT UNSIGNED   NOT NULL,
  nombre_original       VARCHAR(255)      NOT NULL,
  clave_almacenamiento  VARCHAR(500)      NOT NULL,
  mime_type             VARCHAR(50)       NOT NULL,
  tamano_bytes          INT UNSIGNED      NOT NULL,
  ancho_px              SMALLINT UNSIGNED NULL,
  alto_px               SMALLINT UNSIGNED NULL,
  hash_sha256           CHAR(64)          NULL,
  creado_en             DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_imagenes_proyecto (proyecto_id),
  KEY idx_imagenes_hash (hash_sha256),
  CONSTRAINT fk_imagenes_proyecto
    FOREIGN KEY (proyecto_id) REFERENCES proyectos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- metodos_conversion: catálogo
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metodos_conversion (
  id                      TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo                  VARCHAR(30)      NOT NULL,
  nombre                  VARCHAR(80)      NOT NULL,
  descripcion             VARCHAR(255)     NOT NULL,
  requiere_ia             TINYINT(1)       NOT NULL DEFAULT 0,
  activo                  TINYINT(1)       NOT NULL DEFAULT 1,
  parametros_por_defecto  JSON             NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_metodos_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- trabajos_conversion: cola e historial de conversiones
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trabajos_conversion (
  id             BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  imagen_id      BIGINT UNSIGNED  NOT NULL,
  metodo_id      TINYINT UNSIGNED NOT NULL,
  usuario_id     BIGINT UNSIGNED  NOT NULL,
  estado         ENUM('pendiente','procesando','completado','fallido','cancelado')
                 NOT NULL DEFAULT 'pendiente',
  progreso       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  parametros     JSON             NULL,
  proveedor      VARCHAR(50)      NULL,
  id_externo     VARCHAR(120)     NULL,
  mensaje_error  VARCHAR(500)     NULL,
  intentos       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  creado_en      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  iniciado_en    DATETIME         NULL,
  finalizado_en  DATETIME         NULL,
  PRIMARY KEY (id),
  KEY idx_trabajos_cola (estado, creado_en),
  KEY idx_trabajos_usuario (usuario_id, estado),
  KEY idx_trabajos_imagen (imagen_id),
  KEY idx_trabajos_metodo (metodo_id, estado),
  CONSTRAINT fk_trabajos_imagen
    FOREIGN KEY (imagen_id)  REFERENCES imagenes (id)           ON DELETE CASCADE,
  CONSTRAINT fk_trabajos_metodo
    FOREIGN KEY (metodo_id)  REFERENCES metodos_conversion (id) ON DELETE RESTRICT,
  CONSTRAINT fk_trabajos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)           ON DELETE CASCADE,
  CONSTRAINT chk_trabajos_progreso CHECK (progreso <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- modelos_3d: resultado de un trabajo (1 trabajo -> 0..1 modelo)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS modelos_3d (
  id               BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  proyecto_id      BIGINT UNSIGNED   NOT NULL,
  trabajo_id       BIGINT UNSIGNED   NOT NULL,
  nombre           VARCHAR(150)      NOT NULL,
  version          SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  es_principal     TINYINT(1)        NOT NULL DEFAULT 0,
  clave_glb        VARCHAR(500)      NOT NULL,
  clave_miniatura  VARCHAR(500)      NULL,
  tamano_bytes     INT UNSIGNED      NULL,
  num_vertices     INT UNSIGNED      NULL,
  num_caras        INT UNSIGNED      NULL,
  eliminado_en     DATETIME          NULL,
  creado_en        DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_modelos_trabajo (trabajo_id),
  KEY idx_modelos_proyecto (proyecto_id, eliminado_en, creado_en),
  CONSTRAINT fk_modelos_proyecto
    FOREIGN KEY (proyecto_id) REFERENCES proyectos (id)           ON DELETE CASCADE,
  CONSTRAINT fk_modelos_trabajo
    FOREIGN KEY (trabajo_id)  REFERENCES trabajos_conversion (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- exportaciones: historial de descargas por formato
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exportaciones (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  modelo_id   BIGINT UNSIGNED NOT NULL,
  usuario_id  BIGINT UNSIGNED NOT NULL,
  formato     ENUM('glb','obj','stl') NOT NULL,
  creado_en   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_export_modelo (modelo_id),
  KEY idx_export_usuario (usuario_id, creado_en),
  CONSTRAINT fk_export_modelo
    FOREIGN KEY (modelo_id)  REFERENCES modelos_3d (id) ON DELETE CASCADE,
  CONSTRAINT fk_export_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- enlaces_compartidos: enlaces públicos de solo lectura
-- token = 64 caracteres hexadecimales (32 bytes aleatorios = 256 bits)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enlaces_compartidos (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  modelo_id    BIGINT UNSIGNED NOT NULL,
  creado_por   BIGINT UNSIGNED NOT NULL,
  token        CHAR(64)        NOT NULL,
  expira_en    DATETIME        NULL,
  revocado_en  DATETIME        NULL,
  visitas      INT UNSIGNED    NOT NULL DEFAULT 0,
  creado_en    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_enlaces_token (token),
  KEY idx_enlaces_modelo (modelo_id),
  KEY idx_enlaces_creador (creado_por),
  CONSTRAINT fk_enlaces_modelo
    FOREIGN KEY (modelo_id)  REFERENCES modelos_3d (id) ON DELETE CASCADE,
  CONSTRAINT fk_enlaces_creador
    FOREIGN KEY (creado_por) REFERENCES usuarios (id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- Datos iniciales: catálogo de métodos de conversión
-- ---------------------------------------------------------------------
INSERT INTO metodos_conversion (codigo, nombre, descripcion, requiere_ia, activo, parametros_por_defecto)
VALUES
  ('relieve',   'Relieve por profundidad',
   'Convierte la imagen en una lámina con relieve a partir de un mapa de profundidad.',
   1, 1, JSON_OBJECT('profundidad', 0.5, 'resolucion', 256, 'suavizado', 2)),
  ('objeto_ia', 'Objeto completo con IA',
   'Genera un objeto 3D completo a partir de una sola foto usando un servicio de IA.',
   1, 1, JSON_OBJECT('calidad', 'media', 'textura', true)),
  ('extrusion', 'Extrusión de silueta',
   'Da volumen a logos y dibujos de contornos claros extruyendo su silueta.',
   0, 1, JSON_OBJECT('grosor', 0.2, 'umbral', 128, 'bisel', 0.02))
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  descripcion = VALUES(descripcion);
