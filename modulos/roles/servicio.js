import { bd } from '../../servidor/bd/conexion.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import {
  PERMISOS, TITULOS_ROL, MODULOS, MODULOS_RESERVADOS, MODULOS_DEL_ALIADO,
  MODULOS_OBLIGATORIOS_ADMINISTRADOR, ROLES_BLOQUEADOS,
} from '../../configuracion/permisos.js';
import { ROLES } from '../../configuracion/ajustes.js';

// los roles viven en la base para que el proveedor los pueda editar, pero
// arrancan con la matriz de configuracion/permisos.js. el cache evita ir a la
// base en cada pedido: se limpia solo cuando algo cambia.
let cache = null;

export function limpiarCacheRoles() { cache = null; }

async function matriz() {
  if (cache) return cache;
  const [filas] = await bd.query('SELECT clave, titulo, modulos, del_sistema, bloqueado, activo FROM roles');
  cache = filas.map((f) => ({
    clave: f.clave,
    titulo: f.titulo,
    modulos: String(f.modulos ?? '').split('\n').map((m) => m.trim()).filter(Boolean),
    delSistema: Boolean(f.del_sistema),
    bloqueado: Boolean(f.bloqueado),
    activo: Boolean(f.activo),
  }));
  // los del sistema van en el orden en que se los presenta siempre, y los
  // propios despues, alfabeticos. alfabetico a secas dejaba al aliado en el medio
  const orden = Object.keys(TITULOS_ROL);
  cache.sort((a, b) => {
    const ia = orden.indexOf(a.clave), ib = orden.indexOf(b.clave);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.titulo.localeCompare(b.titulo, 'es');
  });
  return cache;
}

// que roles pueden entrar a un modulo. si la tabla todavia no esta (base vieja
// a medio migrar) se cae a la matriz del codigo, que es la de fabrica
export async function rolesDelModulo(modulo) {
  try {
    const filas = await matriz();
    if (!filas.length) return PERMISOS[modulo] ?? [];
    return filas.filter((r) => r.activo && r.modulos.includes(modulo)).map((r) => r.clave);
  } catch {
    return PERMISOS[modulo] ?? [];
  }
}

export async function modulosDeRol(rol) {
  const filas = await matriz();
  return filas.find((r) => r.clave === rol)?.modulos ?? [];
}

// los que un colegio puede asignarle a su gente: ni el proveedor ni el aliado
export async function rolesAsignables() {
  const filas = await matriz();
  return filas.filter((r) => r.activo && !ROLES_BLOQUEADOS.includes(r.clave))
    .map((r) => ({ clave: r.clave, titulo: r.titulo }));
}

export async function listar() {
  const filas = await matriz();
  const [conteo] = await bd.query('SELECT rol, COUNT(*) AS n FROM usuarios WHERE activo = 1 GROUP BY rol');
  const usuarios = Object.fromEntries(conteo.map((c) => [c.rol, Number(c.n)]));
  return filas.map((r) => ({ ...r, usuarios: usuarios[r.clave] ?? 0 }));
}

// solo los que un rol editable puede recibir: los del proveedor y el portal del
// aliado quedan afuera, asi la pantalla no ofrece lo que el servidor va a negar
export const catalogoModulos = () => MODULOS.filter(
  (m) => !MODULOS_RESERVADOS.includes(m) && !MODULOS_DEL_ALIADO.includes(m)
);

function validarClave(clave) {
  const limpia = String(clave ?? '').trim().toLowerCase();
  if (!/^[a-z][a-z_]{2,29}$/.test(limpia)) {
    throw new ErrorVisible('La clave del rol va en minúsculas, sin espacios ni acentos, y entre 3 y 30 letras.');
  }
  return limpia;
}

function validarTitulo(titulo) {
  const limpio = String(titulo ?? '').trim();
  if (limpio.length < 3 || limpio.length > 60) {
    throw new ErrorVisible('El nombre del rol tiene que tener entre 3 y 60 caracteres.');
  }
  return limpio;
}

// el corazon de la seguridad de esta pantalla: un rol nuevo no puede quedarse
// con los modulos del proveedor ni con el portal del aliado
function validarModulos(clave, modulos) {
  if (!Array.isArray(modulos)) throw new ErrorVisible('Elegí a qué módulos accede el rol.');
  const limpios = [...new Set(modulos.map((m) => String(m).trim()).filter(Boolean))];
  const ajeno = limpios.find((m) => !MODULOS.includes(m));
  if (ajeno) throw new ErrorVisible(`El módulo "${ajeno}" no existe.`);

  if (clave !== ROLES.SUPERADMINISTRADOR) {
    const reservado = limpios.find((m) => MODULOS_RESERVADOS.includes(m));
    if (reservado) {
      throw new ErrorVisible(
        `"${reservado}" es del proveedor de la plataforma y no se le puede dar a un rol de una institución.`
      );
    }
  }
  if (clave !== ROLES.ALIADO) {
    const dealiado = limpios.find((m) => MODULOS_DEL_ALIADO.includes(m));
    if (dealiado) {
      throw new ErrorVisible(`"${dealiado}" es el portal del aliado y solo funciona con ese rol.`);
    }
  }
  if (clave === ROLES.ADMINISTRADOR) {
    const falta = MODULOS_OBLIGATORIOS_ADMINISTRADOR.find((m) => !limpios.includes(m));
    if (falta) {
      throw new ErrorVisible(
        `El administrador no puede quedarse sin "${falta}": si se lo quitás, nadie de la institución podría administrar sus cuentas.`
      );
    }
  }
  return limpios;
}

async function buscar(clave) {
  const filas = await matriz();
  const rol = filas.find((r) => r.clave === clave);
  if (!rol) throw new ErrorVisible('Ese rol no existe.');
  return rol;
}

export async function crear(datos, usuario, ip) {
  const clave = validarClave(datos?.clave);
  const filas = await matriz();
  if (filas.some((r) => r.clave === clave)) throw new ErrorVisible('Ya existe un rol con esa clave.');
  const titulo = validarTitulo(datos?.titulo);
  const modulos = validarModulos(clave, datos?.modulos);

  await bd.query(
    'INSERT INTO roles (clave, titulo, modulos, del_sistema, bloqueado, activo) VALUES (?,?,?,0,0,1)',
    [clave, titulo, modulos.join('\n')]
  );
  limpiarCacheRoles();
  await registrarAuditoria({ usuarioId: usuario.id, accion: 'rol_creado', detalle: `${titulo} (${clave}) con ${modulos.length} módulos`, ip });
  return { clave, titulo, modulos };
}

export async function editar(clave, datos, usuario, ip) {
  const rol = await buscar(clave);
  if (rol.bloqueado) {
    throw new ErrorVisible(`El rol ${rol.titulo} no se edita: lo usa el propio sistema para funcionar.`);
  }
  const titulo = validarTitulo(datos?.titulo ?? rol.titulo);
  const modulos = validarModulos(clave, datos?.modulos ?? rol.modulos);
  const activo = datos?.activo === undefined ? rol.activo : Boolean(datos.activo);

  if (!activo) {
    if (rol.delSistema) throw new ErrorVisible('Los roles que trae el sistema no se pueden desactivar.');
    const [[{ n }]] = await bd.query('SELECT COUNT(*) AS n FROM usuarios WHERE rol = ? AND activo = 1', [clave]);
    if (n > 0) {
      throw new ErrorVisible(`No se puede desactivar: hay ${n} cuenta(s) usando este rol. Cambiales el rol primero.`);
    }
  }

  await bd.query('UPDATE roles SET titulo = ?, modulos = ?, activo = ? WHERE clave = ?',
    [titulo, modulos.join('\n'), activo ? 1 : 0, clave]);
  limpiarCacheRoles();
  await registrarAuditoria({ usuarioId: usuario.id, accion: 'rol_editado', detalle: `${titulo} (${clave}): ${rol.modulos.length} módulos antes, ${modulos.length} ahora`, ip });
  return { clave, titulo, modulos, activo };
}

export async function borrar(clave, usuario, ip) {
  const rol = await buscar(clave);
  if (rol.delSistema) {
    throw new ErrorVisible(`${rol.titulo} viene con el sistema y no se puede borrar. Sí podés cambiarle los accesos.`);
  }
  const [[{ n }]] = await bd.query('SELECT COUNT(*) AS n FROM usuarios WHERE rol = ?', [clave]);
  if (n > 0) {
    throw new ErrorVisible(`No se puede borrar: hay ${n} cuenta(s) con este rol. Cambiales el rol y volvé a intentar.`);
  }
  await bd.query('DELETE FROM roles WHERE clave = ?', [clave]);
  limpiarCacheRoles();
  await registrarAuditoria({ usuarioId: usuario.id, accion: 'rol_borrado', detalle: `${rol.titulo} (${clave})`, ip });
}

// devuelve los cinco roles del sistema a los accesos con los que vienen de fabrica
export async function restaurarDeFabrica(usuario, ip) {
  for (const clave of Object.keys(TITULOS_ROL)) {
    const modulos = MODULOS.filter((m) => PERMISOS[m].includes(clave));
    await bd.query('UPDATE roles SET titulo = ?, modulos = ?, activo = 1 WHERE clave = ?',
      [TITULOS_ROL[clave], modulos.join('\n'), clave]);
  }
  limpiarCacheRoles();
  await registrarAuditoria({ usuarioId: usuario.id, accion: 'roles_restaurados', detalle: 'los roles del sistema volvieron a sus accesos de fábrica', ip });
}
