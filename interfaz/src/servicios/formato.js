// una sola forma de mostrar fechas, montos y textos en todas las pantallas

const GUARANIES = new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 });

export function guaranies(monto) {
  const numero = Number(monto);
  return Number.isFinite(numero) ? GUARANIES.format(numero) : '—';
}

export function fecha(valor) {
  if (!valor) return '—';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '—' : fecha.toLocaleDateString('es-PY');
}

export function fechaHora(valor) {
  if (!valor) return '—';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '—' : fecha.toLocaleString('es-PY');
}

// resuelve el plural de verdad, para no escribir "3 interesado(s)"
export function contar(cantidad, singular, plural) {
  return `${cantidad} ${Number(cantidad) === 1 ? singular : plural}`;
}

// los estados y roles vienen en minúscula de la base y así quedan feos en pantalla
const TEXTOS = {
  administrador: 'Administrador',
  comercial: 'Comercial',
  direccion: 'Dirección',
  aliado: 'Aliado',
  nuevo: 'Nuevo',
  interesado: 'Interesado',
  matriculado: 'Matriculado',
  perdido: 'Perdido',
  pendiente: 'Pendiente',
  pagada: 'Pagada',
  exitoso: 'Exitoso',
  rechazado: 'Rechazado',
  activa: 'Activa',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
  'redes sociales': 'Redes sociales',
  whatsapp: 'WhatsApp',
  llamada: 'Llamada',
  presencial: 'Presencial',
  correo: 'Correo',
  visita: 'Visita',
  otro: 'Otro',
};

export function legible(valor) {
  if (!valor) return '—';
  return TEXTOS[valor] ?? valor.charAt(0).toUpperCase() + valor.slice(1);
}
