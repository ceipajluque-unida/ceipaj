import { bd } from '../../servidor/bd/conexion.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { validarLargo, LARGOS } from '../../comun/validar.js';
import { ESTADOS_LEAD, TIPOS_ACCION_SEGUIMIENTO, LIMITES } from '../../configuracion/ajustes.js';
import { institucionActual } from '../../servidor/contexto.js';

const ULTIMA_ACCION = '(SELECT MAX(s.fecha) FROM acciones_seguimiento s WHERE s.lead_id = l.id)';

function institucionDelPedido() {
  const id = institucionActual();
  if (!id) throw new ErrorVisible('Esta operación es de una institución.', 403);
  return id;
}

export async function listarEstudiantes() {
  const [filas] = await bd.query(
    `SELECT l.id, l.nombre, l.cedula, l.telefono, l.fecha_conversion,
            ${ULTIMA_ACCION} AS ultima_accion,
            DATEDIFF(NOW(), COALESCE(${ULTIMA_ACCION}, l.fecha_conversion)) AS dias_sin_accion
       FROM leads l
       WHERE l.estado = ? AND l.institucion_id = ? AND l.activo = 1
       ORDER BY dias_sin_accion DESC`,
    [ESTADOS_LEAD.MATRICULADO, institucionDelPedido()]
  );
  const diasRiesgo = ajustes.leerNumero('DIAS_SIN_ACOMPANAMIENTO_RIESGO', LIMITES.DIAS_SIN_ACOMPANAMIENTO_RIESGO);
  return filas.map((fila) => ({
    ...fila,
    en_riesgo: fila.dias_sin_accion > diasRiesgo,
  }));
}

export async function listarAcciones(leadId) {
  const [[lead]] = await bd.query(
    'SELECT id FROM leads WHERE id = ? AND institucion_id = ? AND activo = 1',
    [leadId, institucionDelPedido()]
  );
  if (!lead) throw new ErrorVisible('Estudiante no encontrado.', 404);

  const [acciones] = await bd.query(
    `SELECT s.id, s.tipo, s.detalle, s.fecha, u.nombre AS usuario
       FROM acciones_seguimiento s
       JOIN usuarios u ON u.id = s.usuario_id
       WHERE s.lead_id = ?
       ORDER BY s.fecha DESC`,
    [leadId]
  );
  return acciones;
}

export async function registrarAccion(leadId, { tipo, detalle }, usuarioId, ip) {
  if (!TIPOS_ACCION_SEGUIMIENTO.includes(tipo)) throw new ErrorVisible('Tipo de acción no reconocido.');
  const limpio = detalle?.trim() || null;
  if (limpio && !validarLargo(limpio, LARGOS.detalle)) throw new ErrorVisible(`El detalle no puede pasar de ${LARGOS.detalle} caracteres.`);
  const [[lead]] = await bd.query(
    'SELECT id, estado FROM leads WHERE id = ? AND institucion_id = ? AND activo = 1',
    [leadId, institucionDelPedido()]
  );
  if (!lead) throw new ErrorVisible('Estudiante no encontrado.', 404);
  if (lead.estado !== ESTADOS_LEAD.MATRICULADO) {
    throw new ErrorVisible('Solo se registran acciones sobre estudiantes matriculados.');
  }
  const [resultado] = await bd.query(
    'INSERT INTO acciones_seguimiento (lead_id, usuario_id, tipo, detalle) VALUES (?, ?, ?, ?)',
    [leadId, usuarioId, tipo, limpio]
  );
  await registrarAuditoria({ usuarioId, accion: 'accion_seguimiento_registrada', detalle: `lead ${lead.id} — ${tipo}`, ip });
  return { id: resultado.insertId, leadId: lead.id, tipo, detalle: limpio };
}
