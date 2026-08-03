import nodemailer from 'nodemailer';
import { promises as dns } from 'node:dns';
import { CORREO, INSTITUCION } from '../configuracion/ajustes.js';
import * as ajustes from './ajustesSistema.js';

function configuracionSmtp() {
  return {
    host: ajustes.leer('SMTP_HOST', CORREO.SMTP_HOST),
    puerto: ajustes.leerNumero('SMTP_PUERTO', CORREO.SMTP_PUERTO),
    usuario: ajustes.leer('SMTP_USUARIO', CORREO.SMTP_USUARIO),
    clave: ajustes.leer('SMTP_CLAVE', CORREO.SMTP_CLAVE),

    remitente: `${ajustes.leer('INSTITUCION_NOMBRE', INSTITUCION.NOMBRE)} <${ajustes.leer('SMTP_USUARIO', CORREO.SMTP_USUARIO)}>`,
  };
}

export function correoConfigurado() {
  return Boolean(configuracionSmtp().host);
}

function explicar(error, smtp) {
  const texto = String(error?.message ?? '');
  if (error?.code === 'ETIMEDOUT' || /timeout/i.test(texto)) {
    return `No se pudo conectar al servidor de correo por el puerto ${smtp.puerto}. Muchas redes bloquean el 587; probá con el 465.`;
  }
  if (/535|BadCredentials|Username and Password not accepted/i.test(texto)) {
    return 'El servidor rechazó el usuario o la contraseña. En Gmail hay que activar la verificación en dos pasos y usar una contraseña de aplicación de 16 letras, no la contraseña de la cuenta.';
  }
  if (error?.code === 'ENOTFOUND' || /getaddrinfo/i.test(texto)) {
    return `No se encontró el servidor "${smtp.host}". Revisá que esté bien escrito.`;
  }
  if (error?.code === 'ECONNREFUSED') {
    return `El servidor rechazó la conexión en el puerto ${smtp.puerto}. Probá con el 465.`;
  }
  return texto || 'No se pudo enviar el correo.';
}

async function crearTransporte(smtp) {
  let host = smtp.host;
  let servername;
  try {
    const [ipv4] = await dns.resolve4(smtp.host);
    if (ipv4) { servername = smtp.host; host = ipv4; }
  } catch { }
  return nodemailer.createTransport({
    host,
    port: smtp.puerto,
    secure: smtp.puerto === 465,
    auth: smtp.usuario ? { user: smtp.usuario, pass: smtp.clave } : undefined,
    ...(servername ? { tls: { servername } } : {}),
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
}

export async function verificarSmtp() {
  const smtp = configuracionSmtp();
  if (!smtp.host) return { ok: false, motivo: 'El correo (SMTP) no está configurado.' };
  try {
    const transporte = await crearTransporte(smtp);
    await transporte.verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, motivo: explicar(error, smtp) };
  }
}

export async function enviarCorreo({ para, asunto, texto }) {
  const smtp = configuracionSmtp();
  if (!smtp.host) return { enviado: false, motivo: 'smtp sin configurar' };
  try {
    const transporte = await crearTransporte(smtp);
    await transporte.sendMail({ from: smtp.remitente, to: para, subject: asunto, text: texto });
    return { enviado: true };
  } catch (error) {
    return { enviado: false, motivo: explicar(error, smtp) };
  }
}
