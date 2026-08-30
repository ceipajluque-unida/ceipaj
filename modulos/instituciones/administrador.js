import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { SEGURIDAD, ROLES, METODOS_2FA } from '../../configuracion/ajustes.js';
import { validarCorreo, validarTelefono, validarLargo, LARGOS } from '../../comun/validar.js';
import { generarClaveTemporal } from '../../comun/claves.js';
import { despacharCredenciales } from '../usuarios/credenciales.js';
import { conInstitucion } from '../../servidor/contexto.js';

export async function crearAdministrador(institucionId, cuerpo, solicitante, ip) {
  const nombre = String(cuerpo?.nombre ?? '').trim();
  const correo = String(cuerpo?.correo ?? '').trim().toLowerCase();
  const telefono = String(cuerpo?.telefono ?? '').trim();
  const direccion = String(cuerpo?.direccion ?? '').trim();

  const metodo2fa = METODOS_2FA.some((m) => m.valor === cuerpo?.metodo2fa) ? cuerpo.metodo2fa : 'app';
  if (!nombre) throw new ErrorVisible('El nombre es obligatorio.');
  if (!validarLargo(nombre, LARGOS.nombre)) throw new ErrorVisible(`El nombre no puede pasar de ${LARGOS.nombre} caracteres.`);
  if (!validarCorreo(correo)) throw new ErrorVisible('El correo no es válido.');
  if (!validarTelefono(telefono)) throw new ErrorVisible('El teléfono no tiene un formato válido.');
  if (!validarLargo(direccion, 150)) throw new ErrorVisible('La dirección no puede pasar de 150 caracteres.');
  if (metodo2fa === 'sms' && !telefono) {
    throw new ErrorVisible('Para verificar por SMS hace falta cargar el celular.');
  }

  const [[institucion]] = await bd.query('SELECT id, nombre FROM instituciones WHERE id = ?', [institucionId]);
  if (!institucion) throw new ErrorVisible('Institución no encontrada.', 404);

  const claveTemporal = generarClaveTemporal();
  const claveHash = await bcrypt.hash(claveTemporal, SEGURIDAD.RONDAS_BCRYPT);
  const secreto = authenticator.generateSecret();
  let resultado;
  try {
    [resultado] = await bd.query(
      `INSERT INTO usuarios (nombre, correo, telefono, direccion, clave_hash, rol, secreto_2fa, metodo_2fa, debe_cambiar_clave, institucion_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [nombre, correo, telefono || null, direccion || null, claveHash, ROLES.ADMINISTRADOR, secreto, metodo2fa, institucionId]
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new ErrorVisible('Ya existe un usuario con ese correo.', 409);
    throw error;
  }

  const envio = await conInstitucion(institucionId, () =>
    despacharCredenciales({ nombre, correo, claveTemporal, asunto: `Tu acceso al SIG de ${institucion.nombre}` })
  );
  await registrarAuditoria({
    usuarioId: solicitante.id,
    accion: 'institucion_administrador_creado',
    detalle: `${institucion.nombre}: ${correo}`,
    ip,
  });
  return { usuario: { id: resultado.insertId, nombre, correo }, ...envio };
}
