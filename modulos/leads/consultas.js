import { bd } from '../../servidor/bd/conexion.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { institucionActual } from '../../servidor/contexto.js';
import { ESTADOS_LEAD, LIMITES } from '../../configuracion/ajustes.js';
import { transicionesPosibles } from './estados.js';

const ULTIMA_INTERACCION = '(SELECT MAX(i.fecha) FROM interacciones i WHERE i.lead_id = l.id)';

export function institucionDelPedido() {
  const institucionId = institucionActual();
  if (!institucionId) throw new ErrorVisible('Esta operación es de una institución.', 403);
  return institucionId;
}

const escaparLike = (texto) => String(texto).replace(/[\\%_]/g, (c) => `\\${c}`);

export async function listarLeads({ estado, canal, buscar, aliado, incluirBajas } = {}) {
  const condiciones = ['l.institucion_id = ?'];
  const parametros = [institucionDelPedido()];

  if (!incluirBajas) condiciones.push('l.activo = 1');
  if (estado) { condiciones.push('l.estado = ?'); parametros.push(estado); }
  if (canal) { condiciones.push('l.canal = ?'); parametros.push(canal); }
  if (aliado) { condiciones.push('l.aliado_id = ?'); parametros.push(aliado); }
  if (buscar) {
    condiciones.push('(l.nombre LIKE ? OR l.cedula LIKE ?)');
    const patron = `%${escaparLike(buscar)}%`;
    parametros.push(patron, patron);
  }
  const filtro = `WHERE ${condiciones.join(' AND ')}`;
  const [filas] = await bd.query(
    `SELECT l.id, l.nombre, l.cedula, l.telefono, l.correo, l.canal, l.estado,
            l.activo, l.motivo_baja, l.fecha_conversion, l.creado_en, u.nombre AS aliado,
            ${ULTIMA_INTERACCION} AS ultima_interaccion
       FROM leads l
       LEFT JOIN aliados a ON a.id = l.aliado_id
       LEFT JOIN usuarios u ON u.id = a.usuario_id
       ${filtro}
       ORDER BY l.creado_en DESC
       LIMIT 200`,
    parametros
  );
  return filas;
}

export async function listarAlertas() {
  const [filas] = await bd.query(
    `SELECT l.id, l.nombre, l.cedula, l.canal, l.estado,
            DATEDIFF(NOW(), COALESCE(${ULTIMA_INTERACCION}, l.creado_en)) AS dias_sin_contacto
       FROM leads l
       WHERE l.estado IN (?, ?) AND l.activo = 1 AND l.institucion_id = ?
       HAVING dias_sin_contacto > ?
       ORDER BY dias_sin_contacto DESC`,
    [ESTADOS_LEAD.NUEVO, ESTADOS_LEAD.INTERESADO, institucionDelPedido(),
      ajustes.leerNumero('DIAS_SIN_SEGUIMIENTO_PARA_ALERTA', LIMITES.DIAS_SIN_SEGUIMIENTO_PARA_ALERTA)]
  );
  return filas;
}

export async function obtenerLead(id) {
  const [[lead]] = await bd.query(
    `SELECT l.*, u.nombre AS aliado
       FROM leads l
       LEFT JOIN aliados a ON a.id = l.aliado_id
       LEFT JOIN usuarios u ON u.id = a.usuario_id
       WHERE l.id = ? AND l.institucion_id = ?`,
    [id, institucionDelPedido()]
  );

  if (!lead) throw new ErrorVisible('Interesado no encontrado.', 404);

  const [interacciones] = await bd.query(
    `SELECT i.id, i.tipo, i.detalle, i.fecha, u.nombre AS usuario
       FROM interacciones i
       JOIN usuarios u ON u.id = i.usuario_id
       WHERE i.lead_id = ?
       ORDER BY i.fecha DESC`,
    [id]
  );
  return { ...lead, interacciones, transiciones: transicionesPosibles(lead) };
}

export async function listarAliadosParaElegir() {
  const [filas] = await bd.query(
    `SELECT a.id, u.nombre
       FROM aliados a JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.institucion_id = ? AND u.activo = 1
      ORDER BY u.nombre`,
    [institucionDelPedido()]
  );
  return filas;
}
