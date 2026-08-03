// transiciones de estado de un lead. es regla del negocio, por eso vive acá y no en configuración.
import { ESTADOS_LEAD } from '../../configuracion/ajustes.js';

const TRANSICIONES = {
  [ESTADOS_LEAD.NUEVO]: [ESTADOS_LEAD.INTERESADO, ESTADOS_LEAD.PERDIDO],
  [ESTADOS_LEAD.INTERESADO]: [ESTADOS_LEAD.MATRICULADO, ESTADOS_LEAD.PERDIDO],
  [ESTADOS_LEAD.PERDIDO]: [ESTADOS_LEAD.INTERESADO], // un perdido puede recuperarse
  [ESTADOS_LEAD.MATRICULADO]: [], // estado final, de una matrícula no se vuelve atrás
};

export function puedeCambiar(estadoActual, estadoNuevo) {
  return (TRANSICIONES[estadoActual] ?? []).includes(estadoNuevo);
}

export function transicionesPosibles(estado) {
  return TRANSICIONES[estado] ?? [];
}
