import { bd } from '../../servidor/bd/conexion.js';

// indicadores del negocio del proveedor: cuántas instituciones usan el sistema,
// qué plan tiene cada una y cuánto se recaudó. no pasa por institucionActual()
// a proposito: el proveedor mira todas, no una.

export async function resumen() {
  const [[cifras]] = await bd.query(`
    SELECT
      (SELECT COUNT(*) FROM instituciones)                                    AS instituciones,
      (SELECT COUNT(*) FROM instituciones WHERE activo = 1)                   AS activas,
      (SELECT COUNT(*) FROM usuarios WHERE activo = 1 AND institucion_id IS NOT NULL) AS usuarios,
      (SELECT COUNT(*) FROM aliados a JOIN usuarios u ON u.id = a.usuario_id
        WHERE u.activo = 1)                                                   AS aliados,
      (SELECT COUNT(*) FROM suscripciones WHERE estado = 'activa' AND fecha_fin > NOW()) AS suscripcionesVigentes,
      (SELECT COUNT(DISTINCT institucion_id) FROM suscripciones
        WHERE estado = 'activa' AND fecha_fin > NOW())                        AS conPlanVigente,
      (SELECT IFNULL(SUM(monto), 0) FROM pagos WHERE estado = 'exitoso')      AS recaudado,
      (SELECT COUNT(*) FROM pagos WHERE estado = 'exitoso')                   AS pagos,
      (SELECT COUNT(*) FROM pagos WHERE estado = 'pendiente')                 AS pagosPendientes,
      (SELECT COUNT(*) FROM solicitudes WHERE estado = 'nueva')               AS solicitudesNuevas`);
  return cifras;
}

// cuánto aporta cada plan: sirve para saber cuál sostiene el negocio
export async function porPlan() {
  const [filas] = await bd.query(`
    SELECT p.clave, p.titulo, p.precio,
           COUNT(DISTINCT CASE WHEN s.estado = 'activa' AND s.fecha_fin > NOW()
                               THEN s.institucion_id END) AS institucionesVigentes,
           COUNT(s.id)                                     AS periodosContratados,
           IFNULL(SUM(CASE WHEN pa.estado = 'exitoso' THEN pa.monto END), 0) AS recaudado
      FROM planes p
      LEFT JOIN suscripciones s ON s.plan = p.clave
      LEFT JOIN pagos pa ON pa.id = s.pago_id
     GROUP BY p.clave, p.titulo, p.precio, p.orden
     ORDER BY p.orden`);
  return filas;
}

// una fila por institución, con su plan vigente y lo que lleva pagado
export async function porInstitucion() {
  const [filas] = await bd.query(`
    SELECT i.id, i.nombre, i.ciudad, i.activo, i.creado_en,
           (SELECT COUNT(*) FROM usuarios u WHERE u.institucion_id = i.id AND u.activo = 1) AS usuarios,
           (SELECT COUNT(*) FROM aliados a JOIN usuarios ua ON ua.id = a.usuario_id
             WHERE a.institucion_id = i.id AND ua.activo = 1)                                AS aliados,
           (SELECT COUNT(*) FROM leads l WHERE l.institucion_id = i.id AND l.activo = 1)    AS interesados,
           v.plan AS planVigente, v.fecha_fin AS venceEl,
           (SELECT IFNULL(SUM(pg.monto), 0) FROM pagos pg
             WHERE pg.institucion_id = i.id AND pg.estado = 'exitoso')                      AS pagado
      FROM instituciones i
      LEFT JOIN (
        SELECT s1.institucion_id, s1.plan, s1.fecha_fin
          FROM suscripciones s1
          JOIN (SELECT institucion_id, MAX(fecha_fin) AS tope FROM suscripciones
                 WHERE estado = 'activa' AND fecha_fin > NOW() GROUP BY institucion_id) s2
            ON s2.institucion_id = s1.institucion_id AND s2.tope = s1.fecha_fin
      ) v ON v.institucion_id = i.id
     ORDER BY i.nombre`);
  return filas;
}

// recaudación mes a mes, para ver la tendencia
export async function porMes(meses = 12) {
  const tope = Math.min(Math.max(Number(meses) || 12, 1), 36);
  const [filas] = await bd.query(`
    SELECT DATE_FORMAT(fecha_pago, '%Y-%m') AS mes,
           COUNT(*) AS pagos, SUM(monto) AS recaudado
      FROM pagos
     WHERE estado = 'exitoso' AND fecha_pago IS NOT NULL
       AND fecha_pago >= DATE_SUB(NOW(), INTERVAL ? MONTH)
     GROUP BY mes ORDER BY mes`, [tope]);
  return filas;
}
