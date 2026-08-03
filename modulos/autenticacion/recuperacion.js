// recuperación de contraseña por enlace único de un solo uso, nunca se manda una clave en claro
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { bd } from '../../servidor/bd/conexion.js';
import { enviarCorreo, correoConfigurado } from '../../servidor/correo.js';
import { revelar } from '../../servidor/modoPrueba.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import * as politica from '../../servidor/politicaClave.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { SEGURIDAD, APLICACION, INSTITUCION } from '../../configuracion/ajustes.js';
import { conInstitucion } from '../../servidor/contexto.js';

// en la base solo se guarda el hash del token, nunca el token que viaja en el enlace
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export async function solicitar(correo, ip) {
  const correoLimpio = String(correo ?? '').trim().toLowerCase();
  const [[usuario]] = await bd.query(
    'SELECT id, nombre, institucion_id FROM usuarios WHERE correo = ? AND activo = 1',
    [correoLimpio]
  );
  // si el correo no existe se responde igual, así no se revela quién está registrado
  if (!usuario) return { enviado: false };
  // esta ruta va sin sesión, así que la institución sale del usuario: el correo se manda
  // con el smtp de SU institución, no con el de la que atendió el pedido anterior
  return conInstitucion(usuario.institucion_id ?? null, () => enviarEnlace(usuario, correoLimpio, ip));
}

async function enviarEnlace(usuario, correoLimpio, ip) {
  const token = crypto.randomBytes(32).toString('hex');
  const minutos = SEGURIDAD.MINUTOS_CODIGO_2FA;
  await bd.query('INSERT INTO tokens_recuperacion (usuario_id, token_hash, vence) VALUES (?, ?, NOW() + INTERVAL ? MINUTE)',
    [usuario.id, hashToken(token), minutos]);

  const enlace = `${ajustes.leer('APP_URL', APLICACION.URL)}/restablecer?token=${token}`;
  const envio = await enviarCorreo({
    para: correoLimpio,
    asunto: `Restablecer contraseña · ${INSTITUCION.NOMBRE}`,
    texto: `Hola ${usuario.nombre}:\n\nPediste restablecer tu contraseña. Entrá a este enlace para elegir una nueva ` +
      `(vence en ${minutos} minutos y se usa una sola vez):\n\n${enlace}\n\nSi no fuiste vos, ignorá este correo.`,
  });
  await registrarAuditoria({ usuarioId: usuario.id, accion: 'recuperacion_solicitada', ip });
  // con correo configurado el enlace nunca se revela, si no cualquiera tomaría una cuenta ajena
  const enlacePrueba = revelar(enlace, correoConfigurado());
  return { enviado: envio.enviado, ...(enlacePrueba ? { enlacePrueba } : {}) };
}

export async function restablecer({ token, claveNueva }, ip) {
  const revision = politica.validar(claveNueva);
  if (!revision.valido) throw new ErrorVisible(revision.motivo);

  const [[fila]] = await bd.query(
    'SELECT id, usuario_id FROM tokens_recuperacion WHERE token_hash = ? AND usado = 0 AND vence > NOW()',
    [hashToken(String(token ?? ''))]
  );
  if (!fila) throw new ErrorVisible('El enlace es inválido o venció. Pedí uno nuevo.', 400);

  const claveHash = await bcrypt.hash(claveNueva, SEGURIDAD.RONDAS_BCRYPT);
  // al subir la versión de sesión, lo abierto con la clave vieja deja de valer
  await bd.query('UPDATE usuarios SET clave_hash = ?, clave_actualizada_en = NOW(), debe_cambiar_clave = 0, sesion_version = sesion_version + 1 WHERE id = ?',
    [claveHash, fila.usuario_id]);
  await bd.query('UPDATE tokens_recuperacion SET usado = 1 WHERE id = ?', [fila.id]);
  await registrarAuditoria({ usuarioId: fila.usuario_id, accion: 'clave_restablecida_usuario', ip });
}
