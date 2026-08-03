const GUARANIES = new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 });

export function guaranies(monto) {
  const numero = Number(monto);
  return Number.isFinite(numero) ? GUARANIES.format(numero) : '—';
}

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

export function contar(cantidad, singular, plural) {
  return `${cantidad} ${Number(cantidad) === 1 ? singular : plural}`;
}

const TEXTOS = {
  administrador: 'Administrador',
  comercial: 'Personal administrativo-académico',
  direccion: 'Gerencia institucional',
  aliado: 'Aliado institucional',
  superadministrador: 'Proveedor del servicio',
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

export function sinAcentos(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
