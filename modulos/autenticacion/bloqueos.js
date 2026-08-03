import { ErrorVisible } from '../../servidor/errores.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { SEGURIDAD } from '../../configuracion/ajustes.js';

const porClave = new Map();
const porCodigo = new Map();
const porRecuperacion = new Map();

function normalizar(correo) {
  return String(correo ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function limite() {
  return ajustes.leerNumero('INTENTOS_INGRESO', SEGURIDAD.INTENTOS_INGRESO);
}

function minutosBloqueo() {
  return ajustes.leerNumero('MINUTOS_BLOQUEO_INGRESO', SEGURIDAD.MINUTOS_BLOQUEO_INGRESO);
}

function revisar(registros, id, mensaje) {
  const registro = registros.get(id);
  if (registro?.bloqueadoHasta && registro.bloqueadoHasta > Date.now()) {
    const minutos = Math.ceil((registro.bloqueadoHasta - Date.now()) / 60000);
    throw new ErrorVisible(`${mensaje} Probá de nuevo en ${minutos} minuto(s).`, 429);
  }
}

function anotar(registros, id) {
  const registro = registros.get(id) ?? { cantidad: 0, bloqueadoHasta: 0 };
  registro.cantidad += 1;
  if (registro.cantidad >= limite()) {
    registro.bloqueadoHasta = Date.now() + minutosBloqueo() * 60000;
    registro.cantidad = 0;
  }
  registros.set(id, registro);
}

export const clave = {
  revisar: (correo) => revisar(porClave, normalizar(correo), 'Demasiados intentos fallidos.'),
  anotarFallo: (correo) => anotar(porClave, normalizar(correo)),
  limpiar: (correo) => porClave.delete(normalizar(correo)),
};

export const codigo2fa = {
  revisar: (usuarioId) => revisar(porCodigo, usuarioId, 'Demasiados intentos con el código.'),
  anotarFallo: (usuarioId) => anotar(porCodigo, usuarioId),
  limpiar: (usuarioId) => porCodigo.delete(usuarioId),
};

export const recuperacion = {
  revisar: (correo) => revisar(porRecuperacion, normalizar(correo), 'Ya pediste el enlace varias veces.'),
  anotar: (correo) => anotar(porRecuperacion, normalizar(correo)),
  limpiar: (correo) => porRecuperacion.delete(normalizar(correo)),
};
