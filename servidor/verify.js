import { SMS } from '../configuracion/ajustes.js';
import * as ajustes from './ajustesSistema.js';

function credenciales() {
  return {
    sid: ajustes.leer('TWILIO_SID', SMS.TWILIO_SID),
    token: ajustes.leer('TWILIO_TOKEN', SMS.TWILIO_TOKEN),
    servicio: ajustes.leer('TWILIO_VERIFY_SID', SMS.TWILIO_VERIFY_SID),
  };
}

export function verifyConfigurado() {
  const { sid, token, servicio } = credenciales();
  return Boolean(sid && token && servicio);
}

const ERRORES = {
  20003: 'Twilio rechazó las credenciales.',
  20404: 'No hay una verificación pendiente para ese número.',
  60200: 'El número de destino no es válido.',
  60203: 'Se alcanzó el máximo de envíos para ese número. Esperá unos minutos.',
  60205: 'Ese número no puede recibir SMS.',
  60212: 'Demasiados intentos para ese número. Esperá unos minutos.',
  60410: 'El código venció o quedó bloqueado. Pedí uno nuevo.',
};

function explicar(datos, estado) {
  return ERRORES[datos?.code] ?? datos?.message ?? `Twilio respondió ${estado}.`;
}

function autorizacion(sid, token) {
  return 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');
}

async function llamar(ruta, cuerpo) {
  const { sid, token, servicio } = credenciales();
  const respuesta = await fetch(`https://verify.twilio.com/v2/Services/${servicio}${ruta}`, {
    method: cuerpo ? 'POST' : 'GET',
    headers: {
      Authorization: autorizacion(sid, token),
      ...(cuerpo ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    ...(cuerpo ? { body: cuerpo } : {}),
    signal: AbortSignal.timeout(10000),
  });
  return respuesta;
}

export async function verificarConfiguracion() {
  const { sid, token, servicio } = credenciales();
  if (!sid || !token) return { ok: false, motivo: 'Faltan el Account SID y el Auth Token de Twilio.' };
  if (!servicio) return { ok: false, motivo: 'Falta el Verify Service SID de Twilio (empieza con VA...).' };
  try {
    const respuesta = await llamar('');
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      return { ok: false, motivo: explicar(datos, respuesta.status) };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, motivo: `No se pudo contactar con Twilio: ${error.message}` };
  }
}

export async function enviarVerificacion({ para, canal = 'sms' }) {
  if (!verifyConfigurado()) return { enviado: false, motivo: 'Twilio Verify no está configurado.' };
  if (!para) return { enviado: false, motivo: 'La cuenta no tiene un celular cargado para recibir el código.' };
  try {
    const respuesta = await llamar('/Verifications', new URLSearchParams({ To: para, Channel: canal }));
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      return { enviado: false, motivo: explicar(datos, respuesta.status) };
    }
    return { enviado: true };
  } catch (error) {
    return { enviado: false, motivo: `No se pudo contactar con Twilio: ${error.message}` };
  }
}

export async function comprobarVerificacion({ para, codigo }) {
  if (!verifyConfigurado() || !para) return { aprobado: false };
  try {
    const respuesta = await llamar('/VerificationChecks', new URLSearchParams({ To: para, Code: String(codigo ?? '').trim() }));
    if (!respuesta.ok) return { aprobado: false };
    const datos = await respuesta.json().catch(() => ({}));
    return { aprobado: datos.status === 'approved' };
  } catch {
    return { aprobado: false };
  }
}
