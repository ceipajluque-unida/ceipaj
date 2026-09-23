import { ESTADOS_LEAD } from '../../configuracion/ajustes.js';

const TRANSICIONES = {
  [ESTADOS_LEAD.NUEVO]: [ESTADOS_LEAD.INTERESADO, ESTADOS_LEAD.PERDIDO],
  [ESTADOS_LEAD.INTERESADO]: [ESTADOS_LEAD.MATRICULADO, ESTADOS_LEAD.PERDIDO],
  [ESTADOS_LEAD.PERDIDO]: [ESTADOS_LEAD.INTERESADO],
  [ESTADOS_LEAD.MATRICULADO]: [],
};

export function puedeCambiar(estadoActual, estadoNuevo) {
  return (TRANSICIONES[estadoActual] ?? []).includes(estadoNuevo);
}

export function transicionesPosibles(lead) {
  return lead.activo ? TRANSICIONES[lead.estado] ?? [] : [];
}

// quien esta dado de baja queda fuera del circuito: no avanza de estado ni se
// matricula, ni a mano ni por el cruce con el academico
export function motivoDeBloqueo(lead) {
  if (lead.activo) return null;
  if (lead.consentimiento_revocado_en) {
    return `${lead.nombre} revocó la autorización para usar sus datos (Ley 7593), así que no puede matricularse `
      + 'ni cambiar de estado, y tampoco se puede reactivar.';
  }
  return `${lead.nombre} está dado de baja, así que no puede matricularse ni cambiar de estado. `
    + 'Si retomó el contacto, primero hay que reactivarlo desde su ficha.';
}
