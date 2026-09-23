import mysql from 'mysql2/promise';
import { BASE_DATOS } from '../../configuracion/ajustes.js';

export const bd = mysql.createPool({
  host: BASE_DATOS.HOST,
  port: BASE_DATOS.PUERTO,
  user: BASE_DATOS.USUARIO,
  password: BASE_DATOS.CLAVE,
  database: BASE_DATOS.NOMBRE,
  waitForConnections: true,
  connectionLimit: 10,
});

// el mariadb de xampp guarda en silencio un valor invalido (asi quedo un pago con
// estado vacio); el mysql del servidor lo rechaza. con esto los dos se comportan igual
bd.pool.on('connection', (conexion) => {
  conexion.query("SET SESSION sql_mode = TRIM(BOTH ',' FROM CONCAT(@@SESSION.sql_mode, ',STRICT_TRANS_TABLES'))");
});
