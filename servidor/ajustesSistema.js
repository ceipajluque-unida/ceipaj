import { bd } from './bd/conexion.js';
import { INSTITUCION, PLATAFORMA, SEGURIDAD, CORREO, SMS, LIMITES, ALIADOS, METODOS_2FA, POLITICA_CLAVE, APLICACION, PLANES_SUSCRIPCION, SUSCRIPCION, PASARELA, RECIBO, ACADEMICO, LEGALES, COLORES_SISTEMA } from '../configuracion/ajustes.js';
import { POLITICA_PRIVACIDAD, TERMINOS_Y_CONDICIONES, AVISO_PRIVACIDAD, PRESENTACION_LOGIN } from '../configuracion/legales.js';
import { AMBITO, ambitoDe } from '../configuracion/ambitos.js';
import { institucionActual, PLATAFORMA as ID_PLATAFORMA } from './contexto.js';

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
    cache = { [ID_PLATAFORMA]: {} };
  }
}

function crudo(clave) {
  if (ambitoDe(clave) === AMBITO.PLATAFORMA) return cache[ID_PLATAFORMA]?.[clave];
  const institucionId = institucionActual();
  return institucionId === null ? undefined : cache[institucionId]?.[clave];
}

const vacio = (valor) => valor === undefined || valor === null || valor === '';

export function leer(clave, porDefecto = '') {
  const valor = crudo(clave);
  return vacio(valor) ? porDefecto : valor;
}

export function leerNumero(clave, porDefecto = 0) {
  const valor = crudo(clave);
  return vacio(valor) ? porDefecto : Number(valor);
}

export function leerBooleano(clave, porDefecto = false) {
  const valor = crudo(clave);
  if (vacio(valor)) return porDefecto;
  return valor === '1' || valor === 'true';
}

export async function guardar(cambios, institucionId = null) {
  for (const [clave, valor] of Object.entries(cambios)) {
    const destino = ambitoDe(clave) === AMBITO.PLATAFORMA
      ? ID_PLATAFORMA
      : institucionId ?? institucionActual();
    if (destino === null) continue;
    await bd.query(
      'INSERT INTO ajustes_sistema (institucion_id, clave, valor) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
      [destino, clave, valor == null ? null : String(valor)]
    );
  }
  await cargar();
}

export const CATALOGO = [
  { categoria: 'Institucional', ajustes: [
    { clave: 'INSTITUCION_NOMBRE', etiqueta: 'Nombre', tipo: 'texto', porDefecto: '' },
    { clave: 'INSTITUCION_CIUDAD', etiqueta: 'Ciudad', tipo: 'texto', porDefecto: '' },
    { clave: 'ACADEMICO_CLAVE_ENTRADA', etiqueta: 'Clave que usa el sistema académico para enviar matriculados', tipo: 'secreto', porDefecto: '', generable: true },
  ] },
  { categoria: 'Datos del proveedor', ajustes: [
    { clave: 'RECIBO_EMISOR_NOMBRE', etiqueta: 'Razón social', tipo: 'texto', porDefecto: '' },
    { clave: 'RECIBO_EMISOR_DIRECCION', etiqueta: 'Dirección', tipo: 'texto', porDefecto: '' },
    { clave: 'RECIBO_EMISOR_TELEFONO', etiqueta: 'Teléfono', tipo: 'texto', porDefecto: '' },
    { clave: 'RECIBO_EMISOR_CORREO', etiqueta: 'Correo', tipo: 'texto', porDefecto: '' },
    { clave: 'RECIBO_SERIE', etiqueta: 'Serie del recibo', tipo: 'texto', porDefecto: RECIBO.SERIE },
    { clave: 'APP_URL', etiqueta: 'Dirección web', tipo: 'texto', porDefecto: APLICACION.URL },
  ] },
  { categoria: 'Seguridad', ajustes: [
    { clave: 'CLAVE_LARGO_MIN', etiqueta: 'Largo mínimo de la contraseña', tipo: 'numero', min: 6, max: 64, porDefecto: POLITICA_CLAVE.LARGO_MIN },
    { clave: 'CLAVE_MAYUS', etiqueta: 'Pedir una mayúscula', tipo: 'booleano', porDefecto: POLITICA_CLAVE.MAYUS ? '1' : '0' },
    { clave: 'CLAVE_MINUS', etiqueta: 'Pedir una minúscula', tipo: 'booleano', porDefecto: POLITICA_CLAVE.MINUS ? '1' : '0' },
    { clave: 'CLAVE_NUMERO', etiqueta: 'Pedir un número', tipo: 'booleano', porDefecto: POLITICA_CLAVE.NUMERO ? '1' : '0' },
    { clave: 'CLAVE_ESPECIAL', etiqueta: 'Pedir un símbolo', tipo: 'booleano', porDefecto: POLITICA_CLAVE.ESPECIAL ? '1' : '0' },
    { clave: 'CLAVE_DIAS_VIGENCIA', etiqueta: 'Días de vigencia de la contraseña (0 = no vence)', tipo: 'numero', min: 0, max: 3650, porDefecto: POLITICA_CLAVE.DIAS_VIGENCIA },
    { clave: 'METODO_2FA_DEFECTO', etiqueta: 'Verificación en dos pasos', tipo: 'opcion', opciones: METODOS_2FA, porDefecto: SEGURIDAD.METODO_2FA_DEFECTO },
    { clave: 'MINUTOS_EXPIRACION_SESION', etiqueta: 'Minutos de inactividad para cortar la sesión', tipo: 'numero', min: 5, max: 1440, porDefecto: SEGURIDAD.MINUTOS_EXPIRACION_SESION },
    { clave: 'INTENTOS_INGRESO', etiqueta: 'Intentos de ingreso antes de bloquear', tipo: 'numero', min: 3, max: 20, porDefecto: SEGURIDAD.INTENTOS_INGRESO },
    { clave: 'MINUTOS_BLOQUEO_INGRESO', etiqueta: 'Minutos que dura el bloqueo', tipo: 'numero', min: 1, max: 1440, porDefecto: SEGURIDAD.MINUTOS_BLOQUEO_INGRESO },
    { clave: 'DIAS_RECORDAR_SESION', etiqueta: 'Días que dura "Recordarme en este equipo"', tipo: 'numero', min: 1, max: 90, porDefecto: SEGURIDAD.DIAS_RECORDAR_SESION },
    { clave: 'DIAS_DISPOSITIVO_CONFIANZA', etiqueta: 'Días que se recuerda un equipo de confianza', tipo: 'numero', min: 1, max: 365, porDefecto: SEGURIDAD.DIAS_DISPOSITIVO_CONFIANZA },
    { clave: 'AVISAR_INGRESO_NUEVO_EQUIPO', etiqueta: 'Avisar ingresos desde un equipo nuevo', tipo: 'booleano', porDefecto: SEGURIDAD.AVISAR_INGRESO_NUEVO_EQUIPO ? '1' : '0' },
    { clave: 'FRECUENCIA_INGRESO_PEDIDOS', etiqueta: 'Tope de ingresos por IP cada 5 minutos', tipo: 'numero', min: 10, max: 1000, porDefecto: SEGURIDAD.FRECUENCIA_INGRESO.pedidos },
    { clave: 'FRECUENCIA_RECUPERACION_PEDIDOS', etiqueta: 'Tope de recuperaciones de clave por IP cada 15 minutos', tipo: 'numero', min: 3, max: 100, porDefecto: SEGURIDAD.FRECUENCIA_RECUPERACION.pedidos },
    { clave: 'FRECUENCIA_SOLICITUD_PEDIDOS', etiqueta: 'Tope de solicitudes de la página pública por IP cada 15 minutos', tipo: 'numero', min: 1, max: 100, porDefecto: SEGURIDAD.FRECUENCIA_SOLICITUD.pedidos },
    { clave: 'RECAPTCHA_ACTIVO', etiqueta: 'Captcha en el ingreso y en el formulario público', tipo: 'booleano', porDefecto: SEGURIDAD.RECAPTCHA_ACTIVO ? '1' : '0' },
    { clave: 'RECAPTCHA_CLAVE_SITIO', etiqueta: 'Clave del sitio', tipo: 'texto', porDefecto: SEGURIDAD.RECAPTCHA_CLAVE_SITIO,
      depende: { clave: 'RECAPTCHA_ACTIVO', valor: '1' } },
    { clave: 'RECAPTCHA_CLAVE_SECRETA', etiqueta: 'Clave secreta', tipo: 'secreto', porDefecto: '',
      depende: { clave: 'RECAPTCHA_ACTIVO', valor: '1' } },
  ] },
  { categoria: 'Correo', ajustes: [
    { clave: 'SMTP_HOST', etiqueta: 'Servidor SMTP', tipo: 'texto', porDefecto: CORREO.SMTP_HOST },
    { clave: 'SMTP_PUERTO', etiqueta: 'Puerto', tipo: 'numero', min: 1, max: 65535, porDefecto: CORREO.SMTP_PUERTO },
    { clave: 'SMTP_USUARIO', etiqueta: 'Cuenta', tipo: 'texto', porDefecto: CORREO.SMTP_USUARIO },
    { clave: 'SMTP_CLAVE', etiqueta: 'Contraseña', tipo: 'secreto', porDefecto: '' },
  ] },
  { categoria: 'SMS', ajustes: [
    { clave: 'TWILIO_SID', etiqueta: 'Account SID', tipo: 'texto', porDefecto: SMS.TWILIO_SID },
    { clave: 'TWILIO_TOKEN', etiqueta: 'Auth Token', tipo: 'secreto', porDefecto: '' },
    { clave: 'TWILIO_VERIFY_SID', etiqueta: 'Verify Service SID', tipo: 'texto', porDefecto: SMS.TWILIO_VERIFY_SID },
  ] },
  { categoria: 'Reglas del negocio', ajustes: [
    { clave: 'DIAS_SIN_SEGUIMIENTO_PARA_ALERTA', etiqueta: 'Días sin contactar a un interesado antes de alertar', tipo: 'numero', min: 1, max: 365, porDefecto: LIMITES.DIAS_SIN_SEGUIMIENTO_PARA_ALERTA },
    { clave: 'DIAS_SIN_ACOMPANAMIENTO_RIESGO', etiqueta: 'Días sin acompañar a un matriculado antes de marcarlo en riesgo', tipo: 'numero', min: 1, max: 365, porDefecto: LIMITES.DIAS_SIN_ACOMPANAMIENTO_RIESGO },
    { clave: 'PUNTOS_POR_LEAD', etiqueta: 'Puntos que suma el aliado por cada interesado que recomienda', tipo: 'numero', min: 0, max: 10000, porDefecto: ALIADOS.PUNTOS_POR_LEAD },
    { clave: 'PUNTOS_POR_CONVERSION', etiqueta: 'Puntos que suma el aliado cuando su recomendado se matricula', tipo: 'numero', min: 0, max: 10000, porDefecto: ALIADOS.PUNTOS_POR_CONVERSION },
    { clave: 'COMISION_TIPO', etiqueta: 'Cómo se calcula la comisión del aliado', tipo: 'opcion',
      opciones: [
        { valor: 'monto', texto: 'Monto fijo por matriculado' },
        { valor: 'porcentaje', texto: 'Porcentaje del valor de la matrícula' },
      ],
      porDefecto: ALIADOS.COMISION_TIPO },
    { clave: 'COMISION_POR_CONVERSION', etiqueta: 'Comisión por matriculado', tipo: 'numero', moneda: true, min: 0, max: 100000000, porDefecto: ALIADOS.COMISION_POR_CONVERSION,
      depende: { clave: 'COMISION_TIPO', valor: 'monto' } },
    { clave: 'COMISION_PORCENTAJE', etiqueta: 'Porcentaje de comisión', tipo: 'numero', min: 0, max: 100, porDefecto: ALIADOS.COMISION_PORCENTAJE,
      depende: { clave: 'COMISION_TIPO', valor: 'porcentaje' } },
    { clave: 'MATRICULA_REFERENCIA', etiqueta: 'Valor de la matrícula que se toma de base', tipo: 'numero', moneda: true, min: 0, max: 100000000, porDefecto: ALIADOS.MATRICULA_REFERENCIA,
      depende: { clave: 'COMISION_TIPO', valor: 'porcentaje' } },
  ] },
  { categoria: 'Suscripción y cobros', ajustes: [
    { clave: 'PASARELA_PROVEEDOR', etiqueta: 'Pasarela', tipo: 'opcion',
      opciones: PASARELA.PROVEEDORES, porDefecto: PASARELA.PROVEEDOR },
    { clave: 'DIAS_AVISO_VENCIMIENTO', etiqueta: 'Días de aviso antes del vencimiento', tipo: 'numero', min: 0, max: 90, porDefecto: SUSCRIPCION.DIAS_AVISO_VENCIMIENTO },
    { clave: 'PAGOPAR_TOKEN_PUBLICO', etiqueta: 'Token público', tipo: 'texto', porDefecto: '',
      depende: { clave: 'PASARELA_PROVEEDOR', valor: 'pagopar' } },
    { clave: 'PAGOPAR_TOKEN_PRIVADO', etiqueta: 'Token privado', tipo: 'secreto', porDefecto: '',
      depende: { clave: 'PASARELA_PROVEEDOR', valor: 'pagopar' } },
    { clave: 'ADAMSPAY_API_KEY', etiqueta: 'Api key', tipo: 'texto', porDefecto: '',
      depende: { clave: 'PASARELA_PROVEEDOR', valor: 'adamspay' } },
    { clave: 'ADAMSPAY_SECRETO', etiqueta: 'Api secret', tipo: 'secreto', porDefecto: '',
      depende: { clave: 'PASARELA_PROVEEDOR', valor: 'adamspay' } },
  ] },
  { categoria: 'Apariencia', ajustes: [
    { clave: 'PLATAFORMA_NOMBRE', etiqueta: 'Nombre del sistema', tipo: 'texto', porDefecto: PLATAFORMA.NOMBRE },
    { clave: 'COLOR_ACENTO', etiqueta: 'Color', tipo: 'opcion',
      opciones: COLORES_SISTEMA, porDefecto: COLORES_SISTEMA[0].valor },
    { clave: 'MOSTRAR_TEXTOS_INGRESO', etiqueta: 'Mostrar los textos sobre la imagen', tipo: 'booleano',
      porDefecto: LEGALES.MOSTRAR_TEXTOS_INGRESO ? '1' : '0' },
    { clave: 'TEXTO_PRESENTACION', etiqueta: 'Presentación del ingreso', tipo: 'parrafo', porDefecto: PRESENTACION_LOGIN,
      depende: { clave: 'MOSTRAR_TEXTOS_INGRESO', valor: '1' } },
    { clave: 'IMAGEN_FONDO_INGRESO', etiqueta: 'Imagen de fondo', tipo: 'texto', porDefecto: '' },
  ] },
  { categoria: 'Textos legales', ajustes: [
    { clave: 'TEXTO_AVISO_PRIVACIDAD', etiqueta: 'Aviso de privacidad', tipo: 'parrafo', porDefecto: AVISO_PRIVACIDAD },
    { clave: 'TEXTO_CONSENTIMIENTO', etiqueta: 'Consentimiento del interesado', tipo: 'parrafo', porDefecto: LEGALES.AVISO_CONSENTIMIENTO },
    { clave: 'TEXTO_POLITICA', etiqueta: 'Política de privacidad', tipo: 'documento', porDefecto: POLITICA_PRIVACIDAD },
    { clave: 'TEXTO_TERMINOS', etiqueta: 'Términos y condiciones', tipo: 'documento', porDefecto: TERMINOS_Y_CONDICIONES },
  ] },
];

export const CLAVES = CATALOGO.flatMap((grupo) => grupo.ajustes.map((a) => a.clave));
export const CLAVES_SECRETAS = CATALOGO.flatMap((grupo) => grupo.ajustes.filter((a) => a.tipo === 'secreto').map((a) => a.clave));
