import { SMS } from '../configuracion/ajustes.js';
import * as ajustes from './ajustesSistema.js';

function credenciales() {
  return {
    sid: ajustes.leer('TWILIO_SID', SMS.TWILIO_SID),
    token: ajustes.leer('TWILIO_TOKEN', SMS.TWILIO_TOKEN),
    desde: ajustes.leer('TWILIO_DESDE', SMS.TWILIO_DESDE),
  };
}

export function smsConfigurado() {
  const { sid, token, desde } = credenciales();
  return Boolean(sid && token && desde);
}

const ERRORES = {
  21608: 'Ese número no está verificado en Twilio. En las cuentas de prueba solo llegan mensajes a números verificados.',
  21606: 'El número remitente no puede enviar SMS.',
  21612: 'Twilio no entrega SMS a ese número desde tu remitente.',
  21614: 'El número de destino no recibe SMS.',
  21211: 'Número mal escrito. Va con código de país: +595981123456.',
  20003: 'Credenciales rechazadas. Revisá el Account SID y el Auth Token.',
};

function explicar(datos, estado) {
  return ERRORES[datos?.code] ?? datos?.message ?? `Twilio respondió ${estado}.`;
}

export async function verificarSms() {
  const { sid, token, desde } = credenciales();
  if (!sid || !token) return { ok: false, motivo: 'Falta el Account SID o el Auth Token.' };
  if (!desde) return { ok: false, motivo: 'Falta el número remitente.' };
  try {
    const respuesta = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') },
      signal: AbortSignal.timeout(10000),
    });
    if (!respuesta.ok) return { ok: false, motivo: 'Credenciales rechazadas. Revisá el Account SID y el Auth Token.' };
    return { ok: true };
  } catch (error) {
    return { ok: false, motivo: `No se pudo contactar con Twilio: ${error.message}` };
  }
}

export async function enviarSms({ para, texto }) {
  const { sid, token, desde } = credenciales();
  if (!sid || !token) return { enviado: false, motivo: 'Falta el Account SID o el Auth Token.' };
  if (!desde) {
    return { enviado: false, motivo: 'Falta el número remitente.' };
  }
  if (!para) return { enviado: false, motivo: 'La cuenta no tiene un celular cargado para recibir el SMS.' };
  try {
    const cuerpo = new URLSearchParams({ To: para, From: desde, Body: texto });
    const respuesta = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: cuerpo,
      signal: AbortSignal.timeout(10000),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      return { enviado: false, motivo: explicar(datos, respuesta.status) };
    }
    return { enviado: true };
  } catch (error) {
    return { enviado: false, motivo: `No se pudo contactar con Twilio: ${error.message}` };
  }
}
