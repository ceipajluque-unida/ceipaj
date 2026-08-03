// autenticación con ingreso en dos pasos, bloqueo y cambio de clave
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { conInstitucion } from '../../servidor/contexto.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import * as politica from '../../servidor/politicaClave.js';
import { SEGURIDAD, ROLES, METODOS_2FA } from '../../configuracion/ajustes.js';
import { emitirCodigo, verificarCodigo as verificarCodigoContacto, invalidar as invalidarCodigo } from './codigos.js';
import { correoConfigurado, verificarSmtp } from '../../servidor/correo.js';
import { verifyConfigurado, verificarConfiguracion } from '../../servidor/verify.js';
import { validarTelefono } from '../../comun/validar.js';
import { clave as frenoClave, codigo2fa as frenoCodigo } from './bloqueos.js';
import * as dispositivos from './dispositivos.js';
import { avisarIngresoDesdeEquipoNuevo } from './avisoAcceso.js';

// al subir la versión de sesión (sv) el token viejo deja de valer
function emitirToken(usuario, alcance, minutos, extra = {}) {
  return jwt.sign(
    // el extra va primero a propósito: así nunca puede pisar el id, el rol ni el alcance
    { ...extra, id: usuario.id, nombre: usuario.nombre, rol: usuario.rol, alcance, sv: usuario.sesion_version ?? 0 },
    SEGURIDAD.JWT_SECRETO,
    { expiresIn: minutos * 60 }
  );
}

// cuánto dura la sesión según haya pedido o no que lo recuerden en ese equipo
function minutosDeSesion(recordar) {
  if (recordar) return ajustes.leerNumero('DIAS_RECORDAR_SESION', SEGURIDAD.DIAS_RECORDAR_SESION) * 24 * 60;
  return ajustes.leerNumero('MINUTOS_EXPIRACION_SESION', SEGURIDAD.MINUTOS_EXPIRACION_SESION);
}

// último envío alternativo por usuario, para frenar el spam de correo/sms
const ultimoEnvioAlterno = new Map();

// medios de 2fa alternativos que la cuenta puede usar además del actual
function alternativasPara(usuario) {
  const otras = [];
  if (usuario.secreto_2fa && usuario.metodo_2fa !== 'app') otras.push('app');
  if (usuario.correo && usuario.metodo_2fa !== 'email') otras.push('email');
  if (usuario.telefono && usuario.metodo_2fa !== 'sms') otras.push('sms');
  return otras;
}

function metodoPorDefecto() {
  return ajustes.leer('METODO_2FA_DEFECTO', SEGURIDAD.METODO_2FA_DEFECTO);
}
export { metodoPorDefecto };

export async function haceFaltaConfiguracionInicial() {
  const [filas] = await bd.query('SELECT COUNT(*) AS total FROM usuarios');
  return Number(filas[0].total) === 0;
}

// el primer administrador arranca con 2fa por app
export async function crearPrimerAdministrador({ nombre, correo, clave }, ip) {
  if (!(await haceFaltaConfiguracionInicial())) {
    throw new ErrorVisible('El sistema ya tiene usuarios: la configuración inicial está cerrada.', 409);
  }
  const revision = politica.validar(clave);
  if (!revision.valido) throw new ErrorVisible(revision.motivo);
  const claveHash = await bcrypt.hash(clave, SEGURIDAD.RONDAS_BCRYPT);
  const secreto = authenticator.generateSecret();
  // el primer administrador es de la institución que sembró la migración
  const [[institucion]] = await bd.query('SELECT id FROM instituciones ORDER BY id LIMIT 1');
  const [resultado] = await bd.query(
    "INSERT INTO usuarios (nombre, correo, clave_hash, rol, secreto_2fa, metodo_2fa, clave_actualizada_en, institucion_id) VALUES (?, ?, ?, ?, ?, 'app', NOW(), ?)",
    [nombre, correo, claveHash, ROLES.ADMINISTRADOR, secreto, institucion?.id ?? null]
  );
  await registrarAuditoria({ usuarioId: resultado.insertId, accion: 'configuracion_inicial', detalle: `primer administrador: ${correo}`, ip });
  return { otpauth: authenticator.keyuri(correo, SEGURIDAD.EMISOR_2FA, secreto) };
}

// primer paso del ingreso, valida la clave y prepara el 2fa según el método
export async function ingresar({ correo, clave, recordar, tokenDispositivo }, ip) {
  const correoLimpio = String(correo ?? '').trim().toLowerCase();
  frenoClave.revisar(correoLimpio);

  const [filas] = await bd.query('SELECT * FROM usuarios WHERE correo = ? AND activo = 1', [correoLimpio]);
  const usuario = filas[0];
  const claveCorrecta = usuario && (await bcrypt.compare(String(clave ?? ''), usuario.clave_hash));
  if (!claveCorrecta) {
    frenoClave.anotarFallo(correoLimpio);
    await registrarAuditoria({ accion: 'ingreso_fallido', detalle: correoLimpio, ip });
    throw new ErrorVisible('Correo o contraseña incorrectos.', 401); // mensaje único a propósito
  }
  frenoClave.limpiar(correoLimpio);

  // el ingreso va sin sesión previa, así que de acá en adelante manda la institución
  // del usuario: el código de 2fa sale por SU smtp y con SUS minutos de sesión
  return conInstitucion(usuario.institucion_id ?? null, () => seguirIngreso(usuario, { recordar, tokenDispositivo }, ip));
}

async function seguirIngreso(usuario, { recordar, tokenDispositivo }, ip) {
  // en un equipo de confianza ya se verificó antes, se entra sin pedir el código
  if (await dispositivos.esDeConfianza(usuario.id, tokenDispositivo)) {
    await registrarAuditoria({ usuarioId: usuario.id, accion: 'ingreso_exitoso', detalle: 'equipo de confianza', ip });
    return {
      requiereCodigo: false,
      token: emitirToken(usuario, 'sesion', minutosDeSesion(recordar)),
      usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol },
      requiereCambioClave: Boolean(usuario.debe_cambiar_clave),
      recordar: Boolean(recordar),
    };
  }

  // el recordarme viaja firmado dentro del token, así no se puede cambiar por afuera
  const respuesta = {
    requiereCodigo: true,
    metodo: usuario.metodo_2fa,
    tokenPre2fa: emitirToken(usuario, 'pre-2fa', SEGURIDAD.MINUTOS_TOKEN_PRE_2FA, { recordar: Boolean(recordar) }),
  };

  if (usuario.metodo_2fa === 'app') {
    // si aún no confirmó su 2fa por app, se le ofrece el qr
    if (!usuario.activado_2fa && usuario.secreto_2fa) {
      respuesta.otpauth = authenticator.keyuri(usuario.correo, SEGURIDAD.EMISOR_2FA, usuario.secreto_2fa);
    }
  } else {
    // con correo o sms se genera y envía un código de un solo uso
    const envio = await emitirCodigo(usuario);
    respuesta.destino = usuario.metodo_2fa === 'sms' ? usuario.telefono : usuario.correo;
    respuesta.configurado = envio.configurado;
    respuesta.enviado = envio.enviado;
    if (envio.codigoPrueba) respuesta.codigoPrueba = envio.codigoPrueba; // sin smtp/twilio se muestra en pantalla
  }
  respuesta.alternativas = alternativasPara(usuario);
  return respuesta;
}

// segundo paso, verifica el código y abre la sesión
export async function verificarCodigo({ tokenPre2fa, codigo, confiarEquipo, userAgent }, ip) {
  let datos;
  try {
    datos = jwt.verify(String(tokenPre2fa ?? ''), SEGURIDAD.JWT_SECRETO);
    if (datos.alcance !== 'pre-2fa') throw new Error('alcance incorrecto');
  } catch {
    throw new ErrorVisible('El paso anterior venció: volvé a ingresar usuario y contraseña.', 401);
  }
  const [filas] = await bd.query('SELECT * FROM usuarios WHERE id = ? AND activo = 1', [datos.id]);
  const usuario = filas[0];
  if (!usuario) throw new ErrorVisible('La cuenta no está disponible.', 401);
  // el segundo paso también va sin sesión: la duración y los envíos son de su institución
  return conInstitucion(usuario.institucion_id ?? null,
    () => seguirVerificacion(usuario, datos, { codigo, confiarEquipo, userAgent }, ip));
}

async function seguirVerificacion(usuario, datos, { codigo, confiarEquipo, userAgent }, ip) {
  frenoCodigo.revisar(usuario.id); // si ya se pasó de intentos, corta acá

  // el totp de la app sirve de respaldo aunque el método sea correo o sms
  const codigoLimpio = String(codigo ?? '').trim();
  const totpOk = usuario.secreto_2fa && authenticator.check(codigoLimpio, usuario.secreto_2fa);
  const codigoValido = totpOk || await verificarCodigoContacto(usuario, codigoLimpio);
  if (!codigoValido) {
    frenoCodigo.anotarFallo(usuario.id);
    await registrarAuditoria({ usuarioId: usuario.id, accion: 'codigo_2fa_invalido', ip });
    frenoCodigo.revisar(usuario.id); // si este fallo activó el bloqueo, sale con 429
    throw new ErrorVisible('Código incorrecto o vencido.', 401);
  }
  frenoCodigo.limpiar(usuario.id);
  invalidarCodigo(usuario.id);
  if (!usuario.activado_2fa) {
    await bd.query('UPDATE usuarios SET activado_2fa = 1 WHERE id = ?', [usuario.id]);
    await registrarAuditoria({ usuarioId: usuario.id, accion: '2fa_activado', ip });
  }
  // el recordarme lo trae el token del primer paso, no el navegador
  const recordar = Boolean(datos.recordar);
  await registrarAuditoria({ usuarioId: usuario.id, accion: 'ingreso_exitoso', detalle: recordar ? 'con recordarme' : null, ip });
  await avisarIngresoDesdeEquipoNuevo(usuario, { equipo: dispositivos.nombrarEquipo(userAgent), ip });

  // recién acá se marca el equipo, cuando ya se probó la identidad con el código
  let tokenDispositivo;
  if (confiarEquipo) {
    tokenDispositivo = await dispositivos.recordar(usuario.id, userAgent);
    await registrarAuditoria({ usuarioId: usuario.id, accion: 'dispositivo_confiado', detalle: dispositivos.nombrarEquipo(userAgent), ip });
  }

  return {
    token: emitirToken(usuario, 'sesion', minutosDeSesion(recordar)),
    usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol },
    requiereCambioClave: Boolean(usuario.debe_cambiar_clave),
    recordar,
    ...(tokenDispositivo ? { tokenDispositivo } : {}),
  };
}

export function listarDispositivos(usuarioId) {
  return dispositivos.listar(usuarioId);
}

export async function olvidarDispositivo(usuarioId, id, ip) {
  const borrado = await dispositivos.olvidar(usuarioId, id);
  if (!borrado) throw new ErrorVisible('Ese equipo no figura entre los tuyos.', 404);
  await registrarAuditoria({ usuarioId, accion: 'dispositivo_olvidado', detalle: String(id), ip });
  return { id };
}

// si no tiene a mano su método le damos otro medio (app, correo o sms)
export async function enviarCodigoAlternativo({ tokenPre2fa, metodo }, ip) {
  let datos;
  try {
    datos = jwt.verify(String(tokenPre2fa ?? ''), SEGURIDAD.JWT_SECRETO);
    if (datos.alcance !== 'pre-2fa') throw new Error('alcance incorrecto');
  } catch {
    throw new ErrorVisible('El paso anterior venció: volvé a ingresar usuario y contraseña.', 401);
  }
  const [filas] = await bd.query('SELECT * FROM usuarios WHERE id = ? AND activo = 1', [datos.id]);
  const usuario = filas[0];
  if (!usuario) throw new ErrorVisible('La cuenta no está disponible.', 401);

  // con la app no se envía nada, el usuario escribe su código totp
  if (metodo === 'app') {
    if (!usuario.secreto_2fa) throw new ErrorVisible('Esta cuenta no tiene configurada la app de autenticación.');
    return { metodo: 'app' };
  }
  if (metodo !== 'email' && metodo !== 'sms') throw new ErrorVisible('Método no válido.');
  if (metodo === 'sms' && !String(usuario.telefono ?? '').trim()) {
    throw new ErrorVisible('Esta cuenta no tiene un teléfono cargado para recibir el SMS.');
  }

  // un envío alternativo cada tanto por usuario, para que no se spamee
  const ahora = Date.now();
  if (ahora - (ultimoEnvioAlterno.get(usuario.id) ?? 0) < 30000) {
    throw new ErrorVisible('Esperá unos segundos antes de pedir otro código.', 429);
  }
  ultimoEnvioAlterno.set(usuario.id, ahora);

  const envio = await emitirCodigo(usuario, metodo);
  await registrarAuditoria({ usuarioId: usuario.id, accion: 'codigo_2fa_alternativo', detalle: metodo, ip });
  return {
    metodo,
    destino: metodo === 'sms' ? usuario.telefono : usuario.correo,
    configurado: envio.configurado,
    enviado: envio.enviado,
    ...(envio.codigoPrueba ? { codigoPrueba: envio.codigoPrueba } : {}),
  };
}

// cambio de clave del propio usuario
export async function cambiarClave({ usuarioId, claveActual, claveNueva }, ip) {
  const revision = politica.validar(claveNueva);
  if (!revision.valido) throw new ErrorVisible(revision.motivo);
  const [filas] = await bd.query('SELECT * FROM usuarios WHERE id = ? AND activo = 1', [usuarioId]);
  const usuario = filas[0];
  if (!usuario || !(await bcrypt.compare(String(claveActual ?? ''), usuario.clave_hash))) {
    throw new ErrorVisible('La contraseña actual no es correcta.', 401);
  }
  const claveHash = await bcrypt.hash(claveNueva, SEGURIDAD.RONDAS_BCRYPT);
  await bd.query('UPDATE usuarios SET clave_hash = ?, debe_cambiar_clave = 0, clave_actualizada_en = NOW() WHERE id = ?', [claveHash, usuario.id]);
  // si la cuenta estuvo comprometida, los equipos recordados dejan de valer
  await dispositivos.olvidarTodos(usuario.id);
  await registrarAuditoria({ usuarioId: usuario.id, accion: 'clave_cambiada', ip });
}

// al salir sube la versión de sesión y el token actual deja de valer
export async function salir(usuarioId, ip) {
  await bd.query('UPDATE usuarios SET sesion_version = sesion_version + 1 WHERE id = ?', [usuarioId]);
  await registrarAuditoria({ usuarioId, accion: 'sesion_cerrada', ip });
}

// cada usuario elige su método de verificación
export async function cambiarMetodo2fa({ usuarioId, metodo, telefono }, ip) {
  if (!METODOS_2FA.some((opcion) => opcion.valor === metodo)) throw new ErrorVisible('Método de verificación no válido.');
  if (metodo === 'sms') {
    if (!String(telefono ?? '').trim()) throw new ErrorVisible('Para el 2FA por SMS hace falta un teléfono.');
    if (!validarTelefono(telefono)) throw new ErrorVisible('El celular no es válido.');
  }

  // se valida el proveedor antes de cambiar, así nadie queda afuera
  if (metodo === 'email' && correoConfigurado()) {
    const revision = await verificarSmtp();
    if (!revision.ok) throw new ErrorVisible(`No se pudo validar el correo (SMTP): ${revision.motivo}`, 502);
  }
  if (metodo === 'sms' && verifyConfigurado()) {
    const revision = await verificarConfiguracion();
    if (!revision.ok) throw new ErrorVisible(`No se pudo validar Twilio Verify: ${revision.motivo}`, 502);
  }

  let otpauth = null;
  if (metodo === 'app') {
    // con secreto nuevo y activado_2fa en 0, el próximo ingreso vuelve a mostrar el qr
    const [[usuario]] = await bd.query('SELECT correo FROM usuarios WHERE id = ?', [usuarioId]);
    const secreto = authenticator.generateSecret();
    await bd.query("UPDATE usuarios SET metodo_2fa='app', secreto_2fa=?, activado_2fa=0 WHERE id=?", [secreto, usuarioId]);
    otpauth = authenticator.keyuri(usuario.correo, SEGURIDAD.EMISOR_2FA, secreto);
  } else if (metodo === 'sms') {
    await bd.query("UPDATE usuarios SET metodo_2fa='sms', telefono=?, activado_2fa=0 WHERE id=?", [telefono.trim(), usuarioId]);
  } else {
    // email no toca el teléfono (evita guardar uno editado sin querer)
    await bd.query("UPDATE usuarios SET metodo_2fa='email', activado_2fa=0 WHERE id=?", [usuarioId]);
  }
  await dispositivos.olvidarTodos(usuarioId);
  await registrarAuditoria({ usuarioId, accion: 'metodo_2fa_cambiado', detalle: metodo, ip });
  return { metodo, otpauth };
}

// edición del propio perfil, reservada al administrador
export async function actualizarPerfil({ usuarioId, rol, nombre, correo, telefono, direccion }, ip) {
  if (rol !== ROLES.ADMINISTRADOR) throw new ErrorVisible('Solo el administrador puede editar los datos del perfil.', 403);
  const correoLimpio = String(correo ?? '').trim().toLowerCase();
  const [[repetido]] = await bd.query('SELECT id FROM usuarios WHERE correo = ? AND id <> ?', [correoLimpio, usuarioId]);
  if (repetido) throw new ErrorVisible('Ese correo ya lo usa otra cuenta.');
  const tel = String(telefono ?? '').trim() || null;
  const dir = String(direccion ?? '').trim() || null;
  try {
    await bd.query('UPDATE usuarios SET nombre = ?, correo = ?, telefono = ?, direccion = ? WHERE id = ?',
      [String(nombre).trim(), correoLimpio, tel, dir, usuarioId]);
  } catch (error) {
    // por si otro alta tomó el correo entre el chequeo y el update (unique en la tabla)
    if (error.code === 'ER_DUP_ENTRY') throw new ErrorVisible('Ese correo ya lo usa otra cuenta.');
    throw error;
  }
  await registrarAuditoria({ usuarioId, accion: 'perfil_actualizado', ip });
  return { nombre: String(nombre).trim(), correo: correoLimpio, telefono: tel ?? '', direccion: dir ?? '' };
}
