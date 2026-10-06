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
import { validarTelefono, validarCorreo } from '../../comun/validar.js';
import { clave as frenoClave, codigo2fa as frenoCodigo } from './bloqueos.js';
import * as dispositivos from './dispositivos.js';
import { avisarIngresoDesdeEquipoNuevo } from './avisoAcceso.js';
import { firmarSesion } from '../../servidor/sesion.js';

function emitirToken(usuario, alcance, minutos, extra = {}) {
  return jwt.sign(

    { ...extra, id: usuario.id, nombre: usuario.nombre, rol: usuario.rol, alcance, sv: usuario.sesion_version ?? 0 },
    SEGURIDAD.JWT_SECRETO,
    { expiresIn: minutos * 60 }
  );
}

function sesionDe(usuario, recordar) {
  return firmarSesion({ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol, sv: usuario.sesion_version, rec: recordar });
}

const ultimoEnvioAlterno = new Map();

function soloApp(usuario) {
  return usuario.rol === ROLES.SUPERADMINISTRADOR;
}

function alternativasPara(usuario) {
  if (soloApp(usuario)) return [];
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

export async function crearPrimerProveedor({ nombre, correo, clave }, ip) {
  if (!(await haceFaltaConfiguracionInicial())) {
    throw new ErrorVisible('El sistema ya tiene usuarios: la configuración inicial está cerrada.', 409);
  }
  const revision = politica.validar(clave);
  if (!revision.valido) throw new ErrorVisible(revision.motivo);
  const claveHash = await bcrypt.hash(clave, SEGURIDAD.RONDAS_BCRYPT);
  const secreto = authenticator.generateSecret();
  const [resultado] = await bd.query(
    "INSERT INTO usuarios (nombre, correo, clave_hash, rol, secreto_2fa, metodo_2fa, clave_actualizada_en, institucion_id) VALUES (?, ?, ?, ?, ?, 'app', NOW(), NULL)",
    [nombre, correo, claveHash, ROLES.SUPERADMINISTRADOR, secreto]
  );
  await registrarAuditoria({ usuarioId: resultado.insertId, accion: 'configuracion_inicial', detalle: `proveedor del servicio: ${correo}`, ip });
  return { otpauth: authenticator.keyuri(correo, SEGURIDAD.EMISOR_2FA, secreto) };
}

export async function ingresar({ correo, clave, recordar, tokenDispositivo }, ip) {
  const correoLimpio = String(correo ?? '').trim().toLowerCase();
  frenoClave.revisar(correoLimpio);

  const [filas] = await bd.query('SELECT * FROM usuarios WHERE correo = ? AND activo = 1', [correoLimpio]);
  const usuario = filas[0];
  const claveCorrecta = usuario && (await bcrypt.compare(String(clave ?? ''), usuario.clave_hash));
  if (!claveCorrecta) {
    frenoClave.anotarFallo(correoLimpio);
    await registrarAuditoria({ accion: 'ingreso_fallido', detalle: correoLimpio, ip });
    throw new ErrorVisible('Correo o contraseña incorrectos.', 401);
  }
  frenoClave.limpiar(correoLimpio);

  return conInstitucion(usuario.institucion_id ?? null, () => seguirIngreso(usuario, { recordar, tokenDispositivo }, ip));
}

async function seguirIngreso(usuario, { recordar, tokenDispositivo }, ip) {
  if (await dispositivos.esDeConfianza(usuario.id, tokenDispositivo)) {
    await registrarAuditoria({ usuarioId: usuario.id, accion: 'ingreso_exitoso', detalle: 'equipo de confianza', ip });
    return {
      requiereCodigo: false,
      token: sesionDe(usuario, recordar),
      usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol },
      requiereCambioClave: Boolean(usuario.debe_cambiar_clave),
      recordar: Boolean(recordar),
    };
  }

  // el proveedor puede dejar su cuenta sin segundo paso: en ese caso entra directo
  if (usuario.sin_2fa) {
    await registrarAuditoria({ usuarioId: usuario.id, accion: 'ingreso_exitoso', detalle: 'sin verificacion en dos pasos', ip });
    return {
      requiereCodigo: false,
      token: sesionDe(usuario, recordar),
      usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol },
      requiereCambioClave: Boolean(usuario.debe_cambiar_clave),
      recordar: Boolean(recordar),
    };
  }

  const respuesta = {
    requiereCodigo: true,
    metodo: usuario.metodo_2fa,
    tokenPre2fa: emitirToken(usuario, 'pre-2fa', SEGURIDAD.MINUTOS_TOKEN_PRE_2FA, { recordar: Boolean(recordar) }),
  };

  if (usuario.metodo_2fa === 'app') {
    if (!usuario.activado_2fa && usuario.secreto_2fa) {
      respuesta.otpauth = authenticator.keyuri(usuario.correo, SEGURIDAD.EMISOR_2FA, usuario.secreto_2fa);
    }
  } else {
    const envio = await emitirCodigo(usuario);
    respuesta.destino = usuario.metodo_2fa === 'sms' ? usuario.telefono : usuario.correo;
    respuesta.configurado = envio.configurado;
    respuesta.enviado = envio.enviado;
  }
  respuesta.alternativas = alternativasPara(usuario);
  return respuesta;
}

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

  return conInstitucion(usuario.institucion_id ?? null,
    () => seguirVerificacion(usuario, datos, { codigo, confiarEquipo, userAgent }, ip));
}

async function seguirVerificacion(usuario, datos, { codigo, confiarEquipo, userAgent }, ip) {
  frenoCodigo.revisar(usuario.id);

  const codigoLimpio = String(codigo ?? '').trim();
  const totpOk = usuario.secreto_2fa && authenticator.check(codigoLimpio, usuario.secreto_2fa);
  const porContacto = totpOk ? { aprobado: true } : await verificarCodigoContacto(usuario, codigoLimpio);
  if (!porContacto.aprobado) {
    frenoCodigo.anotarFallo(usuario.id);
    await registrarAuditoria({ usuarioId: usuario.id, accion: 'codigo_2fa_invalido', detalle: porContacto.motivo ?? null, ip });
    frenoCodigo.revisar(usuario.id);
    // el motivo real (código bloqueado por reintentos, vencido) evita que la
    // persona insista con un código que ya no va a andar nunca
    throw new ErrorVisible(porContacto.motivo ?? 'Código incorrecto o vencido.', 401);
  }
  frenoCodigo.limpiar(usuario.id);
  invalidarCodigo(usuario.id);
  if (!usuario.activado_2fa) {
    await bd.query('UPDATE usuarios SET activado_2fa = 1 WHERE id = ?', [usuario.id]);
    await registrarAuditoria({ usuarioId: usuario.id, accion: '2fa_activado', ip });
  }

  const recordar = Boolean(datos.recordar);
  await registrarAuditoria({
    usuarioId: usuario.id,
    accion: 'ingreso_exitoso',
    detalle: recordar ? 'sesión recordada en este navegador' : null,
    ip,
  });
  await avisarIngresoDesdeEquipoNuevo(usuario, { equipo: dispositivos.nombrarEquipo(userAgent), ip });

  let tokenDispositivo;
  if (confiarEquipo) {
    tokenDispositivo = await dispositivos.recordar(usuario.id, userAgent);
    await registrarAuditoria({ usuarioId: usuario.id, accion: 'dispositivo_confiado', detalle: dispositivos.nombrarEquipo(userAgent), ip });
  }

  return {
    token: sesionDe(usuario, recordar),
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

  if (metodo === 'app') {
    if (!usuario.secreto_2fa) throw new ErrorVisible('Esta cuenta no tiene configurada la app de autenticación.');
    return { metodo: 'app' };
  }
  if (metodo !== 'email' && metodo !== 'sms') throw new ErrorVisible('Método no válido.');
  if (metodo === 'sms' && !String(usuario.telefono ?? '').trim()) {
    throw new ErrorVisible('Esta cuenta no tiene un teléfono cargado.');
  }

  const ahora = Date.now();
  if (ahora - (ultimoEnvioAlterno.get(usuario.id) ?? 0) < 30000) {
    throw new ErrorVisible('Esperá unos segundos antes de pedir otro código.', 429);
  }
  ultimoEnvioAlterno.set(usuario.id, ahora);

  return conInstitucion(usuario.institucion_id ?? null, async () => {
    const envio = await emitirCodigo(usuario, metodo);
    await registrarAuditoria({ usuarioId: usuario.id, accion: 'codigo_2fa_alternativo', detalle: metodo, ip });
    return {
      metodo,
      destino: metodo === 'sms' ? usuario.telefono : usuario.correo,
      configurado: envio.configurado,
      enviado: envio.enviado,
    };
  });
}

export async function cambiarClave({ usuarioId, claveActual, claveNueva }, ip) {
  const revision = politica.validar(claveNueva);
  if (!revision.valido) throw new ErrorVisible(revision.motivo);
  const [filas] = await bd.query('SELECT * FROM usuarios WHERE id = ? AND activo = 1', [usuarioId]);
  const usuario = filas[0];
  if (!usuario || !(await bcrypt.compare(String(claveActual ?? ''), usuario.clave_hash))) {
    throw new ErrorVisible('La contraseña actual no es correcta.', 400);
  }
  const claveHash = await bcrypt.hash(claveNueva, SEGURIDAD.RONDAS_BCRYPT);
  await bd.query('UPDATE usuarios SET clave_hash = ?, debe_cambiar_clave = 0, clave_actualizada_en = NOW() WHERE id = ?', [claveHash, usuario.id]);

  await dispositivos.olvidarTodos(usuario.id);
  await registrarAuditoria({ usuarioId: usuario.id, accion: 'clave_cambiada', ip });
}

export async function salir(usuarioId, ip) {
  await bd.query('UPDATE usuarios SET sesion_version = sesion_version + 1 WHERE id = ?', [usuarioId]);
  await registrarAuditoria({ usuarioId, accion: 'sesion_cerrada', ip });
}

// solo la cuenta del proveedor puede quedarse sin segundo paso: los usuarios
// del colegio lo tienen siempre, que es lo que exige el requisito de seguridad
export async function quitarDobleFactor({ usuarioId, clave }, ip) {
  const [[usuario]] = await bd.query('SELECT rol, clave_hash, sin_2fa FROM usuarios WHERE id = ?', [usuarioId]);
  if (!usuario) throw new ErrorVisible('La cuenta no está disponible.', 401);
  if (usuario.rol !== ROLES.SUPERADMINISTRADOR) {
    throw new ErrorVisible('La verificación en dos pasos solo se puede quitar en la cuenta del proveedor.', 403);
  }
  if (usuario.sin_2fa) return { sin2fa: true };
  if (!await bcrypt.compare(String(clave ?? ''), usuario.clave_hash)) {
    throw new ErrorVisible('La contraseña no es correcta.');
  }
  await bd.query('UPDATE usuarios SET sin_2fa = 1, secreto_2fa = NULL, activado_2fa = 0 WHERE id = ?', [usuarioId]);
  await dispositivos.olvidarTodos(usuarioId);
  await registrarAuditoria({ usuarioId, accion: '2fa_quitado', ip });
  return { sin2fa: true };
}

export async function cambiarMetodo2fa({ usuarioId, metodo, telefono }, ip) {
  if (!METODOS_2FA.some((opcion) => opcion.valor === metodo)) throw new ErrorVisible('Método de verificación no válido.');
  const [[quien]] = await bd.query('SELECT rol FROM usuarios WHERE id = ?', [usuarioId]);
  if (quien?.rol === ROLES.SUPERADMINISTRADOR && metodo !== 'app') {
    throw new ErrorVisible('La cuenta del proveedor verifica siempre con la app de autenticación.');
  }
  if (metodo === 'sms') {
    if (!String(telefono ?? '').trim()) throw new ErrorVisible('Para el 2FA por SMS hace falta un teléfono.');
    if (!validarTelefono(telefono)) throw new ErrorVisible('El celular no es válido.');
  }

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
    const [[usuario]] = await bd.query('SELECT correo FROM usuarios WHERE id = ?', [usuarioId]);
    const secreto = authenticator.generateSecret();
    await bd.query("UPDATE usuarios SET metodo_2fa='app', secreto_2fa=?, activado_2fa=0, sin_2fa=0 WHERE id=?", [secreto, usuarioId]);
    otpauth = authenticator.keyuri(usuario.correo, SEGURIDAD.EMISOR_2FA, secreto);
  } else if (metodo === 'sms') {
    await bd.query("UPDATE usuarios SET metodo_2fa='sms', telefono=?, activado_2fa=0, sin_2fa=0 WHERE id=?", [telefono.trim(), usuarioId]);
  } else {
    await bd.query("UPDATE usuarios SET metodo_2fa='email', activado_2fa=0, sin_2fa=0 WHERE id=?", [usuarioId]);
  }
  await dispositivos.olvidarTodos(usuarioId);
  await registrarAuditoria({ usuarioId, accion: 'metodo_2fa_cambiado', detalle: metodo, ip });
  return { metodo, otpauth };
}

export async function actualizarPerfil({ usuarioId, nombre, correo, telefono, direccion }, ip) {
  const nombreLimpio = String(nombre ?? '').trim();
  if (!nombreLimpio) throw new ErrorVisible('El nombre es obligatorio.');
  const correoLimpio = String(correo ?? '').trim().toLowerCase();
  if (!validarCorreo(correoLimpio)) throw new ErrorVisible('El correo no es válido.');
  const tel = String(telefono ?? '').trim() || null;
  if (tel && !validarTelefono(tel)) throw new ErrorVisible('El celular no es válido.');
  const dir = String(direccion ?? '').trim() || null;
  const [[repetido]] = await bd.query('SELECT id FROM usuarios WHERE correo = ? AND id <> ?', [correoLimpio, usuarioId]);
  if (repetido) throw new ErrorVisible('Ese correo ya lo usa otra cuenta.');
  try {
    await bd.query('UPDATE usuarios SET nombre = ?, correo = ?, telefono = ?, direccion = ? WHERE id = ?',
      [nombreLimpio, correoLimpio, tel, dir, usuarioId]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new ErrorVisible('Ese correo ya lo usa otra cuenta.');
    throw error;
  }
  await registrarAuditoria({ usuarioId, accion: 'perfil_actualizado', ip });
  return { nombre: nombreLimpio, correo: correoLimpio, telefono: tel ?? '', direccion: dir ?? '' };
}
