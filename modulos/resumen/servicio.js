// contadores de pendientes por módulo para los badges del menú, según el rol
import { bd } from '../../servidor/bd/conexion.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { institucionActual } from '../../servidor/contexto.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { PERMISOS } from '../../configuracion/permisos.js';
import { LIMITES, ESTADOS_LEAD } from '../../configuracion/ajustes.js';
import { contarPorVencer } from '../suscripciones/servicio.js';

export async function contarBadges(rol) {
  const puede = (modulo) => PERMISOS[modulo]?.includes(rol);
  const badges = {};
  // todo lo que se cuenta acá es de una institución. el superadministrador no tiene
  // ninguno de estos módulos, así que se va con los badges vacíos y nunca llega a pedirla.
  const institucion = () => {
    const id = institucionActual();
    if (id === null) throw new ErrorVisible('Esta operación es de una institución.', 403);
    return id;
  };

  if (puede('leads')) {
    // leads nuevo/interesado sin interacción hace más de los días configurados
    const dias = ajustes.leerNumero('DIAS_SIN_SEGUIMIENTO_PARA_ALERTA', LIMITES.DIAS_SIN_SEGUIMIENTO_PARA_ALERTA);
    const [[fila]] = await bd.query(
      `SELECT COUNT(*) AS total FROM leads l
        WHERE l.estado IN (?, ?)
          AND l.institucion_id = ? AND l.activo = 1
          AND COALESCE((SELECT MAX(i.fecha) FROM interacciones i WHERE i.lead_id = l.id), l.creado_en) < (NOW() - INTERVAL ? DAY)`,
      [ESTADOS_LEAD.NUEVO, ESTADOS_LEAD.INTERESADO, institucion(), dias]
    );
    badges.leads = Number(fila.total);
  }

  if (puede('seguimiento')) {
    // estudiantes matriculados sin acompañamiento hace más de los días configurados
    const dias = ajustes.leerNumero('DIAS_SIN_ACOMPANAMIENTO_RIESGO', LIMITES.DIAS_SIN_ACOMPANAMIENTO_RIESGO);
    const [[fila]] = await bd.query(
      `SELECT COUNT(*) AS total FROM leads l
        WHERE l.estado = ?
          AND l.institucion_id = ? AND l.activo = 1
          AND COALESCE((SELECT MAX(a.fecha) FROM acciones_seguimiento a WHERE a.lead_id = l.id), l.fecha_conversion) < (NOW() - INTERVAL ? DAY)`,
      [ESTADOS_LEAD.MATRICULADO, institucion(), dias]
    );
    badges.seguimiento = Number(fila.total);
  }

  if (puede('comisiones')) {
    // comisiones no tiene institución propia: cuelga del aliado
    const [[fila]] = await bd.query(
      `SELECT COUNT(*) AS total FROM comisiones c
         JOIN aliados a ON a.id = c.aliado_id
        WHERE c.estado = 'pendiente' AND a.institucion_id = ?`,
      [institucion()]
    );
    badges.comisiones = Number(fila.total);
  }

  if (puede('pagos')) {
    const [[fila]] = await bd.query(
      "SELECT COUNT(*) AS total FROM pagos WHERE estado = 'pendiente' AND institucion_id = ?",
      [institucion()]
    );
    badges.pagos = Number(fila.total);
  }

  if (puede('suscripcion')) {
    badges.suscripcion = await contarPorVencer();
  }

  return badges;
}
