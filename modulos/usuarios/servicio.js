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
import { institucionActual } from '../../servidor/contexto.js';

const CAMPOS = 'id, nombre, correo, telefono, direccion, rol, activo, activado_2fa, creado_en, actualizado_en';

export async function listarUsuarios() {
  const [filas] = await bd.query(
    `SELECT ${CAMPOS} FROM usuarios
      WHERE rol NOT IN (?, ?) AND institucion_id <=> ? ORDER BY creado_en DESC`,
    [...ROLES_AJENOS, institucionActual()]
  );
  return filas;
}

async function buscarInterno(id) {
  const [[fila]] = await bd.query(
    `SELECT ${CAMPOS} FROM usuarios WHERE id = ? AND rol NOT IN (?, ?) AND institucion_id <=> ?`,
    [id, ...ROLES_AJENOS, institucionActual()]
  );
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

  const metodo = ajustes.leer('METODO_2FA_DEFECTO', SEGURIDAD.METODO_2FA_DEFECTO);
  let resultado;
  try {
    [resultado] = await bd.query(
      `INSERT INTO usuarios (nombre, correo, telefono, direccion, clave_hash, rol, secreto_2fa, metodo_2fa, debe_cambiar_clave, institucion_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [nombre, correo, telefono || null, direccion || null, claveHash, rol, secreto, metodo, solicitante.institucionId ?? null]
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new ErrorVisible('Ya existe un usuario con ese correo.', 409);
    throw error;
  }
  await registrarAuditoria({ usuarioId: solicitante.id, accion: 'usuario_creado', detalle: `${correo}: rol ${rol}`, ip });
  const envio = await despacharCredenciales({ nombre, correo, claveTemporal, asunto: 'Tu acceso al SIG del CEIPAJ' });

  return { usuario: await buscarInterno(resultado.insertId), ...envio };
}

export async function editarUsuario(id, { nombre, correo, telefono, direccion }, solicitante, ip) {
  const antes = await buscarInterno(id);
  try {
    await bd.query(
      'UPDATE usuarios SET nombre = ?, correo = ?, telefono = ?, direccion = ? WHERE id = ? AND institucion_id <=> ?',
      [nombre, correo, telefono || null, direccion || null, id, institucionActual()]
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new ErrorVisible('Ya existe un usuario con ese correo.', 409);
    throw error;
  }
  const cambios = [
    antes.nombre !== nombre ? 'nombre' : null,
    antes.correo !== correo ? `correo (de ${antes.correo} a ${correo})` : null,
    (antes.telefono ?? '') !== (telefono ?? '') ? 'teléfono' : null,
    (antes.direccion ?? '') !== (direccion ?? '') ? 'dirección' : null,
  ].filter(Boolean);
  await registrarAuditoria({
    usuarioId: solicitante.id,
    accion: 'usuario_actualizado',
    detalle: `${antes.correo}: ${cambios.length ? cambios.join(', ') : 'sin cambios'}`,
    ip,
  });
  return buscarInterno(id);
}

export async function cambiarRol(id, rol, solicitante, ip) {
  if (id === solicitante.id) throw new ErrorVisible('No podés cambiarte el rol a vos mismo.');
  const antes = await buscarInterno(id);
  if (antes.rol === rol) return antes;
  if (antes.rol === ROLES.ADMINISTRADOR && rol !== ROLES.ADMINISTRADOR) await exigirOtroAdministrador(id);

  await bd.query(
    'UPDATE usuarios SET rol = ?, sesion_version = sesion_version + 1 WHERE id = ? AND institucion_id <=> ?',
    [rol, id, institucionActual()]
  );
  await registrarAuditoria({
    usuarioId: solicitante.id,
    accion: 'usuario_rol_cambiado',
    detalle: `${antes.correo}: cambió el rol de ${antes.rol} a ${rol}`,
    ip,
  });
  return buscarInterno(id);
}

export async function cambiarActivo({ id, activo }, solicitante, ip) {
  if (!activo && id === solicitante.id) throw new ErrorVisible('No podés desactivar tu propia cuenta.');
  const usuario = await buscarInterno(id);
  if (!activo && usuario.rol === ROLES.ADMINISTRADOR) await exigirOtroAdministrador(id);
  if (activo) await revisarCupo();
  await bd.query(
    'UPDATE usuarios SET activo = ? WHERE id = ? AND institucion_id <=> ?',
    [activo ? 1 : 0, id, institucionActual()]
  );
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
    asunto: 'Nueva contraseña temporal (SIG CEIPAJ)',
  });
}
