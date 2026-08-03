import { randomInt } from 'node:crypto';
import { enviarCorreo, correoConfigurado } from '../../servidor/correo.js';
import { verifyConfigurado, enviarVerificacion, comprobarVerificacion } from '../../servidor/verify.js';
import { revelar } from '../../servidor/modoPrueba.js';
import { SEGURIDAD, INSTITUCION } from '../../configuracion/ajustes.js';

const pendientes = new Map();

export async function emitirCodigo(usuario, metodo = usuario.metodo_2fa) {
  const vence = Date.now() + SEGURIDAD.MINUTOS_CODIGO_2FA * 60000;

  if (metodo === 'sms') {
    const configurado = verifyConfigurado();
    let enviado = false;
    if (configurado) {
      const envio = await enviarVerificacion({ para: usuario.telefono, canal: 'sms' });
      enviado = envio.enviado;
    }
    pendientes.set(usuario.id, { canal: 'sms', telefono: usuario.telefono, vence });
    return { medio: 'sms', configurado, enviado };
  }

  const codigo = String(randomInt(0, 1000000)).padStart(6, '0');
  pendientes.set(usuario.id, { canal: 'email', codigo, vence });
  const texto = `Tu código de verificación para ${INSTITUCION.NOMBRE} es: ${codigo}. Vence en ${SEGURIDAD.MINUTOS_CODIGO_2FA} minutos.`;
  const configurado = correoConfigurado();
  let enviado = false;
  if (configurado) {
    const envio = await enviarCorreo({ para: usuario.correo, asunto: `Código de verificación — ${INSTITUCION.NOMBRE}`, texto });
    enviado = envio.enviado;
  }
  const codigoPrueba = revelar(codigo, configurado);
  return { medio: 'email', configurado, enviado, ...(codigoPrueba ? { codigoPrueba } : {}) };
}

export async function verificarCodigo(usuario, codigo) {
  const pendiente = pendientes.get(usuario.id);
  if (!pendiente || pendiente.vence < Date.now()) return false;

  if (pendiente.canal === 'sms') {
    const { aprobado } = await comprobarVerificacion({ para: pendiente.telefono, codigo });
    if (aprobado) pendientes.delete(usuario.id);
    return aprobado;
  }

  if (pendiente.codigo !== String(codigo ?? '').trim()) return false;
  pendientes.delete(usuario.id);
  return true;
}

export function invalidar(usuarioId) {
  pendientes.delete(usuarioId);
}
