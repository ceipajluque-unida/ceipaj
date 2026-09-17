import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { validarCorreo, validarTelefono } from '../../comun/validar.js';
import { LANDING, LARGOS_SOLICITUD } from '../../configuracion/landing.js';
import { PLATAFORMA, RECIBO } from '../../configuracion/ajustes.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { claveSitio, activo as captchaActivo, verificar as verificarCaptcha } from '../../servidor/recaptcha.js';
import { listarActivos } from '../planes/servicio.js';

function exigirActiva() {
  if (!LANDING.ACTIVA) throw new ErrorVisible('La página de contacto no está disponible.', 404);
}

// lo que la pagina publica necesita para dibujarse. no sale de aca nada que no
// se muestre en pantalla: ni ajustes internos ni datos de ninguna institucion.
export async function datosPublicos() {
  exigirActiva();
  const planes = await listarActivos();
  return {
    color: LANDING.COLOR,
    plataforma: ajustes.leer('PLATAFORMA_NOMBRE', PLATAFORMA.NOMBRE),
    textos: LANDING,
    claveCaptcha: captchaActivo() ? claveSitio() : null,
    contacto: {
      nombre: ajustes.leer('RECIBO_EMISOR_NOMBRE', RECIBO.EMISOR_NOMBRE),
      correo: ajustes.leer('RECIBO_EMISOR_CORREO', RECIBO.EMISOR_CORREO),
      telefono: ajustes.leer('RECIBO_EMISOR_TELEFONO', RECIBO.EMISOR_TELEFONO),
      direccion: ajustes.leer('RECIBO_EMISOR_DIRECCION', RECIBO.EMISOR_DIRECCION),
    },
    planes: planes.map((plan) => ({
      valor: plan.valor,
      texto: plan.texto,
      descripcion: plan.descripcion,
      precio: plan.precio,
      meses: plan.meses,
      incluye: plan.incluye,
      // sin esto la pagina publica decia "todas las secciones" en los cuatro planes
      modulos: plan.modulos,
      maxUsuarios: plan.maxUsuarios,
      maxAliados: plan.maxAliados,
    })),
  };
}

// solo se aceptan textos: un objeto o un arreglo no se convierte, se rechaza
function texto(valor, campo) {
  if (valor === undefined || valor === null) return '';
  if (typeof valor !== 'string' && typeof valor !== 'number') {
    throw new ErrorVisible(`El campo ${campo} tiene que ser texto.`);
  }
  return String(valor).trim();
}

function limitado(valor, campo, largo) {
  const limpio = texto(valor, campo);
  // se avisa en vez de cortar por lo bajo: quien escribe tiene que enterarse
  if (limpio.length > largo) throw new ErrorVisible(`El campo ${campo} no puede pasar de ${largo} caracteres.`);
  return limpio;
}

async function validar(cuerpo) {
  const datos = {
    nombre: limitado(cuerpo?.nombre, 'nombre', LARGOS_SOLICITUD.nombre),
    institucion: limitado(cuerpo?.institucion, 'institución', LARGOS_SOLICITUD.institucion),
    correo: limitado(cuerpo?.correo, 'correo', LARGOS_SOLICITUD.correo).toLowerCase(),
    telefono: limitado(cuerpo?.telefono, 'teléfono', LARGOS_SOLICITUD.telefono),
    ciudad: limitado(cuerpo?.ciudad, 'ciudad', LARGOS_SOLICITUD.ciudad),
    mensaje: limitado(cuerpo?.mensaje, 'mensaje', LARGOS_SOLICITUD.mensaje),
    motivo: limitado(cuerpo?.motivo, 'motivo', 20),
    plan: limitado(cuerpo?.plan, 'plan', 30),
  };

  if (!datos.nombre) throw new ErrorVisible('Escribí tu nombre.');
  if (!validarCorreo(datos.correo)) throw new ErrorVisible('El correo no es válido.');
  if (!validarTelefono(datos.telefono)) throw new ErrorVisible('El teléfono no tiene un formato válido.');
  if (!LANDING.CONTACTO.MOTIVOS.some((m) => m.valor === datos.motivo)) {
    throw new ErrorVisible('Elegí un motivo de la lista.');
  }
  if (datos.plan) {
    const planes = await listarActivos();
    if (!planes.some((plan) => plan.valor === datos.plan)) throw new ErrorVisible('El plan elegido no está disponible.');
  }
  return datos;
}

export async function registrar(cuerpo, ip) {
  exigirActiva();

  // el captcha se valida antes que nada, para que el formulario no sirva de
  // sonda: si esta activo y no viene resuelto, no se toca la base
  const captcha = await verificarCaptcha(texto(cuerpo?.captcha, 'captcha'), ip, true);
  if (!captcha.ok) throw new ErrorVisible(captcha.motivo);

  const datos = await validar(cuerpo);
  const [resultado] = await bd.query(
    `INSERT INTO solicitudes (nombre, institucion, correo, telefono, ciudad, motivo, plan, mensaje, direccion_ip)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [datos.nombre, datos.institucion || null, datos.correo, datos.telefono || null, datos.ciudad || null,
     datos.motivo, datos.plan || null, datos.mensaje || null, ip ?? null]
  );

  await registrarAuditoria({
    accion: 'solicitud_recibida',
    detalle: `${datos.correo}${datos.institucion ? ` (${datos.institucion})` : ''}${datos.plan ? `, plan ${datos.plan}` : ''}`,
    ip,
  });

  // a quien completa el formulario no se le devuelve el id ni nada interno
  return { recibido: true, mensaje: LANDING.CONTACTO.EXITO };
}
