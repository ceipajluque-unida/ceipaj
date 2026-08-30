import { ROLES } from './ajustes.js';

export const PERMISOS = {
  usuarios: [ROLES.ADMINISTRADOR],
  leads: [ROLES.ADMINISTRADOR, ROLES.COMERCIAL],

  aliados: [ROLES.ADMINISTRADOR, ROLES.COMERCIAL, ROLES.DIRECCION],
  portal: [ROLES.ALIADO],
  comisiones: [ROLES.ADMINISTRADOR, ROLES.DIRECCION],
  conversion: [ROLES.ADMINISTRADOR, ROLES.COMERCIAL],
  seguimiento: [ROLES.ADMINISTRADOR, ROLES.COMERCIAL],
  reportes: [ROLES.ADMINISTRADOR, ROLES.COMERCIAL, ROLES.DIRECCION],
  pagos: [ROLES.ADMINISTRADOR, ROLES.DIRECCION],
  suscripcion: [ROLES.ADMINISTRADOR, ROLES.DIRECCION],

  planes: [ROLES.SUPERADMINISTRADOR],
  instituciones: [ROLES.SUPERADMINISTRADOR],
  solicitudes: [ROLES.SUPERADMINISTRADOR],
  plataforma: [ROLES.SUPERADMINISTRADOR],

  configuracion: [ROLES.ADMINISTRADOR, ROLES.SUPERADMINISTRADOR],
  auditoria: [ROLES.ADMINISTRADOR, ROLES.SUPERADMINISTRADOR],
};

export const ROLES_ASIGNABLES = [ROLES.ADMINISTRADOR, ROLES.COMERCIAL, ROLES.DIRECCION];

export const ROLES_AJENOS = [ROLES.ALIADO, ROLES.SUPERADMINISTRADOR];

export function modulosDelRol(rol) {
  return Object.keys(PERMISOS).filter((modulo) => PERMISOS[modulo].includes(rol));
}

export const PERMISOS_ESCRITURA = {
  aliados: [ROLES.ADMINISTRADOR, ROLES.COMERCIAL],
  comisiones: [ROLES.ADMINISTRADOR],
  suscripcion: [ROLES.ADMINISTRADOR],
  pagos: [ROLES.ADMINISTRADOR],
};

export function puedeEscribir(modulo, rol) {
  return (PERMISOS_ESCRITURA[modulo] ?? PERMISOS[modulo] ?? []).includes(rol);
}

export const PERMISOS_EXPORTACION = {
  leads: PERMISOS.leads,
  interacciones: PERMISOS.leads,
  comisiones: PERMISOS.comisiones,
  pagos: PERMISOS.pagos,
  suscripciones: PERMISOS.suscripcion,
  auditoria: PERMISOS.auditoria,
};
