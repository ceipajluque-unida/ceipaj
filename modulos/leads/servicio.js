// escrituras de leads: alta, edición, cambio de estado, interacciones y conversión
import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { ESTADOS_LEAD, CANALES_CAPTACION, TIPOS_INTERACCION, ALIADOS } from '../../configuracion/ajustes.js';
import { VERSION_LEGALES } from '../../configuracion/legales.js';
import { validarCedula, normalizarCedula, validarCorreo, validarTelefono, validarLargo, LARGOS } from '../../comun/validar.js';
import { institucionDelPedido } from './consultas.js';
import { puedeCambiar } from './estados.js';

// validaciones que comparten el alta y la edición (el formulario no alcanza)
function validarDatosContacto({ nombre, telefono, correo, canal }) {
  if (!nombre?.trim()) throw new ErrorVisible('El nombre es obligatorio.');
  if (!validarLargo(nombre, LARGOS.nombre)) throw new ErrorVisible(`El nombre no puede pasar de ${LARGOS.nombre} caracteres.`);
  if (!validarTelefono(telefono)) throw new ErrorVisible('El teléfono no tiene un formato válido.');
  // el correo no es obligatorio porque muchos interesados solo dejan teléfono
  if (correo && !validarCorreo(correo)) throw new ErrorVisible('El correo no tiene un formato válido.');
  if (correo && !validarLargo(correo, LARGOS.correo)) throw new ErrorVisible(`El correo no puede pasar de ${LARGOS.correo} caracteres.`);
  // sin teléfono ni correo el interesado queda incontactable y entra igual en las alertas
  if (!telefono?.trim() && !correo?.trim()) throw new ErrorVisible('Cargá al menos un teléfono o un correo para poder contactarlo.');
  if (!CANALES_CAPTACION.includes(canal)) throw new ErrorVisible('Canal de captación no reconocido.');
}

// el aliado que recomendó al interesado define comisiones y puntos, o sea plata: no puede
// venir del navegador sin comprobar que existe, que está activo y que es de la misma
// institución. sin esta comprobación se le podía atribuir un interesado a un aliado de
// otro colegio mandando su id a mano.
async function aliadoValido(aliadoId, institucionId) {
  if (aliadoId === null || aliadoId === undefined || aliadoId === '') return null;
  const numero = Number(aliadoId);
  if (!Number.isInteger(numero) || numero <= 0) throw new ErrorVisible('Aliado no válido.');
  // el aliado no tiene estado propio: su alta y su baja son las de su cuenta de usuario
  const [[aliado]] = await bd.query(
    `SELECT a.id FROM aliados a JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.id = ? AND a.institucion_id = ? AND u.activo = 1`,
    [numero, institucionId]
  );
  if (!aliado) throw new ErrorVisible('Ese aliado no existe o no está activo en esta institución.');
  return numero;
}

// registra un interesado. también la usa el portal, por eso aliadoId y creadoPor son opcionales
export async function crearLead({ nombre, cedula, telefono, correo, canal, consentimiento, aliadoId = null, creadoPor = null }, ip) {
  validarDatosContacto({ nombre, telefono, correo, canal });
  if (!validarCedula(cedula)) throw new ErrorVisible('La cédula debe ser numérica, de 6 a 8 dígitos.');
  if (consentimiento !== true) {
    throw new ErrorVisible('Falta el consentimiento del interesado para el uso de sus datos (Ley 7593).');
  }
  const cedulaNormalizada = normalizarCedula(cedula);
  // el alta también entra por el portal del aliado, que corre con su propia sesión
  const institucionId = institucionDelPedido();
  const aliado = await aliadoValido(aliadoId, institucionId);
  let resultado;
  try {
    // se guarda contra qué versión de los textos legales se prestó el consentimiento,
    // porque los textos se editan en caliente desde configuración
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
  await registrarAuditoria({ usuarioId: creadoPor, accion: 'lead_creado', detalle: `cédula ${cedulaNormalizada} · canal ${canal}`, ip });
  const [[lead]] = await bd.query('SELECT * FROM leads WHERE id = ? AND institucion_id = ?', [resultado.insertId, institucionId]);
  return lead;
}

// toda conversión pasa por acá, manual o automática, y deja la fecha y la comisión
export async function concretarMatricula(leadId, fecha, usuarioId, ip) {
  const institucionId = institucionDelPedido();
  const [[lead]] = await bd.query(
    'SELECT id, estado, aliado_id FROM leads WHERE id = ? AND institucion_id = ?',
    [leadId, institucionId]
  );
  if (!lead) throw new ErrorVisible('Interesado no encontrado.', 404);
  // la matrícula del académico manda y convierte desde cualquier estado
  if (lead.estado === ESTADOS_LEAD.MATRICULADO) {
    return { id: lead.id, estado: lead.estado }; // ya estaba convertido, no hay nada que hacer
  }
  // estado y comisión van en una transacción para que la matrícula no quede a medias
  const conexion = await bd.getConnection();
  try {
    await conexion.beginTransaction();
    await conexion.query(
      'UPDATE leads SET estado = ?, fecha_conversion = ? WHERE id = ? AND institucion_id = ?',
      [ESTADOS_LEAD.MATRICULADO, fecha ?? new Date(), leadId, institucionId]
    );
    // la comisión cuelga del lead y del aliado que ya vinieron filtrados por institución.
    // si vino recomendado, el aliado gana su comisión; el on duplicate evita duplicarla
    if (lead.aliado_id) {
      await conexion.query(
        'INSERT INTO comisiones (aliado_id, lead_id, monto) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id = id',
        [lead.aliado_id, lead.id, ajustes.leerNumero('COMISION_POR_CONVERSION', ALIADOS.COMISION_POR_CONVERSION)]
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

// la cédula no se edita porque identifica al lead en la conversión.
// el aliado sí, y hace falta: un interesado que recomienda un aliado por teléfono lo carga
// el personal, y antes no había forma de atribuírselo, así que al matricularse no generaba
// ni comisión ni puntos y quedaba así para siempre.
export async function editarLead(id, { nombre, telefono, correo, canal, aliadoId }, usuarioId, ip) {
  validarDatosContacto({ nombre, telefono, correo, canal });
  const institucionId = institucionDelPedido();
  const [[antes]] = await bd.query(
    'SELECT aliado_id, estado FROM leads WHERE id = ? AND institucion_id = ?',
    [id, institucionId]
  );
  if (!antes) throw new ErrorVisible('Interesado no encontrado.', 404);
  // ya matriculado la comisión está liquidada: cambiar el aliado ahí dejaría el pago
  // hecho a nombre de uno y el crédito a nombre de otro
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
    // el cambio de aliado va detallado porque define comisiones y puntos
    detalle: cambiaAliado ? `lead ${id} · aliado ${antes.aliado_id ?? '—'} → ${aliado ?? '—'}` : `lead ${id}`,
    ip,
  });
  return { id: Number(id), nombre: nombre.trim(), telefono, correo, canal, aliado_id: aliado };
}

// cambio de estado validado contra las transiciones del negocio
export async function cambiarEstado(id, estadoNuevo, usuarioId, ip) {
  const institucionId = institucionDelPedido();
  const [[lead]] = await bd.query(
    'SELECT id, estado FROM leads WHERE id = ? AND institucion_id = ?',
    [id, institucionId]
  );
  if (!lead) throw new ErrorVisible('Interesado no encontrado.', 404);
  if (!puedeCambiar(lead.estado, estadoNuevo)) {
    throw new ErrorVisible(`No se puede pasar de "${lead.estado}" a "${estadoNuevo}".`);
  }
  if (estadoNuevo === ESTADOS_LEAD.MATRICULADO) return concretarMatricula(id, null, usuarioId, ip);
  await bd.query('UPDATE leads SET estado = ? WHERE id = ? AND institucion_id = ?', [estadoNuevo, id, institucionId]);
  await registrarAuditoria({ usuarioId, accion: 'lead_estado', detalle: `de ${lead.estado} a ${estadoNuevo}`, ip });
  return { id: lead.id, estado: estadoNuevo };
}

export async function registrarInteraccion(leadId, { tipo, detalle }, usuarioId, ip) {
  if (!TIPOS_INTERACCION.includes(tipo)) throw new ErrorVisible('Tipo de interacción no reconocido.');
  const limpio = detalle?.trim() || null;
  if (limpio && !validarLargo(limpio, LARGOS.detalle)) throw new ErrorVisible(`El detalle no puede pasar de ${LARGOS.detalle} caracteres.`);
  // la interacción no tiene institución propia: la hereda del lead, que se filtra acá
  const [[lead]] = await bd.query(
    'SELECT id FROM leads WHERE id = ? AND institucion_id = ?',
    [leadId, institucionDelPedido()]
  );
  if (!lead) throw new ErrorVisible('Interesado no encontrado.', 404);
  const [resultado] = await bd.query(
    'INSERT INTO interacciones (lead_id, usuario_id, tipo, detalle) VALUES (?, ?, ?, ?)',
    [leadId, usuarioId, tipo, limpio]
  );
  await registrarAuditoria({ usuarioId, accion: 'interaccion_registrada', detalle: `lead ${lead.id} · ${tipo}`, ip });
  return { id: resultado.insertId, leadId: lead.id, tipo, detalle: limpio };
}

// la baja lógica y el consentimiento viven en bajas.js
export { darDeBaja, reactivar, revocarConsentimiento } from './bajas.js';
