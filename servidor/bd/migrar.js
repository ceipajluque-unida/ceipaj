// crea la base, aplica esquema.sql y ajusta columnas nuevas. se corre con npm run migrar
import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { BASE_DATOS, PLANES_SUSCRIPCION, INSTITUCION } from '../../configuracion/ajustes.js';
import { CLAVES_PLATAFORMA } from '../../configuracion/ambitos.js';

const rutaEsquema = new URL('./esquema.sql', import.meta.url);

// agrega una columna solo si falta, así la migración se puede correr mil veces
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

// cambia el tipo de una columna que ya existe. hace falta aparte de asegurarColumna
// porque el esquema usa CREATE TABLE IF NOT EXISTS: en una base ya creada el tipo viejo queda.
// tipoEsperado se compara contra COLUMN_TYPE, que trae el largo ('varchar(30)'),
// porque DATA_TYPE a secas no distingue un varchar(20) de un varchar(30)
async function asegurarTipo(conexion, tabla, columna, tipoEsperado, definicion) {
  const [filas] = await conexion.query(
    'SELECT COLUMN_TYPE AS tipo FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [BASE_DATOS.NOMBRE, tabla, columna]
  );
  if (filas.length === 0 || filas[0].tipo.toLowerCase() === tipoEsperado) return;
  await conexion.query(`ALTER TABLE \`${tabla}\` MODIFY \`${columna}\` ${definicion}`);
  console.log(`columna ampliada: ${tabla}.${columna} → ${tipoEsperado}`);
}

// cambia la clave primaria solo si todavía no es la esperada
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

// reemplaza un índice único viejo por uno compuesto con la institución
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

// la institución del sistema pasa a ser una fila, y todo lo que ya existía es de ella.
// antes era un texto en los ajustes, así que sin este traspaso los datos quedarían huérfanos.
async function sembrarInstitucion(conexion) {
  const [[{ total }]] = await conexion.query('SELECT COUNT(*) AS total FROM instituciones');
  if (Number(total) > 0) return;
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
  // los ajustes que ya estaban eran de la única institución que había, salvo los que
  // ahora son del proveedor: esos se quedan en 0 y siguen valiendo para todas
  const marcas = CLAVES_PLATAFORMA.map(() => '?').join(',');
  await conexion.query(
    `UPDATE ajustes_sistema SET institucion_id = ? WHERE institucion_id = 0 AND clave NOT IN (${marcas})`,
    [id, ...CLAVES_PLATAFORMA]
  );
  console.log(`institución "${ajuste?.valor || INSTITUCION.NOMBRE}" creada con id ${id}, datos existentes traspasados`);
}

// los tres planes de siempre entran una sola vez; después se editan desde el sistema.
// aparte se completan los límites de los que ya existían: las dos columnas se agregaron
// después, así que en una base vieja quedaron en NULL y el candado por plan no trababa
// nada. se tocan solo si las dos siguen sin valor, para no pisar lo que se haya editado
// (el avanzado guarda cadena vacía, que significa "todos los módulos", y ya no es NULL).
async function sembrarPlanes(conexion) {
  const [[{ total }]] = await conexion.query('SELECT COUNT(*) AS total FROM planes');
  if (Number(total) === 0) {
    for (const [orden, plan] of PLANES_SUSCRIPCION.entries()) {
      await conexion.query(
        'INSERT INTO planes (clave, titulo, precio, meses, incluye, max_usuarios, modulos_incluidos, orden) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [plan.valor, plan.texto, plan.precio, plan.meses, plan.incluye.join('\n'), plan.maxUsuarios, plan.modulos.join('\n'), orden]
      );
    }
    console.log(`planes cargados: ${PLANES_SUSCRIPCION.length}`);
    return;
  }
  for (const plan of PLANES_SUSCRIPCION) {
    const [resultado] = await conexion.query(
      `UPDATE planes SET max_usuarios = ?, modulos_incluidos = ?
        WHERE clave = ? AND max_usuarios IS NULL AND modulos_incluidos IS NULL`,
      [plan.maxUsuarios, plan.modulos.join('\n'), plan.valor]
    );
    if (resultado.affectedRows > 0) console.log(`límites completados en el plan ${plan.valor}`);
  }
}

async function migrar() {
  // sin base seleccionada porque primero hay que poder crearla
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

  // ajustes sobre tablas que ya existían antes de estos cambios
  await asegurarColumna(conexion, 'usuarios', 'debe_cambiar_clave', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER activado_2fa');
  await asegurarColumna(conexion, 'usuarios', 'telefono', "VARCHAR(30) NULL AFTER rol");
  await asegurarColumna(conexion, 'usuarios', 'direccion', "VARCHAR(150) NULL AFTER telefono");
  await asegurarColumna(conexion, 'usuarios', 'metodo_2fa', "VARCHAR(10) NOT NULL DEFAULT 'app' AFTER telefono");
  await asegurarColumna(conexion, 'usuarios', 'clave_actualizada_en', 'DATETIME NULL AFTER debe_cambiar_clave');
  await asegurarColumna(conexion, 'usuarios', 'sesion_version', 'INT UNSIGNED NOT NULL DEFAULT 0 AFTER clave_actualizada_en');
  await asegurarColumna(conexion, 'usuarios', 'actualizado_en', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER creado_en');
  await asegurarColumna(conexion, 'pagos', 'medio_pago', 'VARCHAR(20) NULL AFTER proveedor');
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
  await asegurarColumna(conexion, 'planes', 'max_usuarios', 'INT UNSIGNED NULL AFTER incluye');
  await asegurarColumna(conexion, 'planes', 'modulos_incluidos', 'TEXT NULL AFTER max_usuarios');

  // los textos legales pasan los 5.000 caracteres y la columna nació con 255:
  // sin modo estricto mysql los cortaba en silencio al guardarlos
  await asegurarTipo(conexion, 'ajustes_sistema', 'valor', 'mediumtext', 'MEDIUMTEXT NULL');
  // el rol del proveedor: sin este alter, en una base ya creada el insert corta con
  // "data truncated for column rol"
  await asegurarTipo(conexion, 'usuarios', 'rol',
    "enum('administrador','comercial','direccion','aliado','superadministrador')",
    "ENUM('administrador','comercial','direccion','aliado','superadministrador') NOT NULL");
  // planes.clave es VARCHAR(30) y estas dos la referencian: si quedan más cortas, se trunca
  await asegurarTipo(conexion, 'pagos', 'plan', 'varchar(30)', 'VARCHAR(30) NULL');
  await asegurarTipo(conexion, 'suscripciones', 'plan', 'varchar(30)', 'VARCHAR(30) NOT NULL');

  // multi-institución: cada dato operativo pasa a pertenecer a una institución.
  // en usuarios va NULL para el superadministrador, que es del proveedor y no
  // pertenece a ninguna.
  for (const tabla of ['usuarios', 'leads', 'aliados', 'pagos', 'suscripciones', 'auditoria', 'academico_matriculados']) {
    await asegurarColumna(conexion, tabla, 'institucion_id', 'INT UNSIGNED NULL');
  }
  // en los ajustes el 0 significa "de la plataforma", así el mismo mecanismo sirve
  // para lo que fija el proveedor y para lo que configura cada institución
  await asegurarColumna(conexion, 'ajustes_sistema', 'institucion_id', 'INT UNSIGNED NOT NULL DEFAULT 0');
  await asegurarClavePrimaria(conexion, 'ajustes_sistema', 'institucion_id,clave', '(institucion_id, clave)');

  await sembrarInstitucion(conexion);
  // la cédula identifica a la persona DENTRO de su institución: con el único global, dos
  // colegios no podían tener al mismo interesado y el segundo choca con "ya existe"
  await asegurarUnico(conexion, 'leads', 'uk_leads_institucion_cedula', 'institucion_id,cedula', 'cedula');
  await asegurarUnico(conexion, 'academico_matriculados', 'uk_matriculados_institucion_cedula', 'institucion_id,cedula', 'cedula');
  await sembrarPlanes(conexion);

  await conexion.end();
  console.log(`base "${BASE_DATOS.NOMBRE}" lista con todas las tablas del sistema.`);
}

migrar().catch((error) => {
  console.error('error al migrar:', error.message);
  process.exit(1);
});
