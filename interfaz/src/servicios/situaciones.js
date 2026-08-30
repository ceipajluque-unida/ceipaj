// las seis situaciones en que puede estar un período contratado, con el color
// que le corresponde. viven acá porque las leen dos pantallas: la del colegio y
// la ficha de la institución que ve el proveedor. el rótulo se explica solo, sin
// nota al pie que lo aclare.
export const SITUACION = {
  en_curso: { texto: 'En curso', tono: 'exitoso' },
  programada: { texto: 'Programada', tono: 'nuevo' },
  cubierta: { texto: 'Cubierta por otro período', tono: 'neutro' },
  vencida: { texto: 'Vencida', tono: 'neutro' },
  dada_de_baja: { texto: 'Cancelada por el proveedor', tono: 'rechazado' },
  reemplazada: { texto: 'Reemplazada por un plan superior', tono: 'neutro' },
  inconsistente: { texto: 'Fechas inconsistentes', tono: 'pendiente' },
};

// sobre estas tres todavía se puede actuar: las demás ya están cerradas
export const ABIERTAS = ['en_curso', 'programada', 'cubierta'];

export function situacionDe(clave) {
  return SITUACION[clave] ?? { texto: 'Sin situación', tono: 'neutro' };
}
