// abm de aliados institucionales: alta con credenciales, edición, reenvío de
// accesos y baja lógica. la cuenta vive en usuarios y los datos propios en aliados.
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { SEGURIDAD, ROLES, ESTADOS_LEAD, ALIADOS } from '../../configuracion/ajustes.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { institucionActual } from '../../servidor/contexto.js';
import { generarClaveTemporal } from '../../comun/claves.js';
import { renovarClave } from '../usuarios/credenciales.js';
import { enviarAcceso } from './acceso.js';

// cada aliado pertenece a una institución, así que el superadministrador, que no está
// en ninguna, no tiene de dónde listarlos ni a quién agregarlos
function institucionDelPedido() {
  const id = institucionActual();
  if (id === null) throw new ErrorVisible('Esta operación es de una institución.', 403);
  return id;
}

// el filtro por institución va acá y no en cada llamador: todo el módulo entra por esta
// función, así un id de otro colegio devuelve "no encontrado" y no confirma que exista
async function buscarAliado(id) {
  const [[fila]] = await bd.query(
    `SELECT a.id, a.usuario_id, u.nombre, u.correo, a.institucion, a.cargo, a.telefono, u.activo, a.creado_en
       FROM aliados a JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.id = ? AND a.institucion_id = ?`,
    [id, institucionDelPedido()]
  );
  if (!fila) throw new ErrorVisible('Aliado no encontrado.', 404);
  return fila;
}

export async function obtenerAliado(id) {
  return buscarAliado(id);
}

export async function crearAliado({ nombre, correo, institucion, cargo, telefono }, solicitante, ip) {
  // ojo con los dos nombres parecidos: institucion_id es el colegio dueño del sistema y
  // la columna institucion es el texto libre de dónde trabaja el aliado
  const institucionId = institucionDelPedido();
  const claveTemporal = generarClaveTemporal();
  const claveHash = await bcrypt.hash(claveTemporal, SEGURIDAD.RONDAS_BCRYPT);
  const secreto = authenticator.generateSecret(); // el secreto 2fa queda listo desde el alta
  // cuenta y perfil se crean juntos, si no queda un aliado huérfano
  const conexion = await bd.getConnection();
  let perfil;
  try {
    await conexion.beginTransaction();
    // el aliado nuevo hereda el método de verificación por defecto del sistema
    const metodo = ajustes.leer('METODO_2FA_DEFECTO', SEGURIDAD.METODO_2FA_DEFECTO);
    // el teléfono va también en usuarios: es de donde lo lee el 2fa por sms
    const [cuenta] = await conexion.query(
      `INSERT INTO usuarios (nombre, correo, telefono, clave_hash, rol, secreto_2fa, metodo_2fa, debe_cambiar_clave, institucion_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [nombre, correo, telefono || null, claveHash, ROLES.ALIADO, secreto, metodo, institucionId]
    );
    [perfil] = await conexion.query(
      'INSERT INTO aliados (usuario_id, institucion, cargo, telefono, institucion_id) VALUES (?, ?, ?, ?, ?)',
      [cuenta.insertId, institucion, cargo || null, telefono || null, institucionId]
    );
    await conexion.commit();
  } catch (error) {
    await conexion.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new ErrorVisible('Ya existe un usuario con ese correo.', 409);
    throw error;
  } finally {
    conexion.release();
  }
  const envio = await enviarAcceso({ nombre, correo, claveTemporal, asunto: 'Tu acceso como aliado del CEIPAJ' });
  // la auditoría va después del envío para dejar registrado si las credenciales salieron (rf14)
  await registrarAuditoria({
    usuarioId: solicitante.id,
    accion: 'aliado_creado',
    detalle: `${correo} · ${institucion} · ${envio.correoEnviado ? 'credenciales enviadas' : 'clave mostrada en pantalla'}`,
    ip,
  });
  return { aliado: await buscarAliado(perfil.insertId), ...envio };
}

export async function editarAliado(id, { nombre, correo, institucion, cargo, telefono }, solicitante, ip) {
  const institucionId = institucionDelPedido();
  const antes = await buscarAliado(id);
  const conexion = await bd.getConnection();
  try {
    await conexion.beginTransaction();
    // el filtro se repite en el update: sin él la escritura alcanza una fila ajena
    // aunque la búsqueda de arriba haya mirado solo las propias
    await conexion.query('UPDATE usuarios SET nombre = ?, correo = ?, telefono = ? WHERE id = ? AND institucion_id = ?',
      [nombre, correo, telefono || null, antes.usuario_id, institucionId]);
    await conexion.query('UPDATE aliados SET institucion = ?, cargo = ?, telefono = ? WHERE id = ? AND institucion_id = ?',
      [institucion, cargo || null, telefono || null, id, institucionId]);
    await conexion.commit();
  } catch (error) {
    await conexion.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new ErrorVisible('Ya existe un usuario con ese correo.', 409);
    throw error;
  } finally {
    conexion.release();
  }
  const cambio = antes.correo !== correo ? `correo ${antes.correo} → ${correo}` : 'datos actualizados';
  await registrarAuditoria({ usuarioId: solicitante.id, accion: 'aliado_actualizado', detalle: `${antes.correo} · ${cambio}`, ip });
  return buscarAliado(id);
}

// si el correo del alta no llegó, el administrador vuelve a mandar el acceso
export async function reenviarAcceso(id, solicitante, ip) {
  // se le cambia la clave por usuario_id, así que primero hay que estar seguros de que
  // el aliado es nuestro: buscarAliado corta con 404 si es de otro colegio
  const aliado = await buscarAliado(id);
  const claveTemporal = await renovarClave(aliado.usuario_id);
  const envio = await enviarAcceso({
    nombre: aliado.nombre, correo: aliado.correo, claveTemporal,
    asunto: 'Tu nuevo acceso como aliado del CEIPAJ',
  });
  await registrarAuditoria({
    usuarioId: solicitante.id,
    accion: 'aliado_credenciales_reenviadas',
    detalle: `${aliado.correo} · ${envio.correoEnviado ? 'enviadas por correo' : 'clave mostrada en pantalla'}`,
    ip,
  });
  return envio;
}

// el acceso vive en usuarios, acá solo se busca a quién corresponde. buscarAliado ya
// deja afuera a los de otra institución, para que nadie desactive al aliado ajeno.
export async function cambiarActivoAliado(aliadoId, activo, solicitante, ip) {
  const institucionId = institucionDelPedido();
  const aliado = await buscarAliado(aliadoId);
  await bd.query('UPDATE usuarios SET activo = ? WHERE id = ? AND institucion_id = ?',
    [activo ? 1 : 0, aliado.usuario_id, institucionId]);
  await registrarAuditoria({
    usuarioId: solicitante.id,
    accion: activo ? 'aliado_activado' : 'aliado_desactivado',
    detalle: aliado.correo,
    ip,
  });
  return { id: Number(aliadoId), activo: Boolean(activo) };
}

export async function listarAliados() {
  const [filas] = await bd.query(
    `SELECT a.id, u.nombre, u.correo, a.institucion, a.cargo, a.telefono, u.activo, a.creado_en,
            (SELECT COUNT(*) FROM leads l WHERE l.aliado_id = a.id AND l.institucion_id = a.institucion_id) AS total_leads,
            (SELECT COUNT(*) FROM leads l WHERE l.aliado_id = a.id AND l.institucion_id = a.institucion_id AND l.estado = ?) AS convertidos
       FROM aliados a
       JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.institucion_id = ?
      ORDER BY a.creado_en DESC`,
    [ESTADOS_LEAD.MATRICULADO, institucionDelPedido()]
  );
  // los puntos se calculan acá y no en sql para tener la regla en un solo lugar
  const puntosPorLead = ajustes.leerNumero('PUNTOS_POR_LEAD', ALIADOS.PUNTOS_POR_LEAD);
  const puntosPorConversion = ajustes.leerNumero('PUNTOS_POR_CONVERSION', ALIADOS.PUNTOS_POR_CONVERSION);
  return filas.map((fila) => ({
    ...fila,
    puntos: fila.total_leads * puntosPorLead + fila.convertidos * puntosPorConversion,
  }));
}
