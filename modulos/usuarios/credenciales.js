import bcrypt from 'bcryptjs';
import { bd } from '../../servidor/bd/conexion.js';
import { enviarCorreo } from '../../servidor/correo.js';
import { SEGURIDAD, INSTITUCION } from '../../configuracion/ajustes.js';
import { generarClaveTemporal } from '../../comun/claves.js';

function textoCredenciales({ nombre, correo, claveTemporal }) {
  return (
    `Hola ${nombre}:\n\n` +
    `Tenés acceso al Sistema de Información Gerencial del ${INSTITUCION.NOMBRE}.\n\n` +
    `Usuario: ${correo}\n` +
    `Contraseña temporal: ${claveTemporal}\n\n` +
    'Si todavía no activaste la verificación en dos pasos, vas a necesitar una app ' +
    'de autenticación (Microsoft Authenticator, Google Authenticator o la que uses).'
  );
}

export async function despacharCredenciales({ nombre, correo, claveTemporal, asunto }) {
  const { enviado } = await enviarCorreo({
    para: correo,
    asunto,
    texto: textoCredenciales({ nombre, correo, claveTemporal }),
  });
  return enviado ? { correoEnviado: true } : { correoEnviado: false, claveTemporal };
}

export async function renovarClave(id) {
  const claveTemporal = generarClaveTemporal();
  const claveHash = await bcrypt.hash(claveTemporal, SEGURIDAD.RONDAS_BCRYPT);
  await bd.query(
    'UPDATE usuarios SET clave_hash = ?, debe_cambiar_clave = 1, sesion_version = sesion_version + 1 WHERE id = ?',
    [claveHash, id]
  );
  return claveTemporal;
}
