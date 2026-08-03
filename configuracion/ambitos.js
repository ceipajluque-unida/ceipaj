// a quién pertenece cada ajuste. la plataforma es el proveedor del servicio y la
// institución es el colegio que lo contrata. sin este reparto, el que paga la
// suscripción podía fijarse a sí mismo el precio y el plan al que cae al vencer.
//
// archivo de datos puro, sin imports: lo leen tanto el catálogo de ajustes como la
// migración, y la migración no puede abrir el pool de conexiones.

export const AMBITO = {
  PLATAFORMA: 'plataforma',
  INSTITUCION: 'institucion',
};

// lo que fija el proveedor y vale igual para todas las instituciones
export const CLAVES_PLATAFORMA = [
  // seguridad: la política es del servicio, no de cada cliente
  'CLAVE_LARGO_MIN', 'CLAVE_MAYUS', 'CLAVE_MINUS', 'CLAVE_NUMERO', 'CLAVE_ESPECIAL',
  'CLAVE_DIAS_VIGENCIA', 'METODO_2FA_DEFECTO', 'MINUTOS_EXPIRACION_SESION',
  'INTENTOS_INGRESO', 'MINUTOS_BLOQUEO_INGRESO', 'DIAS_RECORDAR_SESION',
  'DIAS_DISPOSITIVO_CONFIANZA', 'AVISAR_INGRESO_NUEVO_EQUIPO',
  'FRECUENCIA_INGRESO_PEDIDOS', 'FRECUENCIA_RECUPERACION_PEDIDOS',
  'RECAPTCHA_ACTIVO', 'RECAPTCHA_CLAVE_SITIO', 'RECAPTCHA_CLAVE_SECRETA',
  // cobranza: la pasarela y el recibo son de quien cobra
  'PAGOPAR_TOKEN_PUBLICO', 'PAGOPAR_TOKEN_PRIVADO',
  'RECIBO_EMISOR_NOMBRE', 'RECIBO_EMISOR_DIRECCION', 'RECIBO_EMISOR_TELEFONO',
  'RECIBO_EMISOR_CORREO', 'RECIBO_SERIE',
  // suscripción: cuánto dura y con cuánto aviso lo define el proveedor
  'MESES_SUSCRIPCION', 'DIAS_AVISO_VENCIMIENTO',
  // textos legales: los publica el proveedor del servicio
  'TEXTO_PRESENTACION', 'MOSTRAR_TEXTOS_INGRESO', 'TEXTO_AVISO_PRIVACIDAD', 'TEXTO_CONSENTIMIENTO',
  'IMAGEN_FONDO_INGRESO', 'COLOR_ACENTO',
  'TEXTO_POLITICA', 'TEXTO_TERMINOS',
  // dirección web del sistema
  'APP_URL',
];

// todo lo demás es de cada institución: su nombre, su correo, sus reglas de negocio
// y la clave con la que su sistema académico le manda los matriculados
export function ambitoDe(clave) {
  return CLAVES_PLATAFORMA.includes(clave) ? AMBITO.PLATAFORMA : AMBITO.INSTITUCION;
}
