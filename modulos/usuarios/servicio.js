// abm de usuarios internos: alta con clave temporal, edición, cambio de rol,
// activar/desactivar y restablecer clave. todo queda auditado.
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { SEGURIDAD, ROLES } from '../../configuracion/ajustes.js';
import { ROLES_AJENOS } from '../../configuracion/permisos.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { generarClaveTemporal } from '../../comun/claves.js';
import { despacharCredenciales, renovarClave } from './credenciales.js';
import { revisarCupo, exigirOtroAdministrador } from './guardas.js';

const CAMPOS = 'id, nombre, correo, telefono, direccion, rol, activo, activado_2fa, creado_en, actualizado_en';

// solo cuentas internas de la institución: los aliados van en su módulo y el
// superadministrador es del proveedor. lo que no se lista, tampoco se edita ni se le
// restablece la clave, porque toda la cadena cuelga de buscarInterno.
export async function listarUsuarios() {
  const [filas] = await bd.query(
    `SELECT ${CAMPOS} FROM usuarios WHERE rol NOT IN (?, ?) ORDER BY creado_en DESC`,
    ROLES_AJENOS
  );
  return filas;
}

async function buscarInterno(id) {
  const [[fila]] = await bd.query(`SELECT ${CAMPOS} FROM usuarios WHERE id = ? AND rol NOT IN (?, ?)`, [id, ...ROLES_AJENOS]);
  if (!fila) throw new ErrorVisible('Usuario no encontrado.', 404);
  return fila;
}

export async function obtenerUsuario(id) {
  return buscarInterno(id);
}

export async function crearUsuario({ nombre, correo, telefono, direccion, rol }, solicitante, ip) {
  await revisarCupo();
  const claveTemporal = generarClaveTemporal();
  const claveHash = await bcrypt.hash(claveTemporal, SEGURIDAD.RONDAS_BCRYPT);
  const secreto = authenticator.generateSecret();
  // el usuario nuevo hereda el método de verificación por defecto del sistema
  const metodo = ajustes.leer('METODO_2FA_DEFECTO', SEGURIDAD.METODO_2FA_DEFECTO);
  let resultado;
  try {
    // la cuenta nace en la institución de quien la crea, no en la que diga el navegador
    [resultado] = await bd.query(
      `INSERT INTO usuarios (nombre, correo, telefono, direccion, clave_hash, rol, secreto_2fa, metodo_2fa, debe_cambiar_clave, institucion_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [nombre, correo, telefono || null, direccion || null, claveHash, rol, secreto, metodo, solicitante.institucionId ?? null]
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new ErrorVisible('Ya existe un usuario con ese correo.', 409);
    throw error;
  }
  await registrarAuditoria({ usuarioId: solicitante.id, accion: 'usuario_creado', detalle: `${correo} · rol ${rol}`, ip });
  const envio = await despacharCredenciales({ nombre, correo, claveTemporal, asunto: 'Tu acceso al SIG del CEIPAJ' });
  // se relee la fila para devolver lo que quedó guardado, no lo que llegó en el pedido
  return { usuario: await buscarInterno(resultado.insertId), ...envio };
}

export async function editarUsuario(id, { nombre, correo, telefono, direccion }, solicitante, ip) {
  const antes = await buscarInterno(id);
  try {
    await bd.query(
      'UPDATE usuarios SET nombre = ?, correo = ?, telefono = ?, direccion = ? WHERE id = ?',
      [nombre, correo, telefono || null, direccion || null, id]
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new ErrorVisible('Ya existe un usuario con ese correo.', 409);
    throw error;
  }
  const cambios = [
    antes.nombre !== nombre ? 'nombre' : null,
    antes.correo !== correo ? `correo ${antes.correo} → ${correo}` : null,
    (antes.telefono ?? '') !== (telefono ?? '') ? 'teléfono' : null,
    (antes.direccion ?? '') !== (direccion ?? '') ? 'dirección' : null,
  ].filter(Boolean);
  await registrarAuditoria({
    usuarioId: solicitante.id,
    accion: 'usuario_actualizado',
    detalle: `${antes.correo} · ${cambios.length ? cambios.join(', ') : 'sin cambios'}`,
    ip,
  });
  return buscarInterno(id);
}

// el rnf-13 pide auditar los cambios de rol, así que se guarda el anterior y el nuevo
export async function cambiarRol(id, rol, solicitante, ip) {
  // mismo freno que cambiarActivo: sin esto uno se cambia el rol a sí mismo con un put
  if (id === solicitante.id) throw new ErrorVisible('No podés cambiarte el rol a vos mismo.');
  const antes = await buscarInterno(id);
  if (antes.rol === rol) return antes;
  if (antes.rol === ROLES.ADMINISTRADOR && rol !== ROLES.ADMINISTRADOR) await exigirOtroAdministrador(id);
  // sube la versión de sesión: el token viejo lleva el rol viejo y deja de valer ya
  await bd.query('UPDATE usuarios SET rol = ?, sesion_version = sesion_version + 1 WHERE id = ?', [rol, id]);
  await registrarAuditoria({
    usuarioId: solicitante.id,
    accion: 'usuario_rol_cambiado',
    detalle: `${antes.correo} · ${antes.rol} → ${rol}`,
    ip,
  });
  return buscarInterno(id);
}

export async function cambiarActivo({ id, activo }, solicitante, ip) {
  // nadie puede cortarse el acceso a sí mismo
  if (!activo && id === solicitante.id) throw new ErrorVisible('No podés desactivar tu propia cuenta.');
  const usuario = await buscarInterno(id);
  if (!activo && usuario.rol === ROLES.ADMINISTRADOR) await exigirOtroAdministrador(id);
  if (activo) await revisarCupo();
  await bd.query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
  await registrarAuditoria({
    usuarioId: solicitante.id,
    accion: activo ? 'usuario_activado' : 'usuario_desactivado',
    detalle: usuario.correo,
    ip,
  });
  return { id, activo };
}

export async function restablecerClave({ id }, solicitante, ip) {
  const usuario = await buscarInterno(id);
  const claveTemporal = await renovarClave(id);
  await registrarAuditoria({ usuarioId: solicitante.id, accion: 'clave_restablecida', detalle: usuario.correo, ip });
  return despacharCredenciales({
    nombre: usuario.nombre,
    correo: usuario.correo,
    claveTemporal,
    asunto: 'Nueva contraseña temporal — SIG CEIPAJ',
  });
}
