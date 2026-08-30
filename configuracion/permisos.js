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
  roles: [ROLES.SUPERADMINISTRADOR],

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

// nombre de cada rol tal como se ve en pantalla. es la semilla de la tabla roles
export const TITULOS_ROL = {
  [ROLES.ADMINISTRADOR]: 'Administrador',
  [ROLES.COMERCIAL]: 'Personal administrativo-académico',
  [ROLES.DIRECCION]: 'Gerencia institucional',
  [ROLES.ALIADO]: 'Aliado institucional',
  [ROLES.SUPERADMINISTRADOR]: 'Proveedor del servicio',
};

// modulos del negocio del proveedor: ningun rol de un colegio puede recibirlos,
// ni siquiera uno creado a mano, porque daria acceso a los datos de todos
export const MODULOS_RESERVADOS = ['planes', 'instituciones', 'solicitudes', 'plataforma', 'roles'];

// el portal cuelga de la ficha de aliado, asi que solo tiene sentido para ese rol
export const MODULOS_DEL_ALIADO = ['portal'];

// sin estos dos el colegio se queda sin quien administre sus cuentas
export const MODULOS_OBLIGATORIOS_ADMINISTRADOR = ['usuarios', 'configuracion'];

// estos dos roles no se editan: el proveedor es quien vende el sistema y el
// aliado es externo, con su propio circuito de alta
export const ROLES_BLOQUEADOS = [ROLES.SUPERADMINISTRADOR, ROLES.ALIADO];

export const MODULOS = Object.keys(PERMISOS);
