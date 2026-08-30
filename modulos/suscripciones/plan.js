import { bd } from '../../servidor/bd/conexion.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { institucionActual } from '../../servidor/contexto.js';
import { MODULOS_NUCLEO, SUSCRIPCION, ESTADOS_SUSCRIPCION, PLANES_SUSCRIPCION } from '../../configuracion/ajustes.js';
import { buscar as buscarPlanActivo } from '../planes/servicio.js';

const cache = new Map();

export function limpiarCachePlan(institucionId = institucionActual()) {
  if (institucionId === null) cache.clear();
  else cache.delete(institucionId);
}

const PLAN_DEL_PROVEEDOR = {
  clave: 'proveedor', texto: 'Proveedor', maxUsuarios: null, maxAliados: null, encontrado: true,
  vigente: true, fechaFin: null, diasRestantes: null,
};

async function resolver(institucionId) {
  const [[vigente]] = await bd.query(
    `SELECT plan, fecha_fin, DATEDIFF(fecha_fin, NOW()) AS dias_restantes
       FROM suscripciones
      WHERE institucion_id = ? AND estado = ? AND fecha_inicio <= NOW() AND fecha_fin > NOW()
      ORDER BY fecha_inicio DESC LIMIT 1`,
    [institucionId, ESTADOS_SUSCRIPCION.ACTIVA]
  );
  const clave = vigente?.plan ?? ajustes.leer('PLAN_AL_VENCER', SUSCRIPCION.PLAN_AL_VENCER);
  const plan = await buscarPlanActivo(clave);
  const minimo = PLANES_SUSCRIPCION[0];
  return {
    clave,
    texto: plan?.texto ?? minimo.texto,
    maxUsuarios: plan ? plan.maxUsuarios : minimo.maxUsuarios,
    maxAliados: plan ? plan.maxAliados : minimo.maxAliados,
    encontrado: Boolean(plan),
    vigente: Boolean(vigente),
    fechaFin: vigente?.fecha_fin ?? null,
    diasRestantes: vigente ? Number(vigente.dias_restantes) : null,
  };
}

export async function planEnVigor() {
  const institucionId = institucionActual();
  if (institucionId === null) return PLAN_DEL_PROVEEDOR;
  const ahora = Date.now();
  const guardado = cache.get(institucionId);
  if (guardado && ahora < guardado.vence) return guardado.plan;
  const plan = await resolver(institucionId);
  cache.set(institucionId, { plan, vence: ahora + SUSCRIPCION.SEGUNDOS_CACHE_PLAN * 1000 });
  return plan;
}
