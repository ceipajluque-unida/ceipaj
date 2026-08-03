// el correo con las credenciales del aliado. va aparte porque lo usan el alta y el reenvío.
import { enviarCorreo } from '../../servidor/correo.js';
import { INSTITUCION } from '../../configuracion/ajustes.js';

// tono cordial porque el aliado es un docente externo, no personal de la institución
function textoCredenciales({ nombre, correo, claveTemporal }) {
  return (
    `Hola ${nombre}:\n\n` +
    `El ${INSTITUCION.NOMBRE} te dio de alta como aliado institucional en su Sistema de ` +
    'Información Gerencial. Desde tu portal vas a poder registrar interesados, ver tu ' +
    'listado y consultar tu puntaje.\n\n' +
    `Usuario: ${correo}\n` +
    `Contraseña temporal: ${claveTemporal}\n\n` +
    'En tu primer ingreso el sistema te va a pedir cambiar esta contraseña y activar ' +
    'la verificación en dos pasos escaneando un código QR con tu app de autenticación ' +
    '(Microsoft Authenticator, Google Authenticator o la que uses).\n\n' +
    'Vas a poder ingresar desde tu navegador, en la dirección del sistema que te va a ' +
    'compartir la institución. ¡Gracias por acompañarnos!'
  );
}

export async function enviarAcceso({ nombre, correo, claveTemporal, asunto }) {
  const { enviado } = await enviarCorreo({
    para: correo,
    asunto,
    texto: textoCredenciales({ nombre, correo, claveTemporal }),
  });
  // si el correo no salió, la clave vuelve para mostrarse una única vez en pantalla
  return { correoEnviado: enviado, ...(enviado ? {} : { claveTemporal }) };
}
