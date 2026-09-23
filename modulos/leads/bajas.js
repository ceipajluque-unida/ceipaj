import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { validarLargo, LARGOS } from '../../comun/validar.js';
import { institucionDelPedido } from './consultas.js';

export async function darDeBaja(id, motivo, usuarioId, ip) {
  const texto = String(motivo ?? '').trim();
  if (!texto) throw new ErrorVisible('Escribí el motivo de la baja.');
  if (!validarLargo(texto, LARGOS.motivo)) throw new ErrorVisible(`El motivo no puede pasar de ${LARGOS.motivo} caracteres.`);
  const [resultado] = await bd.query(
    'UPDATE leads SET activo = 0, motivo_baja = ? WHERE id = ? AND activo = 1 AND institucion_id = ?',
    [texto, id, institucionDelPedido()]
  );
  if (resultado.affectedRows === 0) throw new ErrorVisible('El interesado no existe o ya estaba dado de baja.', 404);
  await registrarAuditoria({ usuarioId, accion: 'lead_dado_de_baja', detalle: `lead ${id}: ${texto}`, ip });
  return { id: Number(id), activo: false, motivo_baja: texto };
}

export async function reactivar(id, usuarioId, ip) {
  const institucionId = institucionDelPedido();
  const [[lead]] = await bd.query(
    'SELECT nombre, activo, consentimiento_revocado_en FROM leads WHERE id = ? AND institucion_id = ?',
    [id, institucionId]
  );
  if (!lead) throw new ErrorVisible('Interesado no encontrado.', 404);
  if (lead.activo) throw new ErrorVisible(`${lead.nombre} ya está activo.`, 409);
  if (lead.consentimiento_revocado_en) {
    throw new ErrorVisible(
      `${lead.nombre} revocó la autorización para usar sus datos (Ley 7593), así que no se puede reactivar.`,
      409
    );
  }
  const [resultado] = await bd.query(
    `UPDATE leads SET activo = 1, motivo_baja = NULL
      WHERE id = ? AND activo = 0 AND institucion_id = ? AND consentimiento_revocado_en IS NULL`,
    [id, institucionId]
  );
  if (resultado.affectedRows === 0) {
    throw new ErrorVisible(`${lead.nombre} cambió mientras se procesaba. Recargá su ficha para ver cómo quedó.`, 409);
  }
  await registrarAuditoria({ usuarioId, accion: 'lead_reactivado', detalle: `lead ${id}`, ip });
  return { id: Number(id), activo: true };
}

export async function revocarConsentimiento(id, usuarioId, ip) {
  const [resultado] = await bd.query(
    `UPDATE leads SET consentimiento_datos = 0, consentimiento_revocado_en = NOW(),
            activo = 0, motivo_baja = ?
      WHERE id = ? AND consentimiento_datos = 1 AND institucion_id = ?`,
    ['consentimiento revocado por el titular', id, institucionDelPedido()]
  );
  if (resultado.affectedRows === 0) throw new ErrorVisible('El interesado no existe o ya había revocado su consentimiento.', 404);
  await registrarAuditoria({ usuarioId, accion: 'lead_consentimiento_revocado', detalle: `lead ${id}`, ip });
  return { id: Number(id), consentimiento_datos: 0 };
}
