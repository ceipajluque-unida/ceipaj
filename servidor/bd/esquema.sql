-- esquema completo del sistema, idempotente. se aplica con npm run migrar

-- usuarios internos y aliados. la clave siempre va con hash bcrypt.
CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  correo VARCHAR(150) NOT NULL UNIQUE,
  clave_hash VARCHAR(100) NOT NULL,
  -- superadministrador es la cuenta del proveedor del servicio; va al final de la lista
  -- porque mysql guarda el enum por índice y agregar en el medio renumera las filas
  rol ENUM('administrador','comercial','direccion','aliado','superadministrador') NOT NULL,
  telefono VARCHAR(30) NULL, -- celular; también sirve para el 2fa por sms
  direccion VARCHAR(150) NULL,
  -- puede ser 'app', 'email' o 'sms'
  metodo_2fa VARCHAR(10) NOT NULL DEFAULT 'app',
  -- el secreto de la app se guarda al crear el usuario y queda activo con el primer código válido
  secreto_2fa VARCHAR(64) NULL,
  activado_2fa TINYINT(1) NOT NULL DEFAULT 0,
  -- las claves temporales que genera el sistema obligan a cambiarla en el primer ingreso
  debe_cambiar_clave TINYINT(1) NOT NULL DEFAULT 0,
  clave_actualizada_en DATETIME NULL, -- para la vigencia de la contraseña (si se activa)
  -- al salir o restablecer la clave se incrementa y los tokens viejos dejan de valer
  sesion_version INT UNSIGNED NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  institucion_id INT UNSIGNED NULL, -- null solo para el superadministrador
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- enlaces de recuperación de contraseña. se guarda el hash del token, nunca el
-- token en claro; vence rápido y es de un solo uso.
CREATE TABLE IF NOT EXISTS tokens_recuperacion (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL, -- sha-256 del token que viaja en el enlace
  vence DATETIME NOT NULL,
  usado TINYINT(1) NOT NULL DEFAULT 0,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recuperacion_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- equipos donde el usuario eligió no volver a escribir el código cada vez.
-- se guarda solo el hash del token, igual que en la recuperación de contraseña.
CREATE TABLE IF NOT EXISTS dispositivos_confianza (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  vence DATETIME NOT NULL,
  ultimo_uso DATETIME NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dispositivo_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- quién hizo qué, cuándo y desde qué ip. respalda la trazabilidad que piden
-- la ley 4439 de delitos informáticos y la 7593 de protección de datos.
CREATE TABLE IF NOT EXISTS auditoria (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NULL,
  accion VARCHAR(80) NOT NULL,
  detalle TEXT NULL,
  direccion_ip VARCHAR(45) NULL,
  institucion_id INT UNSIGNED NULL, -- null: acción del proveedor o sin sesión
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- instituciones cliente de la plataforma. las da de alta el superadministrador y cada
-- una tiene sus propios usuarios, interesados, aliados, ajustes y suscripción.
CREATE TABLE IF NOT EXISTS instituciones (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  ciudad VARCHAR(100) NULL,
  correo_contacto VARCHAR(150) NULL,
  telefono VARCHAR(30) NULL,
  direccion VARCHAR(200) NULL,
  imagen_fondo VARCHAR(200) NULL, -- fondo del ingreso, dentro de subidas/instituciones
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- datos extra del aliado institucional. la cuenta en sí vive en usuarios.
CREATE TABLE IF NOT EXISTS aliados (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL UNIQUE,
  institucion VARCHAR(150) NOT NULL,
  cargo VARCHAR(20) NULL, -- docente o directivo, como los distingue el rf12
  telefono VARCHAR(30) NULL,
  institucion_id INT UNSIGNED NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_aliados_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- interesados / potenciales estudiantes. la cédula identifica al lead para la
-- conversión y el consentimiento lo exige la ley 7593 de protección de datos.
CREATE TABLE IF NOT EXISTS leads (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  cedula VARCHAR(10) NOT NULL, -- única dentro de su institución, no en todo el sistema
  telefono VARCHAR(30) NULL,
  correo VARCHAR(150) NULL,
  canal VARCHAR(40) NOT NULL,
  estado ENUM('nuevo','interesado','matriculado','perdido') NOT NULL DEFAULT 'nuevo',
  aliado_id INT UNSIGNED NULL,
  consentimiento_datos TINYINT(1) NOT NULL DEFAULT 0,
  consentimiento_fecha DATETIME NULL,
  consentimiento_version VARCHAR(10) NULL, -- contra qué versión de los textos se aceptó
  consentimiento_revocado_en DATETIME NULL, -- la ley 7593 deja revocarlo
  activo TINYINT(1) NOT NULL DEFAULT 1, -- baja lógica: no se borra para no romper el historial
  motivo_baja VARCHAR(200) NULL,
  institucion_id INT UNSIGNED NULL,
  fecha_conversion DATETIME NULL,
  creado_por INT UNSIGNED NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- la cédula identifica a la persona dentro de su institución: dos colegios distintos
  -- pueden tener al mismo interesado y no tienen por qué saberlo
  UNIQUE KEY uk_leads_institucion_cedula (institucion_id, cedula),
  CONSTRAINT fk_leads_aliado FOREIGN KEY (aliado_id) REFERENCES aliados (id),
  CONSTRAINT fk_leads_usuario FOREIGN KEY (creado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- contactos con el interesado durante la captación
CREATE TABLE IF NOT EXISTS interacciones (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lead_id INT UNSIGNED NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  tipo VARCHAR(30) NOT NULL,
  detalle VARCHAR(500) NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_interacciones_lead FOREIGN KEY (lead_id) REFERENCES leads (id),
  CONSTRAINT fk_interacciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- acompañamiento a estudiantes ya matriculados. va aparte de interacciones porque
-- captación y fidelización son procesos distintos.
CREATE TABLE IF NOT EXISTS acciones_seguimiento (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lead_id INT UNSIGNED NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  tipo VARCHAR(30) NOT NULL,
  detalle VARCHAR(500) NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_acciones_lead FOREIGN KEY (lead_id) REFERENCES leads (id),
  CONSTRAINT fk_acciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- una comisión del aliado por cada lead recomendado que se matricula
CREATE TABLE IF NOT EXISTS comisiones (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  aliado_id INT UNSIGNED NOT NULL,
  lead_id INT UNSIGNED NOT NULL UNIQUE,
  monto DECIMAL(12,0) NOT NULL,
  estado ENUM('pendiente','pagada') NOT NULL DEFAULT 'pendiente',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_comisiones_aliado FOREIGN KEY (aliado_id) REFERENCES aliados (id),
  CONSTRAINT fk_comisiones_lead FOREIGN KEY (lead_id) REFERENCES leads (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- cobros por el uso de la plataforma vía pasarela externa
CREATE TABLE IF NOT EXISTS pagos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  referencia VARCHAR(60) NOT NULL UNIQUE,
  concepto VARCHAR(200) NOT NULL,
  monto DECIMAL(12,0) NOT NULL,
  moneda CHAR(3) NOT NULL DEFAULT 'PYG',
  estado ENUM('pendiente','exitoso','rechazado') NOT NULL DEFAULT 'pendiente',
  proveedor VARCHAR(30) NOT NULL,
  medio_pago VARCHAR(20) NULL, -- tarjeta, transferencia, depósito, billetera…
  plan VARCHAR(30) NULL, -- plan de suscripción que se está pagando; entra igual que planes.clave
  identificador_externo VARCHAR(120) NULL, -- hash del pedido en la pasarela
  url_pago VARCHAR(300) NULL, -- checkout al que se manda al usuario
  fecha_pago DATETIME NULL, -- cuándo se acreditó, va en el recibo
  forma_pago_externa VARCHAR(80) NULL, -- con qué pagó de verdad, según la pasarela
  comprobante_externo VARCHAR(60) NULL, -- número de comprobante que informa la pasarela
  pagador_nombre VARCHAR(160) NULL,
  pagador_documento VARCHAR(30) NULL,
  institucion_id INT UNSIGNED NULL,
  creado_por INT UNSIGNED NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pagos_usuario FOREIGN KEY (creado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- suscripciones de la institución a la plataforma. cada pago exitoso de un plan
-- abre un período nuevo, por eso se guarda el historial y no un único registro.
CREATE TABLE IF NOT EXISTS suscripciones (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan VARCHAR(30) NOT NULL, -- mismo largo que planes.clave
  estado ENUM('activa','vencida','cancelada') NOT NULL DEFAULT 'activa',
  monto DECIMAL(12,0) NOT NULL,
  fecha_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_fin DATETIME NOT NULL,
  pago_id INT UNSIGNED NULL UNIQUE, -- un pago no puede abrir dos suscripciones
  -- cancelar no corta el servicio: no hay reembolso, así que el período contratado se
  -- respeta hasta su fecha de fin y lo único que se pierde es la renovación
  cancelada_en DATETIME NULL,
  institucion_id INT UNSIGNED NULL,
  creado_por INT UNSIGNED NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_suscripciones_pago FOREIGN KEY (pago_id) REFERENCES pagos (id),
  CONSTRAINT fk_suscripciones_usuario FOREIGN KEY (creado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- ajustes del sistema editables por el administrador desde la pantalla de
-- configuración (2fa, smtp, sms, reglas de negocio…). los valores por defecto
-- viven en configuracion/ajustes.js; acá solo se guardan los que se cambian.
CREATE TABLE IF NOT EXISTS ajustes_sistema (
  institucion_id INT UNSIGNED NOT NULL DEFAULT 0, -- 0 = de la plataforma
  clave VARCHAR(50) NOT NULL,
  valor MEDIUMTEXT NULL, -- los textos legales pasan los 5.000 caracteres
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (institucion_id, clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- matriculados que llegan del sistema académico. hoy se cargan importando una
-- planilla csv y mañana los va a traer la api, pero la conversión los lee igual.
CREATE TABLE IF NOT EXISTS academico_matriculados (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cedula VARCHAR(10) NOT NULL, -- única dentro de su institución
  nombre VARCHAR(100) NOT NULL,
  fecha_inscripcion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  origen VARCHAR(20) NOT NULL DEFAULT 'csv',
  institucion_id INT UNSIGNED NULL,
  importado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_matriculados_institucion_cedula (institucion_id, cedula)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- planes de suscripción, editables por el administrador
CREATE TABLE IF NOT EXISTS planes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clave VARCHAR(30) NOT NULL UNIQUE, -- lo que se guarda en pagos.plan y suscripciones.plan
  titulo VARCHAR(80) NOT NULL,
  descripcion VARCHAR(300) NULL,
  precio DECIMAL(12,0) NOT NULL,
  meses TINYINT UNSIGNED NOT NULL DEFAULT 1,
  incluye TEXT NULL, -- una línea por punto
  max_usuarios INT UNSIGNED NULL, -- cuántos usuarios internos admite; nulo es sin tope
  modulos_incluidos TEXT NULL, -- una clave de módulo por línea; vacío es todos
  imagen VARCHAR(200) NULL, -- archivo subido, dentro de subidas/planes
  activo TINYINT(1) NOT NULL DEFAULT 1,
  orden TINYINT UNSIGNED NOT NULL DEFAULT 0,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
