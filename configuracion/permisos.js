// dirección solo mira indicadores y el aliado solo su pantalla
import { ROLES } from './ajustes.js';

export const PERMISOS = {
  usuarios: [ROLES.ADMINISTRADOR],
  leads: [ROLES.ADMINISTRADOR, ROLES.COMERCIAL],
  // dirección ya ve a los aliados por comisiones y por reportes, así que cerrarle
  // el padrón no protegía nada: solo dejaba la navegación coja
  aliados: [ROLES.ADMINISTRADOR, ROLES.COMERCIAL, ROLES.DIRECCION],
  portal: [ROLES.ALIADO],
  comisiones: [ROLES.ADMINISTRADOR, ROLES.DIRECCION],
  conversion: [ROLES.ADMINISTRADOR, ROLES.COMERCIAL],
  seguimiento: [ROLES.ADMINISTRADOR, ROLES.COMERCIAL],
  reportes: [ROLES.ADMINISTRADOR, ROLES.COMERCIAL, ROLES.DIRECCION],
  pagos: [ROLES.ADMINISTRADOR, ROLES.DIRECCION],
  suscripcion: [ROLES.ADMINISTRADOR, ROLES.DIRECCION],
  // del proveedor del servicio: el que paga la suscripción no se fija a sí mismo el precio
  planes: [ROLES.SUPERADMINISTRADOR],
  instituciones: [ROLES.SUPERADMINISTRADOR],
  // los dos entran, pero cada uno ve lo suyo: el filtro por ámbito está en el servicio
  configuracion: [ROLES.ADMINISTRADOR, ROLES.SUPERADMINISTRADOR],
  auditoria: [ROLES.ADMINISTRADOR, ROLES.SUPERADMINISTRADOR],
};

// lista blanca de lo que se puede asignar desde la pantalla de usuarios. va como lista
// blanca y no como lista negra a propósito: con una lista negra, cada rol nuevo queda
// asignable por descuido, y acá eso significaría que un administrador se fabrique la
// cuenta del proveedor.
export const ROLES_ASIGNABLES = [ROLES.ADMINISTRADOR, ROLES.COMERCIAL, ROLES.DIRECCION];

// roles que la institución no administra: el aliado tiene su propio módulo y el
// superadministrador es del proveedor
export const ROLES_AJENOS = [ROLES.ALIADO, ROLES.SUPERADMINISTRADOR];

export function modulosDelRol(rol) {
  return Object.keys(PERMISOS).filter((modulo) => PERMISOS[modulo].includes(rol));
}

// quién además de mirar puede crear o modificar dentro del módulo. estaba repetido a
// mano en las rutas y en las pantallas; acá queda una sola fuente de verdad.
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
  auditoria: [ROLES.ADMINISTRADOR],
};
