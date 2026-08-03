import { SEGURIDAD } from '../configuracion/ajustes.js';
import * as ajustes from './ajustesSistema.js';

const VERIFICAR = 'https://www.google.com/recaptcha/api/siteverify';

export function claveSitio() {
  return ajustes.leer('RECAPTCHA_CLAVE_SITIO', SEGURIDAD.RECAPTCHA_CLAVE_SITIO);
}

function claveSecreta() {
  return ajustes.leer('RECAPTCHA_CLAVE_SECRETA', SEGURIDAD.RECAPTCHA_CLAVE_SECRETA);
}

export function activo() {
  return ajustes.leerBooleano('RECAPTCHA_ACTIVO', SEGURIDAD.RECAPTCHA_ACTIVO)
    && Boolean(claveSitio() && claveSecreta());
}

const ERRORES = {
  'missing-input-response': 'Falta resolver el captcha.',
  'invalid-input-response': 'El captcha venció o ya se usó. Probá de nuevo.',
  'timeout-or-duplicate': 'El captcha venció o ya se usó. Probá de nuevo.',
  'invalid-input-secret': 'La clave secreta del captcha es incorrecta. Revisala en Configuración.',
  'missing-input-secret': 'Falta la clave secreta del captcha en Configuración.',
};

export async function verificar(respuesta, ip) {
  if (!activo()) return { ok: true };
  if (!respuesta) return { ok: false, motivo: ERRORES['missing-input-response'] };
  try {
    const peticion = await fetch(VERIFICAR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: claveSecreta(), response: respuesta, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(10000),
    });
    const datos = await peticion.json().catch(() => ({}));
    if (datos.success) return { ok: true };
    const codigo = datos['error-codes']?.[0];
    return { ok: false, motivo: ERRORES[codigo] ?? 'No se pudo validar el captcha.' };
  } catch {
    console.error('recaptcha: no se pudo contactar con google');
    return { ok: true };
  }
}
