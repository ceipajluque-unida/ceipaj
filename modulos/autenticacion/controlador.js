import QRCode from 'qrcode';
import * as servicio from './servicio.js';
import { bd } from '../../servidor/bd/conexion.js';
import { validarCorreo, validarTelefono } from '../../comun/validar.js';
import { modulosDelRol } from '../../configuracion/permisos.js';
import { METODOS_2FA, INSTITUCION, PLATAFORMA, ROLES } from '../../configuracion/ajustes.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import * as recuperacion from './recuperacion.js';
import * as bloqueos from './bloqueos.js';
import * as politica from '../../servidor/politicaClave.js';
import { ErrorVisible } from '../../servidor/errores.js';
import * as captcha from '../../servidor/recaptcha.js';
import { correoConfigurado } from '../../servidor/correo.js';
import { planEnVigor, moduloIncluido } from '../suscripciones/plan.js';

export async function estado(req, res) {
  res.json({
    requiereConfiguracionInicial: await servicio.haceFaltaConfiguracionInicial(),

    plataforma: { nombre: ajustes.leer('PLATAFORMA_NOMBRE', PLATAFORMA.NOMBRE) },
    institucion: {
      nombre: ajustes.leer('INSTITUCION_NOMBRE', INSTITUCION.NOMBRE),
      ciudad: ajustes.leer('INSTITUCION_CIUDAD', INSTITUCION.CIUDAD),
    },

    captcha: { activo: captcha.activo(), claveSitio: captcha.activo() ? captcha.claveSitio() : '' },
  });
}

export async function primerUsuario(req, res) {
  const { nombre, correo, clave } = req.body ?? {};
  if (!nombre?.trim()) throw new ErrorVisible('El nombre es obligatorio.');
  if (!validarCorreo(correo)) throw new ErrorVisible('El correo no es válido.');

  const { otpauth } = await servicio.crearPrimerProveedor(
    { nombre: nombre.trim(), correo: correo.trim().toLowerCase(), clave },
    req.ip
  );
  res.status(201).json({ otpauth, qr: await QRCode.toDataURL(otpauth) });
}

export async function ingresar(req, res) {
  const { correo, clave, recordar, tokenDispositivo, captchaRespuesta } = req.body ?? {};

  const revision = await captcha.verificar(captchaRespuesta, req.ip);
  if (!revision.ok) throw new ErrorVisible(revision.motivo, 400);
  const respuesta = await servicio.ingresar({ correo, clave, recordar, tokenDispositivo }, req.ip);

  if (respuesta.otpauth) respuesta.qr = await QRCode.toDataURL(respuesta.otpauth);
  res.json(respuesta);
}

export async function verificarCodigo(req, res) {
  const { tokenPre2fa, codigo, confiarEquipo } = req.body ?? {};
  res.json(await servicio.verificarCodigo(
    { tokenPre2fa, codigo, confiarEquipo, userAgent: req.get('user-agent') },
    req.ip
  ));
}

export async function dispositivos(req, res) {
  res.json(await servicio.listarDispositivos(req.usuario.id));
}

export async function olvidarDispositivo(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorVisible('Equipo no válido.');
  res.json(await servicio.olvidarDispositivo(req.usuario.id, id, req.ip));
}

export async function codigoAlternativo(req, res) {
  const { tokenPre2fa, metodo } = req.body ?? {};
  res.json(await servicio.enviarCodigoAlternativo({ tokenPre2fa, metodo }, req.ip));
}

export async function cambiarClave(req, res) {
  const { claveActual, claveNueva } = req.body ?? {};
  await servicio.cambiarClave({ usuarioId: req.usuario.id, claveActual, claveNueva }, req.ip);
  res.json({ listo: true });
}

export async function salir(req, res) {
  await servicio.salir(req.usuario.id, req.ip);
  res.json({ listo: true });
}

export async function recuperar(req, res) {
  const { correo, captchaRespuesta } = req.body ?? {};

  const revision = await captcha.verificar(captchaRespuesta, req.ip);
  if (!revision.ok) throw new ErrorVisible(revision.motivo, 400);
  if (!validarCorreo(correo)) throw new ErrorVisible('Indicá un correo válido.');

  bloqueos.recuperacion.revisar(correo);
  bloqueos.recuperacion.anotar(correo);
  const resultado = await recuperacion.solicitar(correo, req.ip);
  res.json({
    mensaje: 'Si el correo está registrado, te enviamos un enlace para restablecer la contraseña.',
    ...(resultado.enlacePrueba ? { enlacePrueba: resultado.enlacePrueba } : {}),
  });
}

export async function restablecer(req, res) {
  const { token, claveNueva } = req.body ?? {};
  await recuperacion.restablecer({ token, claveNueva }, req.ip);
  res.json({ listo: true });
}

export async function politicaClave(req, res) {
  res.json(politica.describir());
}

export async function cambiarMetodo2fa(req, res) {
  const { metodo, telefono } = req.body ?? {};
  const resultado = await servicio.cambiarMetodo2fa({ usuarioId: req.usuario.id, metodo, telefono }, req.ip);
  if (resultado.otpauth) resultado.qr = await QRCode.toDataURL(resultado.otpauth);
  res.json(resultado);
}

export async function quitar2fa(req, res) {
  res.json(await servicio.quitarDobleFactor({ usuarioId: req.usuario.id, clave: req.body?.clave }, req.ip));
}

export async function perfil(req, res) {
  const [[extra]] = await bd.query('SELECT metodo_2fa, telefono, direccion, sin_2fa FROM usuarios WHERE id = ?', [req.usuario.id]);
  const modulos = modulosDelRol(req.usuario.rol);

  const plan = await planEnVigor();
  res.json({
    usuario: { ...req.usuario, metodo_2fa: extra?.metodo_2fa ?? 'app', telefono: extra?.telefono ?? '', direccion: extra?.direccion ?? '' },
    modulos,
    modulosBloqueados: modulos.filter((clave) => !moduloIncluido(plan, clave)),
    plan: { clave: plan.clave, texto: plan.texto, vigente: plan.vigente, fechaFin: plan.fechaFin, diasRestantes: plan.diasRestantes },
    // al proveedor solo se le ofrece la app: el correo y el sms son ajustes
    // del colegio y su cuenta no pertenece a ninguna institucion
    sin2fa: Boolean(extra?.sin_2fa),
    puedeQuitar2fa: req.usuario.rol === ROLES.SUPERADMINISTRADOR,
    metodos2fa: req.usuario.rol === ROLES.SUPERADMINISTRADOR
      ? METODOS_2FA.filter((m) => m.valor === 'app')
      : METODOS_2FA,
    // las pantallas lo usan para saber si la clave temporal se manda por correo o se muestra en pantalla
    correoActivo: correoConfigurado(),
  });
}

export async function actualizarPerfil(req, res) {
  const { nombre, correo, telefono, direccion } = req.body ?? {};
  if (!String(nombre ?? '').trim()) throw new ErrorVisible('El nombre completo es obligatorio.');
  if (!validarCorreo(correo)) throw new ErrorVisible('El correo no es válido.');
  if (String(telefono ?? '').trim() && !validarTelefono(telefono)) throw new ErrorVisible('El celular no es válido.');
  const datos = await servicio.actualizarPerfil(
    { usuarioId: req.usuario.id, nombre, correo, telefono, direccion },
    req.ip
  );
  res.json(datos);
}
