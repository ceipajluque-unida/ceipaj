import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { BASE_DATOS, PLANES_SUSCRIPCION, INSTITUCION, COLORES_REEMPLAZADOS } from '../../configuracion/ajustes.js';
import { CLAVES_PLATAFORMA } from '../../configuracion/ambitos.js';
import { PERMISOS, TITULOS_ROL, ROLES_BLOQUEADOS } from '../../configuracion/permisos.js';

const rutaEsquema = new URL('./esquema.sql', import.meta.url);

async function asegurarColumna(conexion, tabla, columna, definicion) {
  const [filas] = await conexion.query(
    'SELECT COUNT(*) AS existe FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [BASE_DATOS.NOMBRE, tabla, columna]
  );
  if (Number(filas[0].existe) === 0) {
    await conexion.query(`ALTER TABLE \`${tabla}\` ADD COLUMN ${columna} ${definicion}`);
    console.log(`columna nueva: ${tabla}.${columna}`);
  }
}

async function aplanarTextosLegales(conexion) {
  const [filas] = await conexion.query(
    "SELECT institucion_id, clave, valor FROM ajustes_sistema WHERE clave IN ('TEXTO_POLITICA', 'TEXTO_TERMINOS', 'TEXTO_AVISO_PRIVACIDAD', 'TEXTO_CONSENTIMIENTO')"
  );
  for (const fila of filas) {
    const plano = String(fila.valor ?? '').replace(/^## /gm, '').replace(/**([^*]+)**/g, '$1');
    if (plano === fila.valor) continue;
    await conexion.query(
      'UPDATE ajustes_sistema SET valor = ? WHERE institucion_id = ? AND clave = ?',
      [plano, fila.institucion_id, fila.clave]
    );
    console.log(`- texto legal "${fila.clave}" pasado a texto plano`);
  }
}

async function asegurarTipo(conexion, tabla, columna, tipoEsperado, definicion) {
  const [filas] = await conexion.query(
    'SELECT COLUMN_TYPE AS tipo FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [BASE_DATOS.NOMBRE, tabla, columna]
  );
  if (filas.length === 0 || filas[0].tipo.toLowerCase() === tipoEsperado) return;
  await conexion.query(`ALTER TABLE \`${tabla}\` MODIFY \`${columna}\` ${definicion}`);
  console.log(`columna ampliada: ${tabla}.${columna} ahora es ${tipoEsperado}`);
}

async function quitarColumna(conexion, tabla, columna) {
  const [filas] = await conexion.query(
    'SELECT COUNT(*) AS existe FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [BASE_DATOS.NOMBRE, tabla, columna]
  );
  if (filas[0].existe === 0) return;
  await conexion.query(`ALTER TABLE \`${tabla}\` DROP COLUMN \`${columna}\``);
  console.log(`columna retirada: ${tabla}.${columna}`);
}

async function asegurarClaveForanea(conexion, tabla, nombre, definicion) {
  const [filas] = await conexion.query(
    'SELECT COUNT(*) AS existe FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?',
    [BASE_DATOS.NOMBRE, tabla, nombre]
  );
  if (filas[0].existe > 0) return;
  const [huerfanos] = await conexion.query(
    'SELECT COUNT(*) AS n FROM usuarios u LEFT JOIN roles r ON r.clave = u.rol WHERE r.clave IS NULL'
  );
  if (huerfanos[0].n > 0) {
    console.log(`no se agrega ${nombre}: hay ${huerfanos[0].n} usuario(s) con un rol que no existe en roles`);
    return;
  }
  await conexion.query(`ALTER TABLE \`${tabla}\` ADD CONSTRAINT \`${nombre}\` ${definicion}`);
  console.log(`clave foranea agregada: ${nombre}`);
}

async function asegurarClavePrimaria(conexion, tabla, columnasEsperadas, definicion) {
  const [filas] = await conexion.query(
    `SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columnas
       FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = 'PRIMARY'`,
    [BASE_DATOS.NOMBRE, tabla]
  );
  if (filas[0]?.columnas === columnasEsperadas) return;
  await conexion.query(`ALTER TABLE \`${tabla}\` DROP PRIMARY KEY, ADD PRIMARY KEY ${definicion}`);
  console.log(`clave primaria nueva: ${tabla} ${definicion}`);
}

async function asegurarUnico(conexion, tabla, nombre, columnas, indiceViejo) {
  const [existe] = await conexion.query(
    `SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columnas
       FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [BASE_DATOS.NOMBRE, tabla, nombre]
  );
  if (existe[0]?.columnas === columnas) return;
  const [viejo] = await conexion.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [BASE_DATOS.NOMBRE, tabla, indiceViejo]
  );
  if (viejo.length > 0) await conexion.query(`ALTER TABLE \`${tabla}\` DROP INDEX \`${indiceViejo}\``);
  await conexion.query(`ALTER TABLE \`${tabla}\` ADD UNIQUE KEY \`${nombre}\` (${columnas})`);
  console.log(`índice único nuevo: ${tabla} (${columnas})`);
}

async function sembrarRoles(conexion) {
  const [filas] = await conexion.query('SELECT clave FROM roles');
  const existentes = new Set(filas.map((f) => f.clave));
  const modulos = Object.keys(PERMISOS);
  for (const [clave, titulo] of Object.entries(TITULOS_ROL)) {
    if (existentes.has(clave)) continue;
    const suyos = modulos.filter((m) => PERMISOS[m].includes(clave));
    await conexion.query(
      'INSERT INTO roles (clave, titulo, modulos, del_sistema, bloqueado, activo) VALUES (?,?,?,1,?,1)',
      [clave, titulo, suyos.join('\n'), ROLES_BLOQUEADOS.includes(clave) ? 1 : 0]
    );
    console.log(`rol sembrado: ${clave} con ${suyos.length} modulos`);
  }
  // el rol comercial se sembro con el nombre viejo; solo se cambia si nadie lo edito
  const [renombrado] = await conexion.query(
    'UPDATE roles SET titulo = ? WHERE clave = ? AND titulo = ?',
    [TITULOS_ROL.comercial, 'comercial', 'Personal administrativo-académico']
  );
  if (renombrado.affectedRows > 0) console.log('rol comercial renombrado a ' + TITULOS_ROL.comercial);
}

async function sembrarInstitucion(conexion) {
  const [[{ total }]] = await conexion.query('SELECT COUNT(*) AS total FROM instituciones');
  if (Number(total) > 0) return;
  const [[{ heredados }]] = await conexion.query(
    'SELECT (SELECT COUNT(*) FROM usuarios) + (SELECT COUNT(*) FROM leads) AS heredados'
  );
  if (Number(heredados) === 0) return;
  const [[ajuste]] = await conexion.query("SELECT valor FROM ajustes_sistema WHERE clave = 'INSTITUCION_NOMBRE' LIMIT 1");
  const [[ciudad]] = await conexion.query("SELECT valor FROM ajustes_sistema WHERE clave = 'INSTITUCION_CIUDAD' LIMIT 1");
  const [resultado] = await conexion.query(
    'INSERT INTO instituciones (nombre, ciudad) VALUES (?, ?)',
    [ajuste?.valor || INSTITUCION.NOMBRE, ciudad?.valor || INSTITUCION.CIUDAD]
  );
  const id = resultado.insertId;
  for (const tabla of ['usuarios', 'leads', 'aliados', 'pagos', 'suscripciones', 'auditoria', 'academico_matriculados']) {
    await conexion.query(`UPDATE \`${tabla}\` SET institucion_id = ? WHERE institucion_id IS NULL`, [id]);
  }

  const marcas = CLAVES_PLATAFORMA.map(() => '?').join(',');
  await conexion.query(
    `UPDATE ajustes_sistema SET institucion_id = ? WHERE institucion_id = 0 AND clave NOT IN (${marcas})`,
    [id, ...CLAVES_PLATAFORMA]
  );
  console.log(`institución "${ajuste?.valor || INSTITUCION.NOMBRE}" creada con id ${id}, datos existentes traspasados`);
}

async function sembrarPlanes(conexion) {
  const [[{ total }]] = await conexion.query('SELECT COUNT(*) AS total FROM planes');
  if (Number(total) === 0) {
    for (const [orden, plan] of PLANES_SUSCRIPCION.entries()) {
      await conexion.query(
        'INSERT INTO planes (clave, titulo, precio, meses, incluye, max_usuarios, max_aliados, modulos_incluidos, orden) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [plan.valor, plan.texto, plan.precio, plan.meses, plan.incluye.join('\n'), plan.maxUsuarios, plan.maxAliados, plan.modulos.join(String.fromCharCode(10)), orden]
      );
    }
    console.log(`planes cargados: ${PLANES_SUSCRIPCION.length}`);
    return;
  }
  for (const [orden, plan] of PLANES_SUSCRIPCION.entries()) {
    const [[{ existe }]] = await conexion.query(
      'SELECT COUNT(*) AS existe FROM planes WHERE clave = ?', [plan.valor]
    );
    if (Number(existe) === 0) {
      await conexion.query(
        'INSERT INTO planes (clave, titulo, precio, meses, incluye, max_usuarios, max_aliados, modulos_incluidos, orden) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [plan.valor, plan.texto, plan.precio, plan.meses, plan.incluye.join(String.fromCharCode(10)),
         plan.maxUsuarios, plan.maxAliados, plan.modulos.join(String.fromCharCode(10)), orden]
      );
      console.log('plan agregado: ' + plan.valor);
      for (const [posicion, otro] of PLANES_SUSCRIPCION.entries()) {
        await conexion.query('UPDATE planes SET orden = ? WHERE clave = ?', [posicion, otro.valor]);
      }
      continue;
    }
    const [resultado] = await conexion.query(
      'UPDATE planes SET max_usuarios = ? WHERE clave = ? AND max_usuarios IS NULL',
      [plan.maxUsuarios, plan.valor]
    );
    if (resultado.changedRows > 0) console.log(`límites completados en el plan ${plan.valor}`);
    if (plan.valor === 'basico') {
      const [ajuste] = await conexion.query(
        'UPDATE planes SET modulos_incluidos = ? WHERE clave = ? AND modulos_incluidos = ?',
        [plan.modulos.join(String.fromCharCode(10)), plan.valor, ['leads', 'seguimiento'].join(String.fromCharCode(10))]
      );
      if (ajuste.affectedRows > 0) console.log('el plan básico suma aliados y portal, que su tope ya suponía');
    }
    const [conModulos] = await conexion.query(
      'UPDATE planes SET modulos_incluidos = ? WHERE clave = ? AND modulos_incluidos IS NULL',
      [plan.modulos.join(String.fromCharCode(10)), plan.valor]
    );
    if (conModulos.affectedRows > 0) console.log(`módulos sembrados en el plan ${plan.valor}`);
    if (plan.maxAliados !== null) {
      await conexion.query(
        'UPDATE planes SET max_aliados = ? WHERE clave = ? AND max_aliados IS NULL',
        [plan.maxAliados, plan.valor]
      );
    }
  }
}

async function emparejarPlanesConTesis(conexion) {
  const preciosViejos = { basico: 250000, estandar: 450000, avanzado: 750000 };
  for (const plan of PLANES_SUSCRIPCION) {
    if (!preciosViejos[plan.valor]) continue;
    const [resultado] = await conexion.query(
      `UPDATE planes SET precio = ?, max_usuarios = ?, max_aliados = ?, incluye = ?
        WHERE clave = ? AND precio = ?`,
      [plan.precio, plan.maxUsuarios, plan.maxAliados, plan.incluye.join('\n'),
       plan.valor, preciosViejos[plan.valor]]
    );
    if (resultado.affectedRows > 0) console.log(`plan ${plan.valor} emparejado con la tabla 19 de la tesis`);
  }
}

// un pago con estado vacio lo dejo guardar una base sin modo estricto. nunca se
// completo y no activo nada, asi que queda como rechazado
async function repararPagosSinEstado(conexion) {
  const [resultado] = await conexion.query(
    `UPDATE pagos SET estado = 'rechazado'
      WHERE estado = '' AND id NOT IN (SELECT pago_id FROM suscripciones WHERE pago_id IS NOT NULL)`
  );
  if (resultado.affectedRows > 0) console.log(`pagos con estado vacío marcados como rechazados: ${resultado.affectedRows}`);
}

async function actualizarColorAcento(conexion) {
  for (const [viejo, nuevo] of Object.entries(COLORES_REEMPLAZADOS)) {
    const [resultado] = await conexion.query(
      'UPDATE ajustes_sistema SET valor = ? WHERE clave = ? AND valor = ?',
      [nuevo, 'COLOR_ACENTO', viejo]
    );
    if (resultado.affectedRows > 0) console.log(`color de acento ${viejo} cambiado por ${nuevo}`);
  }
}

async function borrarAjustesRetirados(conexion) {
  const [resultado] = await conexion.query(
    'DELETE FROM ajustes_sistema WHERE clave IN (?)',
    [['PAGOPAR_TIPO_PEDIDO']]
  );
  if (resultado.affectedRows > 0) console.log(`${resultado.affectedRows} ajuste(s) retirado(s) del sistema`);
}

async function migrar() {
  const conexion = await mysql.createConnection({
    host: BASE_DATOS.HOST,
    port: BASE_DATOS.PUERTO,
    user: BASE_DATOS.USUARIO,
    password: BASE_DATOS.CLAVE,
    multipleStatements: true,
  });

  await conexion.query(
    `CREATE DATABASE IF NOT EXISTS \`${BASE_DATOS.NOMBRE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci`
  );
  await conexion.changeUser({ database: BASE_DATOS.NOMBRE });
  await conexion.query(await readFile(rutaEsquema, 'utf8'));

  await asegurarColumna(conexion, 'usuarios', 'debe_cambiar_clave', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER activado_2fa');
  await asegurarColumna(conexion, 'usuarios', 'telefono', "VARCHAR(30) NULL AFTER rol");
  await asegurarColumna(conexion, 'usuarios', 'direccion', "VARCHAR(150) NULL AFTER telefono");
  await asegurarColumna(conexion, 'usuarios', 'metodo_2fa', "VARCHAR(10) NOT NULL DEFAULT 'app' AFTER telefono");
  await asegurarColumna(conexion, 'usuarios', 'clave_actualizada_en', 'DATETIME NULL AFTER debe_cambiar_clave');
  await asegurarColumna(conexion, 'usuarios', 'sesion_version', 'INT UNSIGNED NOT NULL DEFAULT 0 AFTER clave_actualizada_en');
  await asegurarColumna(conexion, 'usuarios', 'actualizado_en', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER creado_en');
  await asegurarColumna(conexion, 'pagos', 'medio_pago', 'VARCHAR(20) NULL AFTER proveedor');
  await asegurarColumna(conexion, 'pagos', 'recibo_emitido_en', 'DATETIME NULL');
  await asegurarColumna(conexion, 'comisiones', 'recibo_emitido_en', 'DATETIME NULL');
  await asegurarColumna(conexion, 'pagos', 'plan', 'VARCHAR(20) NULL AFTER medio_pago');
  await asegurarColumna(conexion, 'pagos', 'identificador_externo', 'VARCHAR(120) NULL AFTER plan');
  await asegurarColumna(conexion, 'pagos', 'url_pago', 'VARCHAR(300) NULL AFTER identificador_externo');
  await asegurarColumna(conexion, 'pagos', 'fecha_pago', 'DATETIME NULL AFTER url_pago');
  await asegurarColumna(conexion, 'pagos', 'forma_pago_externa', 'VARCHAR(80) NULL AFTER fecha_pago');
  await asegurarColumna(conexion, 'pagos', 'comprobante_externo', 'VARCHAR(60) NULL AFTER forma_pago_externa');
  await asegurarColumna(conexion, 'pagos', 'pagador_nombre', 'VARCHAR(160) NULL AFTER comprobante_externo');
  await asegurarColumna(conexion, 'pagos', 'pagador_documento', 'VARCHAR(30) NULL AFTER pagador_nombre');
  await asegurarColumna(conexion, 'aliados', 'cargo', 'VARCHAR(20) NULL AFTER institucion');
  await asegurarColumna(conexion, 'leads', 'consentimiento_fecha', 'DATETIME NULL AFTER consentimiento_datos');
  await asegurarColumna(conexion, 'leads', 'consentimiento_version', 'VARCHAR(10) NULL AFTER consentimiento_fecha');
  await asegurarColumna(conexion, 'leads', 'consentimiento_revocado_en', 'DATETIME NULL AFTER consentimiento_version');
  await asegurarColumna(conexion, 'leads', 'activo', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER consentimiento_revocado_en');
  await asegurarColumna(conexion, 'leads', 'motivo_baja', 'VARCHAR(200) NULL AFTER activo');
  await asegurarColumna(conexion, 'suscripciones', 'cancelada_en', 'DATETIME NULL AFTER pago_id');
  await asegurarColumna(conexion, 'planes', 'max_usuarios', 'INT UNSIGNED NULL AFTER incluye');
  await asegurarColumna(conexion, 'planes', 'max_aliados', 'INT UNSIGNED NULL AFTER max_usuarios');
  await asegurarColumna(conexion, 'planes', 'modulos_incluidos', 'TEXT NULL AFTER max_aliados');
  await asegurarColumna(conexion, 'usuarios', 'sin_2fa', "TINYINT(1) NOT NULL DEFAULT 0 AFTER activado_2fa");
  await asegurarColumna(conexion, 'suscripciones', 'motivo_cierre', 'VARCHAR(20) NULL AFTER cancelada_en');

  await conexion.query(
    "UPDATE suscripciones SET motivo_cierre = 'vencimiento' "
    + "WHERE motivo_cierre = 'baja' AND baja_en IS NULL "
    + "  AND (cancelada_en IS NULL OR fecha_fin > cancelada_en)"
  );

  await conexion.query(
    `UPDATE suscripciones SET motivo_cierre = CASE
       WHEN cancelada_en IS NOT NULL AND fecha_fin <= cancelada_en THEN 'baja'
       ELSE 'vencimiento' END
      WHERE estado <> 'activa' AND motivo_cierre IS NULL`
  );

  await asegurarColumna(conexion, 'suscripciones', 'baja_en', 'DATETIME NULL AFTER motivo_cierre');
  await asegurarColumna(conexion, 'suscripciones', 'baja_por', 'INT UNSIGNED NULL AFTER baja_en');
  await asegurarColumna(conexion, 'suscripciones', 'motivo_baja', 'VARCHAR(200) NULL AFTER baja_por');

  await conexion.query(
    `UPDATE suscripciones s
        JOIN (SELECT CAST(TRIM(TRAILING ':' FROM SUBSTRING_INDEX(SUBSTRING_INDEX(detalle, ' ', 2), ' ', -1))
                       AS UNSIGNED) AS suscripcion_id,
                     MIN(fecha) AS fecha, MIN(usuario_id) AS usuario_id,
                     SUBSTRING_INDEX(detalle, ': ', -1) AS motivo
                FROM auditoria WHERE accion = 'suscripcion_dada_de_baja'
               GROUP BY suscripcion_id, motivo) a ON a.suscripcion_id = s.id
         SET s.baja_en = a.fecha, s.baja_por = a.usuario_id, s.motivo_baja = LEFT(a.motivo, 200)
       WHERE s.motivo_cierre = 'baja' AND s.motivo_baja IS NULL`
  );

  await asegurarTipo(conexion, 'ajustes_sistema', 'valor', 'mediumtext', 'MEDIUMTEXT NULL');

  await asegurarTipo(conexion, 'auditoria', 'detalle', 'text', 'TEXT NULL');

  await asegurarTipo(conexion, 'pagos', 'plan', 'varchar(30)', 'VARCHAR(30) NULL');
  await asegurarTipo(conexion, 'suscripciones', 'plan', 'varchar(30)', 'VARCHAR(30) NOT NULL');

  for (const tabla of ['usuarios', 'leads', 'aliados', 'pagos', 'suscripciones', 'auditoria', 'academico_matriculados']) {
    await asegurarColumna(conexion, tabla, 'institucion_id', 'INT UNSIGNED NULL');
  }

  await asegurarColumna(conexion, 'ajustes_sistema', 'institucion_id', 'INT UNSIGNED NOT NULL DEFAULT 0');
  await asegurarClavePrimaria(conexion, 'ajustes_sistema', 'institucion_id,clave', '(institucion_id, clave)');

  await sembrarInstitucion(conexion);

  await asegurarUnico(conexion, 'leads', 'uk_leads_institucion_cedula', 'institucion_id,cedula', 'cedula');
  await asegurarUnico(conexion, 'academico_matriculados', 'uk_matriculados_institucion_cedula', 'institucion_id,cedula', 'cedula');
  await sembrarPlanes(conexion);
  await emparejarPlanesConTesis(conexion);
  await actualizarColorAcento(conexion);
  await aplanarTextosLegales(conexion);
  await asegurarTipo(conexion, 'usuarios', 'rol', 'varchar(30)', "VARCHAR(30) NOT NULL DEFAULT 'comercial'");
  await sembrarRoles(conexion);
  await asegurarClaveForanea(conexion, 'usuarios', 'fk_usuarios_rol',
    'FOREIGN KEY (rol) REFERENCES roles (clave) ON UPDATE CASCADE');
  await borrarAjustesRetirados(conexion);
  await repararPagosSinEstado(conexion);

  await conexion.end();
  console.log(`base "${BASE_DATOS.NOMBRE}" lista con todas las tablas del sistema.`);
}

migrar().catch((error) => {
  console.error('error al migrar:', error.message);
  process.exit(1);
});
