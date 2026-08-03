// portal del aliado, su puntaje, sus interesados y el alta de recomendados
import { bd } from '../../servidor/bd/conexion.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { institucionActual } from '../../servidor/contexto.js';
import { ESTADOS_LEAD, ALIADOS } from '../../configuracion/ajustes.js';
import { crearLead } from '../leads/servicio.js';

// todo lo que entra por el portal viene recomendado por un aliado
const CANAL_PORTAL = 'aliado';

// del usuario logueado a su perfil de aliado, así nunca ve ni carga datos de otro. el
// id no viene de la url sino de la sesión, y encima se pide que sea de la institución
// del pedido, para que un traspaso mal hecho no cruce colegios.
async function aliadoDelUsuario(usuarioId) {
  const institucionId = institucionActual();
  if (institucionId === null) throw new ErrorVisible('Esta operación es de una institución.', 403);
  const [[aliado]] = await bd.query(
    'SELECT id, institucion_id FROM aliados WHERE usuario_id = ? AND institucion_id = ?',
    [usuarioId, institucionId]
  );
  if (!aliado) throw new ErrorVisible('Tu cuenta no tiene perfil de aliado.', 403);
  return aliado;
}

export async function obtenerResumen(usuarioId) {
  const aliado = await aliadoDelUsuario(usuarioId);
  const [[totales]] = await bd.query(
    'SELECT COUNT(*) AS totalLeads, SUM(estado = ?) AS convertidos FROM leads WHERE aliado_id = ? AND institucion_id = ?',
    [ESTADOS_LEAD.MATRICULADO, aliado.id, aliado.institucion_id]
  );
  const totalLeads = Number(totales.totalLeads);
  const convertidos = Number(totales.convertidos ?? 0);
  const puntosPorLead = ajustes.leerNumero('PUNTOS_POR_LEAD', ALIADOS.PUNTOS_POR_LEAD);
  const puntosPorConversion = ajustes.leerNumero('PUNTOS_POR_CONVERSION', ALIADOS.PUNTOS_POR_CONVERSION);
  return {
    totalLeads,
    convertidos,
    puntos: totalLeads * puntosPorLead + convertidos * puntosPorConversion,
    puntosPorLead,
    puntosPorConversion,
  };
}

// el aliado solo ve sus propios interesados, más nuevos primero
export async function listarMisLeads(usuarioId) {
  const aliado = await aliadoDelUsuario(usuarioId);
  const [filas] = await bd.query(
    'SELECT id, nombre, estado, creado_en FROM leads WHERE aliado_id = ? AND institucion_id = ? ORDER BY creado_en DESC',
    [aliado.id, aliado.institucion_id]
  );
  return filas;
}

// acá solo fijamos el canal y el aliado dueño, lo demás lo valida crearLead
export async function registrarLead(usuarioId, { nombre, cedula, telefono, correo, consentimiento }, ip) {
  const aliado = await aliadoDelUsuario(usuarioId);
  return crearLead(
    { nombre, cedula, telefono, correo, canal: CANAL_PORTAL, consentimiento, aliadoId: aliado.id, creadoPor: usuarioId },
    ip
  );
}
