// una sola forma de mostrar fechas, montos y textos en todas las pantallas

const GUARANIES = new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 });

export function guaranies(monto) {
  const numero = Number(monto);
  return Number.isFinite(numero) ? GUARANIES.format(numero) : '—';
}

// para los campos donde se escribe plata: se ve con punto de miles mientras se tipea,
// y al guardar vuelve a ser un número pelado. sin esto, 250000 y 2500000 se confunden.
export function conMiles(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  return String(valor).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function sinMiles(texto) {
  return String(texto ?? '').replace(/\./g, '').replace(/\D/g, '');
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

// para buscar en el navegador como busca la base: mysql usa utf8mb4_spanish_ci, que
// ignora acentos, y sin esto escribir "gonzalez" no encontraba a "González"
export function sinAcentos(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
