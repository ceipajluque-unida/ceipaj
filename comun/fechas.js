import { APLICACION } from '../configuracion/ajustes.js';

const ZONA = APLICACION.ZONA_HORARIA;

// cuanto se corre la hora de la institucion respecto de utc en ese instante
function desfase(instante) {
  const partes = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instante).map((p) => [p.type, Number(p.value)]));
  return Date.UTC(partes.year, partes.month - 1, partes.day, partes.hour, partes.minute, partes.second)
    - Math.floor(instante.getTime() / 1000) * 1000;
}

// un dia sin hora (como viene en la planilla del academico) es la medianoche de
// la institucion, no la de utc: si no, en Paraguay queda en el dia anterior
export function inicioDelDia(anio, mes, dia) {
  const utc = Date.UTC(anio, mes - 1, dia);
  const control = new Date(utc);
  if (control.getUTCFullYear() !== anio || control.getUTCMonth() !== mes - 1 || control.getUTCDate() !== dia) return null;
  return new Date(utc - desfase(control));
}

export function leerFechaDelDia(texto) {
  const valor = String(texto ?? '').trim();
  if (!valor) return null;
  let partes = valor.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (partes) return inicioDelDia(Number(partes[3]), Number(partes[2]), Number(partes[1]));
  partes = valor.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (partes) return inicioDelDia(Number(partes[1]), Number(partes[2]), Number(partes[3]));
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

// para las descargas: la misma hora que se ve en las pantallas
export function fechaLocal(valor, detalle = 'minuto') {
  if (!valor) return '';
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  const opciones = { timeZone: ZONA, day: '2-digit', month: '2-digit', year: 'numeric' };
  if (detalle !== 'dia') Object.assign(opciones, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  if (detalle === 'segundo') opciones.second = '2-digit';
  return fecha.toLocaleString('es-PY', opciones).replace(',', '');
}

// para el nombre de los archivos descargados: 2026-10-11, con el dia de la institucion
export function hoyLocal() {
  const [dia, mes, anio] = fechaLocal(new Date(), 'dia').split('/');
  return `${anio}-${mes}-${dia}`;
}
