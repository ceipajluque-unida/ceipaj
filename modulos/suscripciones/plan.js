// qué habilita el plan contratado. lo consultan el middleware de módulos y el tope
// de usuarios, así que el resultado se cachea unos segundos para no pegarle a la
// base en cada pedido. la consulta va acá y no en servicio.js para que servicio
// pueda invalidar el caché sin que los dos archivos se importen en círculo.
import { bd } from '../../servidor/bd/conexion.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { institucionActual } from '../../servidor/contexto.js';
import { MODULOS_NUCLEO, SUSCRIPCION, ESTADOS_SUSCRIPCION } from '../../configuracion/ajustes.js';
import { buscar as buscarPlanActivo } from '../planes/servicio.js';

// el plan es de cada institución, así que el caché va por institución. con uno solo,
// el primero en consultar le prestaba su plan a todos: un colegio con el básico
// terminaba usando los módulos del avanzado que pagó otro.
const cache = new Map();

// sin id se limpia todo, que es lo que corresponde a las tareas periódicas
export function limpiarCachePlan(institucionId = institucionActual()) {
  if (institucionId === null) cache.clear();
  else cache.delete(institucionId);
}

// el proveedor del servicio no contrata la plataforma: sus pantallas no pasan por el
// candado del plan, y su acceso ya lo limita el rol
const PLAN_DEL_PROVEEDOR = {
  clave: 'proveedor', texto: 'Proveedor', modulos: [], maxUsuarios: null,
  vigente: true, fechaFin: null, diasRestantes: null,
};

// sin suscripción vigente no se cierra el sistema: se cae al plan configurado, que
// deja trabajar con lo básico y entrar a pagar la renovación.
async function resolver(institucionId) {
  // manda la que cubre el momento actual, no la que termina más tarde: al renovar,
  // el período nuevo se encadena después del vigente y todavía no rige.
  const [[vigente]] = await bd.query(
    `SELECT plan, fecha_fin, DATEDIFF(fecha_fin, NOW()) AS dias_restantes
       FROM suscripciones
      WHERE institucion_id = ? AND estado = ? AND fecha_inicio <= NOW() AND fecha_fin > NOW()
      ORDER BY fecha_inicio DESC LIMIT 1`,
    [institucionId, ESTADOS_SUSCRIPCION.ACTIVA]
  );
  const clave = vigente?.plan ?? ajustes.leer('PLAN_AL_VENCER', SUSCRIPCION.PLAN_AL_VENCER);
  const plan = await buscarPlanActivo(clave);
  return {
    clave,
    texto: plan?.texto ?? clave,
    modulos: plan?.modulos ?? [], // lista vacía significa "todos los módulos"
    maxUsuarios: plan?.maxUsuarios ?? null,
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

// el núcleo (usuarios, configuración, suscripción, pagos, auditoría) nunca se
// bloquea: si el vencimiento tapara pagos, no habría forma de renovar.
export function moduloIncluido(plan, modulo) {
  if (MODULOS_NUCLEO.includes(modulo)) return true;
  if (!plan || plan.modulos.length === 0) return true;
  return plan.modulos.includes(modulo);
}

export async function modulosHabilitados(claves) {
  const plan = await planEnVigor();
  return claves.filter((clave) => moduloIncluido(plan, clave));
}
