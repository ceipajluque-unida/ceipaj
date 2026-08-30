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

const FORMATO_FECHA = { day: '2-digit', month: '2-digit', year: 'numeric' };
// hourCycle h23: el reloj va de 00 a 23 en cualquier navegador, sin am/pm
const FORMATO_FECHA_HORA = { ...FORMATO_FECHA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };

export function fecha(valor) {
  if (!valor) return '—';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '—' : fecha.toLocaleDateString('es-PY', FORMATO_FECHA);
}

export function fechaHora(valor) {
  if (!valor) return '—';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '—' : fecha.toLocaleString('es-PY', FORMATO_FECHA_HORA);
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
  basico: 'Básico',
  estandar: 'Estándar',
  avanzado: 'Avanzado',
  adamspay: 'AdamsPay',
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

const MODULOS = {
  usuarios: 'Usuarios', leads: 'Interesados', aliados: 'Aliados institucionales', portal: 'Portal del aliado',
  comisiones: 'Comisiones', conversion: 'Conversión', seguimiento: 'Seguimiento estratégico',
  reportes: 'Reportes', pagos: 'Pagos', suscripcion: 'Suscripción', configuracion: 'Configuración',
  auditoria: 'Auditoría', planes: 'Planes', instituciones: 'Instituciones',
  solicitudes: 'Solicitudes', plataforma: 'Estadísticas', roles: 'Roles del sistema',
};

export function nombreModulo(clave) {
  return MODULOS[clave] ?? clave;
}

export function sinAcentos(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
