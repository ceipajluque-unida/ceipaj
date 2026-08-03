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
