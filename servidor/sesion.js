import jwt from 'jsonwebtoken';
import { SEGURIDAD } from '../configuracion/ajustes.js';
import * as ajustes from './ajustesSistema.js';

export const CABECERA_RENOVADA = 'X-Sesion-Renovada';

function segundosDeInactividad() {
  return ajustes.leerNumero('MINUTOS_EXPIRACION_SESION', SEGURIDAD.MINUTOS_EXPIRACION_SESION) * 60;
}

function segundosDeTope() {
  return ajustes.leerNumero('DIAS_RECORDAR_SESION', SEGURIDAD.DIAS_RECORDAR_SESION) * 86400;
}

// la sesion vence por inactividad y vale igual para todos los roles: cada pedido
// la estira, pero nunca mas alla del tope contado desde que la persona entro
export function firmarSesion({ id, nombre, rol, sv, ini, rec }) {
  const ahora = Math.floor(Date.now() / 1000);
  const inicio = ini ?? ahora;
  const vence = Math.min(ahora + segundosDeInactividad(), inicio + segundosDeTope());
  return jwt.sign(
    { id, nombre, rol, alcance: 'sesion', sv: sv ?? 0, ini: inicio, rec: Boolean(rec), exp: vence },
    SEGURIDAD.JWT_SECRETO
  );
}

export function renovar(datos, usuario, res) {
  const ahora = Math.floor(Date.now() / 1000);
  const inicio = datos.ini ?? datos.iat ?? ahora;
  if (inicio + segundosDeTope() <= ahora) return;
  res.setHeader(CABECERA_RENOVADA, firmarSesion({
    id: datos.id, nombre: usuario.nombre, rol: usuario.rol, sv: usuario.sesion_version, ini: inicio, rec: datos.rec,
  }));
}
