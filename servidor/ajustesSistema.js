// ajustes editables por el admin. los por defecto viven en configuracion/ajustes.js, acá solo los cambios
import { bd } from './bd/conexion.js';
import { INSTITUCION, PLATAFORMA, SEGURIDAD, CORREO, SMS, LIMITES, ALIADOS, METODOS_2FA, POLITICA_CLAVE, APLICACION, PLANES_SUSCRIPCION, SUSCRIPCION, PASARELA, RECIBO, ACADEMICO, LEGALES, COLORES_SISTEMA } from '../configuracion/ajustes.js';
import { POLITICA_PRIVACIDAD, TERMINOS_Y_CONDICIONES, AVISO_PRIVACIDAD, PRESENTACION_LOGIN } from '../configuracion/legales.js';
import { AMBITO, ambitoDe } from '../configuracion/ambitos.js';
import { institucionActual, PLATAFORMA as ID_PLATAFORMA } from './contexto.js';

// cache por institución: { 0: {clave: valor}, 1: {...} }. el 0 es la plataforma
let cache = { [ID_PLATAFORMA]: {} };

export async function cargar() {
  try {
    const [filas] = await bd.query('SELECT institucion_id, clave, valor FROM ajustes_sistema');
    const nuevo = { [ID_PLATAFORMA]: {} };
    for (const fila of filas) {
      (nuevo[fila.institucion_id] ??= {})[fila.clave] = fila.valor;
    }
    cache = nuevo;
  } catch {
    // si la tabla no existe todavía (antes de migrar), se usan los valores por defecto
    cache = { [ID_PLATAFORMA]: {} };
  }
}

// los ajustes de plataforma salen siempre del 0; los de institución, de la que está
// atendiendo el pedido. sin pedido en curso quedan los valores por defecto.
function crudo(clave) {
  if (ambitoDe(clave) === AMBITO.PLATAFORMA) return cache[ID_PLATAFORMA]?.[clave];
  const institucionId = institucionActual();
  return institucionId === null ? undefined : cache[institucionId]?.[clave];
}

const vacio = (valor) => valor === undefined || valor === null || valor === '';

// primero manda el override guardado, si no el valor por defecto
export function leer(clave, porDefecto = '') {
  const valor = crudo(clave);
  return vacio(valor) ? porDefecto : valor;
}

export function leerNumero(clave, porDefecto = 0) {
  const valor = crudo(clave);
  return vacio(valor) ? porDefecto : Number(valor);
}

// los ajustes de sí/no se guardan como '1' o '0'
export function leerBooleano(clave, porDefecto = false) {
  const valor = crudo(clave);
  if (vacio(valor)) return porDefecto;
  return valor === '1' || valor === 'true';
}

export async function guardar(cambios, institucionId = null) {
  for (const [clave, valor] of Object.entries(cambios)) {
    // cada clave se guarda en su ámbito: las del proveedor en el 0, las del cliente
    // en su institución. así el mismo PUT no puede mezclar los dos.
    const destino = ambitoDe(clave) === AMBITO.PLATAFORMA
      ? ID_PLATAFORMA
      : institucionId ?? institucionActual();
    if (destino === null) continue; // ajuste de institución sin institución: no se guarda
    await bd.query(
      'INSERT INTO ajustes_sistema (institucion_id, clave, valor) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
      [destino, clave, valor == null ? null : String(valor)]
    );
  }
  await cargar();
}

// catálogo de todo lo configurable; la pantalla de configuración se dibuja de acá
export const CATALOGO = [
  // los datos del colegio que contrata: los edita su propio administrador
  { categoria: 'Institucional', ajustes: [
    { clave: 'INSTITUCION_NOMBRE', etiqueta: 'Nombre de la institución', tipo: 'texto', porDefecto: INSTITUCION.NOMBRE },
    { clave: 'INSTITUCION_CIUDAD', etiqueta: 'Ciudad', tipo: 'texto', porDefecto: INSTITUCION.CIUDAD },
    { clave: 'ACADEMICO_CLAVE_ENTRADA', etiqueta: 'Clave que usa el sistema académico para enviarnos los matriculados', tipo: 'secreto', porDefecto: '', generable: true },
  ] },
  // los del proveedor del servicio: son los que salen impresos en el recibo del cobro,
  // así que estaban mal puestos bajo "Institucional", donde parecían del colegio
  { categoria: 'Datos del proveedor', ajustes: [
    { clave: 'RECIBO_EMISOR_NOMBRE', etiqueta: 'Razón social', tipo: 'texto', porDefecto: RECIBO.EMISOR_NOMBRE },
    { clave: 'RECIBO_EMISOR_DIRECCION', etiqueta: 'Dirección', tipo: 'texto', porDefecto: RECIBO.EMISOR_DIRECCION },
    { clave: 'RECIBO_EMISOR_TELEFONO', etiqueta: 'Teléfono', tipo: 'texto', porDefecto: RECIBO.EMISOR_TELEFONO },
    { clave: 'RECIBO_EMISOR_CORREO', etiqueta: 'Correo de contacto', tipo: 'texto', porDefecto: RECIBO.EMISOR_CORREO },
    { clave: 'RECIBO_SERIE', etiqueta: 'Letras con las que empieza la numeración del recibo', tipo: 'texto', porDefecto: RECIBO.SERIE },
    { clave: 'APP_URL', etiqueta: 'Dirección web del sistema', tipo: 'texto', porDefecto: APLICACION.URL },
  ] },
  { categoria: 'Seguridad', ajustes: [
    { clave: 'CLAVE_LARGO_MIN', etiqueta: 'Cantidad mínima de caracteres de la contraseña', tipo: 'numero', min: 6, max: 64, porDefecto: POLITICA_CLAVE.LARGO_MIN },
    { clave: 'CLAVE_MAYUS', etiqueta: 'Pedir al menos una mayúscula', tipo: 'booleano', porDefecto: POLITICA_CLAVE.MAYUS ? '1' : '0' },
    { clave: 'CLAVE_MINUS', etiqueta: 'Pedir al menos una minúscula', tipo: 'booleano', porDefecto: POLITICA_CLAVE.MINUS ? '1' : '0' },
    { clave: 'CLAVE_NUMERO', etiqueta: 'Pedir al menos un número', tipo: 'booleano', porDefecto: POLITICA_CLAVE.NUMERO ? '1' : '0' },
    { clave: 'CLAVE_ESPECIAL', etiqueta: 'Pedir al menos un símbolo', tipo: 'booleano', porDefecto: POLITICA_CLAVE.ESPECIAL ? '1' : '0' },
    { clave: 'CLAVE_DIAS_VIGENCIA', etiqueta: 'Cada cuántos días hay que cambiar la contraseña, 0 para que no venza', tipo: 'numero', min: 0, max: 3650, porDefecto: POLITICA_CLAVE.DIAS_VIGENCIA },
    { clave: 'METODO_2FA_DEFECTO', etiqueta: 'Cómo se verifica la identidad al entrar', tipo: 'opcion', opciones: METODOS_2FA, porDefecto: SEGURIDAD.METODO_2FA_DEFECTO },
    // el piso de 5 minutos no es decorativo: en 0 nadie puede entrar ni arreglarlo desde la pantalla
    { clave: 'MINUTOS_EXPIRACION_SESION', etiqueta: 'Minutos sin actividad antes de cerrar la sesión', tipo: 'numero', min: 5, max: 1440, porDefecto: SEGURIDAD.MINUTOS_EXPIRACION_SESION },
    { clave: 'INTENTOS_INGRESO', etiqueta: 'Intentos fallidos antes de bloquear el acceso', tipo: 'numero', min: 3, max: 20, porDefecto: SEGURIDAD.INTENTOS_INGRESO },
    { clave: 'MINUTOS_BLOQUEO_INGRESO', etiqueta: 'Cuántos minutos dura ese bloqueo', tipo: 'numero', min: 1, max: 1440, porDefecto: SEGURIDAD.MINUTOS_BLOQUEO_INGRESO },
    { clave: 'DIAS_RECORDAR_SESION', etiqueta: 'Días que dura la sesión de quien marca "recordarme"', tipo: 'numero', min: 1, max: 90, porDefecto: SEGURIDAD.DIAS_RECORDAR_SESION },
    { clave: 'DIAS_DISPOSITIVO_CONFIANZA', etiqueta: 'Días que una computadora queda como de confianza', tipo: 'numero', min: 1, max: 365, porDefecto: SEGURIDAD.DIAS_DISPOSITIVO_CONFIANZA },
    { clave: 'AVISAR_INGRESO_NUEVO_EQUIPO', etiqueta: 'Avisar por correo cuando alguien entra desde una computadora nueva', tipo: 'booleano', porDefecto: SEGURIDAD.AVISAR_INGRESO_NUEVO_EQUIPO ? '1' : '0' },
    // el freno por ip los lee, así que sin estas entradas no se podían editar nunca
    { clave: 'FRECUENCIA_INGRESO_PEDIDOS', etiqueta: 'Intentos de ingreso por conexión cada 5 minutos', tipo: 'numero', min: 10, max: 1000, porDefecto: SEGURIDAD.FRECUENCIA_INGRESO.pedidos },
    { clave: 'FRECUENCIA_RECUPERACION_PEDIDOS', etiqueta: 'Pedidos de recuperación de clave por conexión cada 15 minutos', tipo: 'numero', min: 3, max: 100, porDefecto: SEGURIDAD.FRECUENCIA_RECUPERACION.pedidos },
    { clave: 'RECAPTCHA_ACTIVO', etiqueta: 'Pedir el captcha para entrar', tipo: 'booleano', porDefecto: SEGURIDAD.RECAPTCHA_ACTIVO ? '1' : '0' },
    { clave: 'RECAPTCHA_CLAVE_SITIO', etiqueta: 'Clave del sitio', tipo: 'texto', porDefecto: SEGURIDAD.RECAPTCHA_CLAVE_SITIO,
      depende: { clave: 'RECAPTCHA_ACTIVO', valor: '1' } },
    { clave: 'RECAPTCHA_CLAVE_SECRETA', etiqueta: 'Clave secreta', tipo: 'secreto', porDefecto: '',
      depende: { clave: 'RECAPTCHA_ACTIVO', valor: '1' } },
  ] },
  // correo y sms se configuran por separado: son dos servicios distintos, con
  // proveedores distintos, y mezclados en una sola lista no se entendía qué era de cuál
  { categoria: 'Correo', ajustes: [
    { clave: 'SMTP_HOST', etiqueta: 'Servidor de correo saliente', tipo: 'texto', porDefecto: CORREO.SMTP_HOST },
    { clave: 'SMTP_PUERTO', etiqueta: 'Puerto', tipo: 'numero', min: 1, max: 65535, porDefecto: CORREO.SMTP_PUERTO },
    { clave: 'SMTP_USUARIO', etiqueta: 'Cuenta de correo', tipo: 'texto', porDefecto: CORREO.SMTP_USUARIO },
    { clave: 'SMTP_CLAVE', etiqueta: 'Contraseña de la cuenta', tipo: 'secreto', porDefecto: '' },
  ] },
  { categoria: 'SMS', ajustes: [
    { clave: 'TWILIO_SID', etiqueta: 'Identificador de la cuenta', tipo: 'texto', porDefecto: SMS.TWILIO_SID },
    { clave: 'TWILIO_TOKEN', etiqueta: 'Clave de la cuenta', tipo: 'secreto', porDefecto: '' },
    { clave: 'TWILIO_VERIFY_SID', etiqueta: 'Identificador del servicio de verificación', tipo: 'texto', porDefecto: SMS.TWILIO_VERIFY_SID },
  ] },
  // las reglas con las que trabaja el colegio: las decide el colegio
  { categoria: 'Reglas del negocio', ajustes: [
    { clave: 'DIAS_SIN_SEGUIMIENTO_PARA_ALERTA', etiqueta: 'Cuántos días sin contactar a un interesado para que aparezca en las alertas', tipo: 'numero', min: 1, max: 365, porDefecto: LIMITES.DIAS_SIN_SEGUIMIENTO_PARA_ALERTA },
    { clave: 'DIAS_SIN_ACOMPANAMIENTO_RIESGO', etiqueta: 'Cuántos días sin acompañar a un estudiante para marcar como riesgo', tipo: 'numero', min: 1, max: 365, porDefecto: LIMITES.DIAS_SIN_ACOMPANAMIENTO_RIESGO },
    { clave: 'PUNTOS_POR_LEAD', etiqueta: 'Puntos que gana el aliado por cada interesado que trae', tipo: 'numero', min: 0, max: 10000, porDefecto: ALIADOS.PUNTOS_POR_LEAD },
    { clave: 'PUNTOS_POR_CONVERSION', etiqueta: 'Puntos que gana cuando ese interesado se matricula', tipo: 'numero', min: 0, max: 10000, porDefecto: ALIADOS.PUNTOS_POR_CONVERSION },
    { clave: 'COMISION_POR_CONVERSION', etiqueta: 'Comisión en guaraníes por cada matriculado', tipo: 'numero', min: 0, max: 100000000, porDefecto: ALIADOS.COMISION_POR_CONVERSION },
  ] },
  // cómo se cobra el servicio: es del proveedor, no de quien lo paga
  { categoria: 'Suscripción y cobros', ajustes: [
    { clave: 'PASARELA_PROVEEDOR', etiqueta: 'Pasarela de pagos', tipo: 'opcion',
      opciones: PASARELA.PROVEEDORES, porDefecto: PASARELA.PROVEEDOR,
      ayuda: 'Con la simulada el cobro se completa dentro del sistema, sin salir a ningún servicio externo. Sirve para probar y para mostrar el recorrido mientras Pagopar no esté habilitado.' },
    { clave: 'MESES_SUSCRIPCION', etiqueta: 'Cuántos meses dura cada período de suscripción', tipo: 'numero', min: 1, max: 36, porDefecto: PLANES_SUSCRIPCION[0].meses },
    { clave: 'DIAS_AVISO_VENCIMIENTO', etiqueta: 'Con cuántos días de anticipación avisar que la suscripción vence', tipo: 'numero', min: 0, max: 90, porDefecto: SUSCRIPCION.DIAS_AVISO_VENCIMIENTO },
    // PLAN_AL_VENCER no se edita desde acá a propósito: quien contrata el plan no puede
    // decidir a qué plan cae cuando deja de pagar, o se queda con el más caro gratis.
    // Vive en configuracion/ajustes.js y lo cambia quien tiene acceso al servidor.
    // solo tienen sentido con Pagopar elegida; con la simulada estorban
    { clave: 'PAGOPAR_TOKEN_PUBLICO', etiqueta: 'Token público de Pagopar', tipo: 'texto', porDefecto: '',
      depende: { clave: 'PASARELA_PROVEEDOR', valor: 'pagopar' } },
    { clave: 'PAGOPAR_TOKEN_PRIVADO', etiqueta: 'Token privado de Pagopar', tipo: 'secreto', porDefecto: '',
      depende: { clave: 'PASARELA_PROVEEDOR', valor: 'pagopar' } },
  ] },
  // la cara del sistema: la fija el proveedor y vale igual para todos los colegios
  { categoria: 'Apariencia', ajustes: [
    { clave: 'PLATAFORMA_NOMBRE', etiqueta: 'Nombre del sistema', tipo: 'texto', porDefecto: PLATAFORMA.NOMBRE,
      ayuda: 'Es el nombre del producto, el que se ve en el ingreso. No es el nombre de ninguna institución.' },
    { clave: 'COLOR_ACENTO', etiqueta: 'Color del sistema', tipo: 'opcion',
      opciones: COLORES_SISTEMA, porDefecto: COLORES_SISTEMA[0].valor },
    { clave: 'MOSTRAR_TEXTOS_INGRESO', etiqueta: 'Mostrar el nombre y la presentación sobre la imagen del ingreso', tipo: 'booleano',
      porDefecto: LEGALES.MOSTRAR_TEXTOS_INGRESO ? '1' : '0',
      ayuda: 'Apagalo si la imagen de fondo ya trae el nombre y el texto escritos, para que no se superpongan.' },
    { clave: 'TEXTO_PRESENTACION', etiqueta: 'Presentación que se muestra en la pantalla de ingreso', tipo: 'parrafo', porDefecto: PRESENTACION_LOGIN,
      depende: { clave: 'MOSTRAR_TEXTOS_INGRESO', valor: '1' } },
    // guarda solo el nombre del archivo; la imagen se sube aparte y se sirve estática
    { clave: 'IMAGEN_FONDO_INGRESO', etiqueta: 'Imagen de fondo del ingreso (1920 × 1080 px, hasta 2 MB)', tipo: 'texto', porDefecto: '' },
  ] },
  { categoria: 'Textos legales', ajustes: [
    { clave: 'TEXTO_AVISO_PRIVACIDAD', etiqueta: 'Aviso que aparece debajo de los formularios de registro', tipo: 'parrafo', porDefecto: AVISO_PRIVACIDAD },
    { clave: 'TEXTO_CONSENTIMIENTO', etiqueta: 'Texto de la autorización que se tilda al registrar un interesado', tipo: 'parrafo', porDefecto: LEGALES.AVISO_CONSENTIMIENTO },
    { clave: 'TEXTO_POLITICA', etiqueta: 'Política de privacidad', tipo: 'documento', porDefecto: POLITICA_PRIVACIDAD },
    { clave: 'TEXTO_TERMINOS', etiqueta: 'Términos y condiciones de uso', tipo: 'documento', porDefecto: TERMINOS_Y_CONDICIONES },
  ] },
];

// todas las claves válidas y cuáles son secretas (para no exponerlas al leer)
export const CLAVES = CATALOGO.flatMap((grupo) => grupo.ajustes.map((a) => a.clave));
export const CLAVES_SECRETAS = CATALOGO.flatMap((grupo) => grupo.ajustes.filter((a) => a.tipo === 'secreto').map((a) => a.clave));
