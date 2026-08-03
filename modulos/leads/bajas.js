// baja lógica del interesado y revocación del consentimiento. no hay borrado físico:
// se llevaría por delante las interacciones, las acciones de seguimiento y las comisiones.
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
  await registrarAuditoria({ usuarioId, accion: 'lead_dado_de_baja', detalle: `lead ${id} · ${texto}`, ip });
  return { id: Number(id), activo: false, motivo_baja: texto };
}

export async function reactivar(id, usuarioId, ip) {
  const [resultado] = await bd.query(
    'UPDATE leads SET activo = 1, motivo_baja = NULL WHERE id = ? AND activo = 0 AND institucion_id = ?',
    [id, institucionDelPedido()]
  );
  if (resultado.affectedRows === 0) throw new ErrorVisible('El interesado no existe o ya estaba activo.', 404);
  await registrarAuditoria({ usuarioId, accion: 'lead_reactivado', detalle: `lead ${id}`, ip });
  return { id: Number(id), activo: true };
}

// la ley 7593 y la propia política del sistema le dan al titular el derecho a revocar.
// al revocar se da de baja el registro: sin consentimiento no se lo puede seguir contactando.
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
