import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { ESTADOS_LEAD, CANALES_CAPTACION, TIPOS_INTERACCION, ALIADOS } from '../../configuracion/ajustes.js';
import { VERSION_LEGALES } from '../../configuracion/legales.js';
import { validarCedula, normalizarCedula, validarCorreo, validarTelefono, validarLargo, LARGOS } from '../../comun/validar.js';
import { institucionDelPedido } from './consultas.js';
import { puedeCambiar, motivoDeBloqueo } from './estados.js';

function validarDatosContacto({ nombre, telefono, correo, canal }) {
  if (!nombre?.trim()) throw new ErrorVisible('El nombre es obligatorio.');
  if (!validarLargo(nombre, LARGOS.nombre)) throw new ErrorVisible(`El nombre no puede pasar de ${LARGOS.nombre} caracteres.`);
  if (!validarTelefono(telefono)) throw new ErrorVisible('El teléfono no tiene un formato válido.');

  if (correo && !validarCorreo(correo)) throw new ErrorVisible('El correo no tiene un formato válido.');
  if (correo && !validarLargo(correo, LARGOS.correo)) throw new ErrorVisible(`El correo no puede pasar de ${LARGOS.correo} caracteres.`);

  if (!telefono?.trim() && !correo?.trim()) throw new ErrorVisible('Cargá al menos un teléfono o un correo para poder contactarlo.');
  if (!CANALES_CAPTACION.includes(canal)) throw new ErrorVisible('Canal de captación no reconocido.');
}

async function aliadoValido(aliadoId, institucionId) {
  if (aliadoId === null || aliadoId === undefined || aliadoId === '') return null;
  const numero = Number(aliadoId);
  if (!Number.isInteger(numero) || numero <= 0) throw new ErrorVisible('Aliado no válido.');

  const [[aliado]] = await bd.query(
    `SELECT a.id FROM aliados a JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.id = ? AND a.institucion_id = ? AND u.activo = 1`,
    [numero, institucionId]
  );
  if (!aliado) throw new ErrorVisible('Ese aliado no existe o no está activo en esta institución.');
  return numero;
}

export async function crearLead({ nombre, cedula, telefono, correo, canal, consentimiento, aliadoId = null, creadoPor = null }, ip) {
  validarDatosContacto({ nombre, telefono, correo, canal });
  if (!validarCedula(cedula)) throw new ErrorVisible('La cédula debe ser numérica, de 6 a 8 dígitos.');
  if (consentimiento !== true) {
    throw new ErrorVisible('Marcá el consentimiento del interesado para el uso de sus datos (Ley N.º 7593/2025).');
  }
  const cedulaNormalizada = normalizarCedula(cedula);

  const institucionId = institucionDelPedido();
  const aliado = await aliadoValido(aliadoId, institucionId);
  let resultado;
  try {
    [resultado] = await bd.query(
      `INSERT INTO leads (nombre, cedula, telefono, correo, canal, aliado_id, institucion_id,
                          consentimiento_datos, consentimiento_fecha, consentimiento_version, creado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), ?, ?)`,
      [nombre.trim(), cedulaNormalizada, telefono || null, correo || null, canal, aliado,
        institucionId, VERSION_LEGALES, creadoPor]
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new ErrorVisible('Ya existe un interesado con esa cédula.', 409);
    throw error;
  }
  await registrarAuditoria({ usuarioId: creadoPor, accion: 'lead_creado', detalle: `cédula ${cedulaNormalizada}, canal ${canal}`, ip });
  const [[lead]] = await bd.query('SELECT * FROM leads WHERE id = ? AND institucion_id = ?', [resultado.insertId, institucionId]);
  return lead;
}

export function montoDeComision() {
  const tipo = ajustes.leer('COMISION_TIPO', ALIADOS.COMISION_TIPO);
  if (tipo === 'porcentaje') {
    const porcentaje = ajustes.leerNumero('COMISION_PORCENTAJE', ALIADOS.COMISION_PORCENTAJE);
    const matricula = ajustes.leerNumero('MATRICULA_REFERENCIA', ALIADOS.MATRICULA_REFERENCIA);
    return Math.round((matricula * porcentaje) / 100);
  }
  return ajustes.leerNumero('COMISION_POR_CONVERSION', ALIADOS.COMISION_POR_CONVERSION);
}

export async function concretarMatricula(leadId, fecha, usuarioId, ip) {
  const institucionId = institucionDelPedido();
  const [[lead]] = await bd.query(
    'SELECT id, nombre, estado, aliado_id, activo, consentimiento_revocado_en FROM leads WHERE id = ? AND institucion_id = ?',
    [leadId, institucionId]
  );
  if (!lead) throw new ErrorVisible('Interesado no encontrado.', 404);

  if (lead.estado === ESTADOS_LEAD.MATRICULADO) {
    return { id: lead.id, estado: lead.estado };
  }
  const bloqueo = motivoDeBloqueo(lead);
  if (bloqueo) throw new ErrorVisible(bloqueo, 409);

  const conexion = await bd.getConnection();
  try {
    await conexion.beginTransaction();
    // la condicion se repite en el update: si lo dieron de baja recien, no pasa
    const [cambio] = await conexion.query(
      'UPDATE leads SET estado = ?, fecha_conversion = ? WHERE id = ? AND institucion_id = ? AND activo = 1 AND estado <> ?',
      [ESTADOS_LEAD.MATRICULADO, fecha ?? new Date(), leadId, institucionId, ESTADOS_LEAD.MATRICULADO]
    );
    if (cambio.affectedRows === 0) {
      throw new ErrorVisible(`${lead.nombre} se dio de baja o ya fue matriculado mientras se procesaba. Recargá su ficha para ver cómo quedó.`, 409);
    }

    if (lead.aliado_id) {
      await conexion.query(
        'INSERT INTO comisiones (aliado_id, lead_id, monto) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id = id',
        [lead.aliado_id, lead.id, montoDeComision()]
      );
    }
    await conexion.commit();
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
  await registrarAuditoria({ usuarioId, accion: 'lead_convertido', detalle: `lead ${lead.id} pasó a matriculado`, ip });
  return { id: lead.id, estado: ESTADOS_LEAD.MATRICULADO };
}

export async function editarLead(id, { nombre, telefono, correo, canal, aliadoId }, usuarioId, ip) {
  validarDatosContacto({ nombre, telefono, correo, canal });
  const institucionId = institucionDelPedido();
  const [[antes]] = await bd.query(
    'SELECT aliado_id, estado FROM leads WHERE id = ? AND institucion_id = ?',
    [id, institucionId]
  );
  if (!antes) throw new ErrorVisible('Interesado no encontrado.', 404);

  const cambiaAliado = aliadoId !== undefined && Number(aliadoId ?? 0) !== Number(antes.aliado_id ?? 0);
  if (cambiaAliado && antes.estado === ESTADOS_LEAD.MATRICULADO) {
    throw new ErrorVisible('No se puede cambiar el aliado de un interesado ya matriculado: su comisión ya se generó.', 409);
  }
  const aliado = cambiaAliado ? await aliadoValido(aliadoId, institucionId) : antes.aliado_id;

  await bd.query(
    'UPDATE leads SET nombre = ?, telefono = ?, correo = ?, canal = ?, aliado_id = ? WHERE id = ? AND institucion_id = ?',
    [nombre.trim(), telefono || null, correo || null, canal, aliado, id, institucionId]
  );
  await registrarAuditoria({
    usuarioId,
    accion: 'lead_editado',
    detalle: cambiaAliado
      ? `lead ${id}: cambió el aliado de ${antes.aliado_id ?? 'ninguno'} a ${aliado ?? 'ninguno'}`
      : `lead ${id}`,
    ip,
  });
  return { id: Number(id), nombre: nombre.trim(), telefono, correo, canal, aliado_id: aliado };
}

export async function cambiarEstado(id, estadoNuevo, usuarioId, ip) {
  const institucionId = institucionDelPedido();
  const [[lead]] = await bd.query(
    'SELECT id, nombre, estado, activo, consentimiento_revocado_en FROM leads WHERE id = ? AND institucion_id = ?',
    [id, institucionId]
  );
  if (!lead) throw new ErrorVisible('Interesado no encontrado.', 404);
  const bloqueo = motivoDeBloqueo(lead);
  if (bloqueo) throw new ErrorVisible(bloqueo, 409);
  if (!puedeCambiar(lead.estado, estadoNuevo)) {
    throw new ErrorVisible(`No se puede pasar de "${lead.estado}" a "${estadoNuevo}".`);
  }
  if (estadoNuevo === ESTADOS_LEAD.MATRICULADO) return concretarMatricula(id, null, usuarioId, ip);
  await bd.query('UPDATE leads SET estado = ? WHERE id = ? AND institucion_id = ? AND activo = 1', [estadoNuevo, id, institucionId]);
  await registrarAuditoria({ usuarioId, accion: 'lead_estado', detalle: `lead ${lead.id}: cambió el estado de ${lead.estado} a ${estadoNuevo}`, ip });
  return { id: lead.id, estado: estadoNuevo };
}

export async function registrarInteraccion(leadId, { tipo, detalle }, usuarioId, ip) {
  if (!TIPOS_INTERACCION.includes(tipo)) throw new ErrorVisible('Tipo de interacción no reconocido.');
  const limpio = detalle?.trim() || null;
  if (limpio && !validarLargo(limpio, LARGOS.detalle)) throw new ErrorVisible(`El detalle no puede pasar de ${LARGOS.detalle} caracteres.`);

  const [[lead]] = await bd.query(
    'SELECT id FROM leads WHERE id = ? AND institucion_id = ?',
    [leadId, institucionDelPedido()]
  );
  if (!lead) throw new ErrorVisible('Interesado no encontrado.', 404);
  const [resultado] = await bd.query(
    'INSERT INTO interacciones (lead_id, usuario_id, tipo, detalle) VALUES (?, ?, ?, ?)',
    [leadId, usuarioId, tipo, limpio]
  );
  await registrarAuditoria({ usuarioId, accion: 'interaccion_registrada', detalle: `lead ${lead.id}: ${tipo}`, ip });
  return { id: resultado.insertId, leadId: lead.id, tipo, detalle: limpio };
}

export { darDeBaja, reactivar, revocarConsentimiento } from './bajas.js';
