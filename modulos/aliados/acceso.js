import { enviarCorreo } from '../../servidor/correo.js';
import { INSTITUCION } from '../../configuracion/ajustes.js';

function textoCredenciales({ nombre, correo, claveTemporal }) {
  return (
    `Hola ${nombre}:\n\n` +
    `El ${INSTITUCION.NOMBRE} te dio de alta como aliado institucional en su Sistema de ` +
    'Información Gerencial.\n\n' +
    `Usuario: ${correo}\n` +
    `Contraseña temporal: ${claveTemporal}\n\n` +
    'Para entrar vas a necesitar una app de autenticación (Microsoft Authenticator, ' +
    'Google Authenticator o la que uses).\n\n' +
    '¡Gracias por acompañarnos!'
  );
}

export async function enviarAcceso({ nombre, correo, claveTemporal, asunto }) {
  const { enviado } = await enviarCorreo({
    para: correo,
    asunto,
    texto: textoCredenciales({ nombre, correo, claveTemporal }),
  });

  return { correoEnviado: enviado, ...(enviado ? {} : { claveTemporal }) };
}
