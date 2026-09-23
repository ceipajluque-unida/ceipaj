import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { bd } from '../../servidor/bd/conexion.js';
import { enviarCorreo } from '../../servidor/correo.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import * as politica from '../../servidor/politicaClave.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { SEGURIDAD, APLICACION, INSTITUCION } from '../../configuracion/ajustes.js';
import { conInstitucion } from '../../servidor/contexto.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export async function solicitar(correo, ip) {
  const correoLimpio = String(correo ?? '').trim().toLowerCase();
  const [[usuario]] = await bd.query(
    'SELECT id, nombre, institucion_id FROM usuarios WHERE correo = ? AND activo = 1',
    [correoLimpio]
  );

  if (!usuario) return { enviado: false };

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
    asunto: `Restablecer contraseña (${INSTITUCION.NOMBRE})`,
    texto: `Hola ${usuario.nombre}:\n\nPediste restablecer tu contraseña. Entrá a este enlace para elegir una nueva ` +
      `(vence en ${minutos} minutos y se usa una sola vez):\n\n${enlace}\n\nSi no fuiste vos, ignorá este correo.`,
  });
  await registrarAuditoria({ usuarioId: usuario.id, accion: 'recuperacion_solicitada', ip });

  return { enviado: envio.enviado };
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

  await bd.query('UPDATE usuarios SET clave_hash = ?, clave_actualizada_en = NOW(), debe_cambiar_clave = 0, sesion_version = sesion_version + 1 WHERE id = ?',
    [claveHash, fila.usuario_id]);
  await bd.query('UPDATE tokens_recuperacion SET usado = 1 WHERE id = ?', [fila.id]);
  await registrarAuditoria({ usuarioId: fila.usuario_id, accion: 'clave_restablecida_usuario', ip });
}
