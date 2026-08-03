// indicadores gerenciales en una sola respuesta, para inicio y reportes
import { bd } from '../../servidor/bd/conexion.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { institucionActual } from '../../servidor/contexto.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { ESTADOS_LEAD, ESTADOS_PAGO, ALIADOS, LIMITES } from '../../configuracion/ajustes.js';

// última fecha por subconsulta en vez de group by, así funciona igual en mysql y mariadb
const ULTIMA_INTERACCION = '(SELECT MAX(i.fecha) FROM interacciones i WHERE i.lead_id = l.id)';
const ULTIMA_ACCION = '(SELECT MAX(s.fecha) FROM acciones_seguimiento s WHERE s.lead_id = l.id)';

export async function obtenerIndicadores() {
  // los números son de una institución; el proveedor no mira los de sus clientes
  const institucionId = institucionActual();
  if (institucionId === null) throw new ErrorVisible('Esta operación es de una institución.', 403);

  const [[totales]] = await bd.query(
    'SELECT COUNT(*) AS totalLeads, COALESCE(SUM(estado = ?), 0) AS conversiones FROM leads WHERE institucion_id = ? AND activo = 1',
    [ESTADOS_LEAD.MATRICULADO, institucionId]
  );
  const totalLeads = Number(totales.totalLeads);
  const conversiones = Number(totales.conversiones);

  const [leadsPorCanal] = await bd.query(
    'SELECT canal, COUNT(*) AS total FROM leads WHERE institucion_id = ? AND activo = 1 GROUP BY canal ORDER BY total DESC',
    [institucionId]
  );
  const [leadsPorEstado] = await bd.query(
    'SELECT estado, COUNT(*) AS total FROM leads WHERE institucion_id = ? AND activo = 1 GROUP BY estado ORDER BY total DESC',
    [institucionId]
  );

  // matriculados sin acompañamiento hace demasiados días (desde la conversión si nunca hubo)
  const [[riesgo]] = await bd.query(
    `SELECT COUNT(*) AS total
       FROM leads l
       WHERE l.estado = ?
         AND l.institucion_id = ?
         AND DATEDIFF(NOW(), COALESCE(${ULTIMA_ACCION}, l.fecha_conversion)) > ?`,
    [ESTADOS_LEAD.MATRICULADO, institucionId, ajustes.leerNumero('DIAS_SIN_ACOMPANAMIENTO_RIESGO', LIMITES.DIAS_SIN_ACOMPANAMIENTO_RIESGO)]
  );

  // leads activos sin contacto reciente; si nunca hubo, desde el alta
  const [[alertas]] = await bd.query(
    `SELECT COUNT(*) AS total
       FROM leads l
       WHERE l.estado IN (?, ?)
         AND l.institucion_id = ?
         AND DATEDIFF(NOW(), COALESCE(${ULTIMA_INTERACCION}, l.creado_en)) > ?`,
    [ESTADOS_LEAD.NUEVO, ESTADOS_LEAD.INTERESADO, institucionId, ajustes.leerNumero('DIAS_SIN_SEGUIMIENTO_PARA_ALERTA', LIMITES.DIAS_SIN_SEGUIMIENTO_PARA_ALERTA)]
  );

  const [aliados] = await bd.query(
    `SELECT a.id AS aliado_id, u.nombre AS aliado, a.institucion,
            COUNT(l.id) AS leads, COALESCE(SUM(l.estado = ?), 0) AS convertidos
       FROM aliados a
       JOIN usuarios u ON u.id = a.usuario_id
       LEFT JOIN leads l ON l.aliado_id = a.id AND l.institucion_id = a.institucion_id
       WHERE a.institucion_id = ?
       GROUP BY a.id, u.nombre, a.institucion
       ORDER BY COUNT(l.id) DESC`,
    [ESTADOS_LEAD.MATRICULADO, institucionId]
  );

  const [[pagos]] = await bd.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(estado = ?), 0) AS exitosos,
            COALESCE(SUM(estado = ?), 0) AS pendientes,
            COALESCE(SUM(estado = ?), 0) AS rechazados
       FROM pagos
       WHERE institucion_id = ?`,
    [ESTADOS_PAGO.EXITOSO, ESTADOS_PAGO.PENDIENTE, ESTADOS_PAGO.RECHAZADO, institucionId]
  );

  return {
    totalLeads,
    conversiones,
    // porcentaje con un decimal; sin leads no hay tasa que calcular
    tasaConversion: totalLeads ? Number(((conversiones / totalLeads) * 100).toFixed(1)) : 0,
    leadsPorCanal,
    leadsPorEstado,
    estudiantesEnRiesgo: Number(riesgo.total),
    alertasSeguimiento: Number(alertas.total),
    rendimientoAliados: aliados.map((fila) => ({
      // el id va porque dos aliados pueden llamarse igual y la tabla necesita clave única
      aliado_id: fila.aliado_id,
      aliado: fila.aliado,
      institucion: fila.institucion,
      leads: Number(fila.leads),
      convertidos: Number(fila.convertidos),
      puntos:
        Number(fila.leads) * ajustes.leerNumero('PUNTOS_POR_LEAD', ALIADOS.PUNTOS_POR_LEAD) +
        Number(fila.convertidos) * ajustes.leerNumero('PUNTOS_POR_CONVERSION', ALIADOS.PUNTOS_POR_CONVERSION),
    })),
    pagos: {
      total: Number(pagos.total),
      exitosos: Number(pagos.exitosos),
      pendientes: Number(pagos.pendientes),
      rechazados: Number(pagos.rechazados),
    },
  };
}
