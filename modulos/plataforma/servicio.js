import { bd } from '../../servidor/bd/conexion.js';

// indicadores del negocio del proveedor: cuántas instituciones usan el sistema,
// qué plan tiene cada una y cuánto se recaudó. no pasa por institucionActual()
// a proposito: el proveedor mira todas, no una.

// una institucion puede tener varios periodos activos a la vez (renovaciones
// encadenadas, o pruebas apiladas). el que manda es el que llega mas lejos, que
// es el mismo criterio que usa el modulo de suscripciones para decidir el plan.
const PLAN_QUE_RIGE = `
  SELECT i.id AS institucion_id,
         (SELECT s.plan FROM suscripciones s
           WHERE s.institucion_id = i.id AND s.estado = 'activa' AND s.fecha_fin > NOW()
           ORDER BY s.fecha_fin DESC, s.id DESC LIMIT 1) AS plan
    FROM instituciones i`;

export async function resumen() {
  const [[cifras]] = await bd.query(`
    SELECT
      (SELECT COUNT(*) FROM instituciones)                                    AS instituciones,
      (SELECT COUNT(*) FROM instituciones WHERE activo = 1)                   AS activas,
      (SELECT COUNT(*) FROM instituciones WHERE activo = 0)                   AS suspendidas,
      (SELECT COUNT(*) FROM usuarios WHERE activo = 1 AND institucion_id IS NOT NULL) AS usuarios,
      (SELECT COUNT(*) FROM aliados a JOIN usuarios u ON u.id = a.usuario_id
        WHERE u.activo = 1)                                                   AS aliados,
      (SELECT COUNT(*) FROM leads WHERE activo = 1)                           AS interesados,
      (SELECT IFNULL(SUM(monto), 0) FROM pagos WHERE estado = 'exitoso')      AS recaudado,
      (SELECT COUNT(*) FROM pagos WHERE estado = 'exitoso')                   AS pagos,
      (SELECT COUNT(*) FROM pagos WHERE estado = 'pendiente')                 AS pagosPendientes,
      (SELECT IFNULL(SUM(monto), 0) FROM pagos WHERE estado = 'pendiente')    AS montoPendiente,
      (SELECT COUNT(*) FROM solicitudes WHERE estado = 'nueva')               AS solicitudesNuevas`);

  // lo que entra cada mes si nadie se da de baja: el precio de lista del plan
  // que rige en cada institucion, sumado
  const [[recurrente]] = await bd.query(`
    SELECT COUNT(*) AS conPlanVigente, IFNULL(SUM(pl.precio), 0) AS ingresoMensual
      FROM (${PLAN_QUE_RIGE}) v
      JOIN planes pl ON pl.clave = v.plan`);

  const pagos = Number(cifras.pagos);
  return {
    ...cifras,
    conPlanVigente: recurrente.conPlanVigente,
    sinPlanPago: Number(cifras.instituciones) - Number(recurrente.conPlanVigente),
    ingresoMensual: recurrente.ingresoMensual,
    ticketPromedio: pagos > 0 ? Math.round(Number(cifras.recaudado) / pagos) : 0,
  };
}

// cuanto factura cada plan: sirve para saber cual sostiene el negocio
export async function porPlan() {
  const [filas] = await bd.query(`
    SELECT p.clave, p.titulo, p.precio,
           (SELECT COUNT(*) FROM (${PLAN_QUE_RIGE}) v WHERE v.plan = p.clave) AS institucionesVigentes,
           COUNT(s.id)                                                        AS periodosVendidos,
           IFNULL(SUM(CASE WHEN pa.estado = 'exitoso' THEN pa.monto END), 0)  AS recaudado
      FROM planes p
      LEFT JOIN suscripciones s ON s.plan = p.clave
      LEFT JOIN pagos pa ON pa.id = s.pago_id
     GROUP BY p.clave, p.titulo, p.precio, p.orden
     ORDER BY p.orden`);

  const total = filas.reduce((suma, f) => suma + Number(f.recaudado), 0);
  return filas.map((f) => ({
    ...f,
    ingresoMensual: Number(f.institucionesVigentes) * Number(f.precio),
    participacion: total > 0 ? Math.round((Number(f.recaudado) / total) * 1000) / 10 : 0,
  }));
}

// una fila por institucion, con el estado real de su plan
export async function porInstitucion() {
  const [filas] = await bd.query(`
    SELECT i.id, i.nombre, i.ciudad, i.activo, i.creado_en,
           (SELECT COUNT(*) FROM usuarios u WHERE u.institucion_id = i.id AND u.activo = 1) AS usuarios,
           (SELECT COUNT(*) FROM aliados a JOIN usuarios ua ON ua.id = a.usuario_id
             WHERE a.institucion_id = i.id AND ua.activo = 1)                                AS aliados,
           (SELECT COUNT(*) FROM leads l WHERE l.institucion_id = i.id AND l.activo = 1)    AS interesados,
           (SELECT s.plan FROM suscripciones s
             WHERE s.institucion_id = i.id AND s.estado = 'activa' AND s.fecha_fin > NOW()
             ORDER BY s.fecha_fin DESC, s.id DESC LIMIT 1)                                  AS planVigente,
           (SELECT s.fecha_fin FROM suscripciones s
             WHERE s.institucion_id = i.id AND s.estado = 'activa' AND s.fecha_fin > NOW()
             ORDER BY s.fecha_fin DESC, s.id DESC LIMIT 1)                                  AS venceEl,
           (SELECT s.plan FROM suscripciones s WHERE s.institucion_id = i.id
             ORDER BY s.fecha_fin DESC, s.id DESC LIMIT 1)                                  AS ultimoPlan,
           (SELECT s.fecha_fin FROM suscripciones s WHERE s.institucion_id = i.id
             ORDER BY s.fecha_fin DESC, s.id DESC LIMIT 1)                                  AS vencioEl,
           (SELECT IFNULL(SUM(pg.monto), 0) FROM pagos pg
             WHERE pg.institucion_id = i.id AND pg.estado = 'exitoso')                      AS pagado
      FROM instituciones i
     ORDER BY i.nombre`);

  const hoy = Date.now();
  const dias = (fecha) => Math.floor((hoy - new Date(fecha).getTime()) / 86400000);
  return filas.map((f) => {
    if (f.planVigente) return { ...f, estadoPlan: 'vigente', diasVencido: 0, diasParaVencer: -dias(f.venceEl) };
    if (f.ultimoPlan) return { ...f, estadoPlan: 'vencido', diasVencido: Math.max(dias(f.vencioEl), 0), diasParaVencer: 0 };
    return { ...f, estadoPlan: 'sin_plan', diasVencido: 0, diasParaVencer: 0 };
  });
}

// recaudacion mes a mes, para ver la tendencia
export async function porMes(meses = 12) {
  const tope = Math.min(Math.max(Number(meses) || 12, 1), 36);
  const [filas] = await bd.query(`
    SELECT DATE_FORMAT(fecha_pago, '%Y-%m') AS mes,
           COUNT(*) AS pagos, SUM(monto) AS recaudado,
           COUNT(DISTINCT institucion_id) AS instituciones
      FROM pagos
     WHERE estado = 'exitoso' AND fecha_pago IS NOT NULL
       AND fecha_pago >= DATE_SUB(NOW(), INTERVAL ? MONTH)
     GROUP BY mes ORDER BY mes`, [tope]);
  return filas;
}
