import 'dotenv/config';

export const SERVIDOR = {
  PUERTO: Number(process.env.PUERTO ?? 4000),

  DETRAS_DE_PROXY: process.env.DETRAS_DE_PROXY === '1',
};

export const APLICACION = {
  URL: process.env.APP_URL ?? 'http://localhost:5173',
};

export const POLITICA_CLAVE = {
  LARGO_MIN: 8,
  MAYUS: true,
  MINUS: true,
  NUMERO: true,
  ESPECIAL: true,
  DIAS_VIGENCIA: 0,
};

export const BASE_DATOS = {
  HOST: process.env.BD_HOST ?? 'localhost',
  PUERTO: Number(process.env.BD_PUERTO ?? 3306),
  USUARIO: process.env.BD_USUARIO ?? 'root',
  CLAVE: process.env.BD_CLAVE ?? '',
  NOMBRE: process.env.BD_NOMBRE ?? 'ceipaj_sig',
};

export const PLATAFORMA = {
  NOMBRE: process.env.PLATAFORMA_NOMBRE ?? 'Sistema de Información Gerencial',
};

export const INSTITUCION = {
  NOMBRE: process.env.INSTITUCION_NOMBRE ?? 'Centro Educativo Integral para Adultos y Jóvenes',
  CIUDAD: process.env.INSTITUCION_CIUDAD ?? 'Luque',
};

export const SEGURIDAD = {
  JWT_SECRETO: process.env.JWT_SECRETO ?? 'CEIPAJULTRASECRETOUNIDA',
  MINUTOS_EXPIRACION_SESION: 30,
  MINUTOS_TOKEN_PRE_2FA: 5,
  MINUTOS_CODIGO_2FA: 5,
  RONDAS_BCRYPT: 10,
  EMISOR_2FA: 'CEIPAJ SIG',
  METODO_2FA_DEFECTO: process.env.METODO_2FA_DEFECTO ?? 'app',
  INTENTOS_INGRESO: 5,
  MINUTOS_BLOQUEO_INGRESO: 15,

  DIAS_RECORDAR_SESION: 5,

  MODO_PRUEBA: process.env.MODO_PRUEBA !== '0',
  DIAS_DISPOSITIVO_CONFIANZA: 30,
  AVISAR_INGRESO_NUEVO_EQUIPO: true,

  FRECUENCIA_INGRESO: { pedidos: 100, segundos: 300 },
  FRECUENCIA_RECUPERACION: { pedidos: 10, segundos: 900 },
  FRECUENCIA_GENERAL: { pedidos: 300, segundos: 300 },
  FRECUENCIA_SOLICITUD: { pedidos: 15, segundos: 900 },
  RECAPTCHA_ACTIVO: process.env.RECAPTCHA_ACTIVO === '1',
  RECAPTCHA_CLAVE_SITIO: process.env.RECAPTCHA_CLAVE_SITIO ?? '',
  RECAPTCHA_CLAVE_SECRETA: process.env.RECAPTCHA_CLAVE_SECRETA ?? '',
};

export const METODOS_2FA = [
  { valor: 'app', texto: 'Aplicación de autenticación' },
  { valor: 'email', texto: 'Código por correo electrónico' },
  { valor: 'sms', texto: 'Código por SMS' },
];

export const CORREO = {
  SMTP_HOST: process.env.SMTP_HOST ?? '',
  SMTP_PUERTO: Number(process.env.SMTP_PUERTO ?? 587),
  SMTP_USUARIO: process.env.SMTP_USUARIO ?? '',
  SMTP_CLAVE: process.env.SMTP_CLAVE ?? '',
  REMITENTE: process.env.SMTP_REMITENTE ?? 'CEIPAJ <no-responder@ceipaj.edu.py>',
};

export const PASARELA = {
  MONEDA: 'PYG',

  PROVEEDOR: process.env.PASARELA_PROVEEDOR ?? 'simulada',
  // el texto es el nombre visible de la pasarela: se usa en Configuración y en el recibo
  PROVEEDORES: [
    { valor: 'simulada', texto: 'Demo' },
    { valor: 'pagopar', texto: 'Pagopar' },
    { valor: 'adamspay', texto: 'AdamsPay' },
  ],

  MINUTOS_ENTRE_CONCILIACIONES: 2,
  MAXIMO_POR_CONCILIACION: 20,

  SEGUNDOS_ENTRE_CONSULTAS_DE_PAGO: 20,
};

export function nombreDePasarela(valor) {
  return PASARELA.PROVEEDORES.find((proveedor) => proveedor.valor === valor)?.texto ?? valor;
}

export const PAGOPAR = {
  API: 'https://api.pagopar.com/api',
  CHECKOUT: 'https://www.pagopar.com/pagos',
  TOKEN_PUBLICO: process.env.PAGOPAR_TOKEN_PUBLICO ?? '',
  TOKEN_PRIVADO: process.env.PAGOPAR_TOKEN_PRIVADO ?? '',
  DIAS_PARA_PAGAR: 3,
  SEGUNDOS_ESPERA: 20,

  MS_ENTRE_LLAMADAS: 400,
  MINUTOS_CACHE_MEDIOS: 15,
  // topes por transacción que impone el comercio
  MONTO_MINIMO: 1000,
  MONTO_MAXIMO: 50000000,

  // la suscripción no se despacha: va con la categoría de servicios de su catálogo
  CATEGORIA_SERVICIO: '909',
};

export const ADAMSPAY = {
  ENTORNOS: {
    staging: 'https://staging.adamspay.com/api/v1',
    produccion: 'https://checkout.adamspay.com/api/v1',
  },
  ENTORNO: process.env.ADAMSPAY_ENTORNO ?? 'staging',
  API_KEY: process.env.ADAMSPAY_API_KEY ?? '',
  SECRETO: process.env.ADAMSPAY_SECRETO ?? '',
  DIAS_PARA_PAGAR: 3,
  SEGUNDOS_ESPERA: 20,

  SEGUNDOS_PRIMERA_CONSULTA: 30,
  SEGUNDOS_ENTRE_CONSULTAS: 120,
  MAXIMO_CONSULTAS_POR_PAGO: 6,
};

export const CHECKOUT = {
  INCRUSTADO: process.env.CHECKOUT_INCRUSTADO !== '0',
  ALTO_PIXELES: 640,

  SEGUNDOS_CONSULTA: 5,
  MINUTOS_MAXIMO_ESPERA: 15,
};

export const RECIBO = {
  EMISOR_NOMBRE: process.env.RECIBO_EMISOR_NOMBRE ?? '',
  EMISOR_DIRECCION: process.env.RECIBO_EMISOR_DIRECCION ?? '',
  EMISOR_TELEFONO: process.env.RECIBO_EMISOR_TELEFONO ?? '',
  EMISOR_CORREO: process.env.RECIBO_EMISOR_CORREO ?? '',
  SERIE: process.env.RECIBO_SERIE ?? 'REC',

  LEYENDA: 'Documento no tributario, no válido para crédito fiscal: no constituye Comprobante de Venta '
    + 'ni Documento Tributario Electrónico conforme al Decreto N.º 6.539/2005 y al Decreto N.º 872/2023 (SIFEN).',
};

export const SMS = {
  TWILIO_SID: process.env.TWILIO_SID ?? '',
  TWILIO_TOKEN: process.env.TWILIO_TOKEN ?? '',
  TWILIO_VERIFY_SID: process.env.TWILIO_VERIFY_SID ?? '',
  PREFIJO_PAIS: process.env.SMS_PREFIJO_PAIS ?? '+595',
};

export const ACADEMICO = {
  CLAVE_ENTRADA: process.env.ACADEMICO_CLAVE_ENTRADA ?? '',

  MINUTOS_SINCRONIZACION: Number(process.env.ACADEMICO_MINUTOS_SINCRONIZACION ?? 0),
};

export const ESTADOS_LEAD = {
  NUEVO: 'nuevo',
  INTERESADO: 'interesado',
  MATRICULADO: 'matriculado',
  PERDIDO: 'perdido',
};

export const ROLES = {
  ADMINISTRADOR: 'administrador',
  COMERCIAL: 'comercial',
  DIRECCION: 'direccion',
  ALIADO: 'aliado',

  SUPERADMINISTRADOR: 'superadministrador',
};

// tonos de la paleta de ant design; todos pasan 4.5:1 sobre blanco, que es
// lo que exige el contraste porque el acento se usa de fondo con texto blanco
export const COLORES_SISTEMA = [
  { valor: '#0958d9', texto: 'Azul' },
  { valor: '#006d75', texto: 'Turquesa' },
  { valor: '#237804', texto: 'Verde' },
  { valor: '#722ed1', texto: 'Lila' },
  { valor: '#cf1322', texto: 'Rojo' },
  { valor: '#8a3d52', texto: 'Bordó' },
];

// los colores viejos se cambian por su equivalente nuevo para que a nadie
// le quede un acento que ya no figura en la lista
export const COLORES_REEMPLAZADOS = {
  '#35597e': '#0958d9',
  '#2a7f76': '#006d75',
  '#3d7a4e': '#237804',
  '#5f5182': '#722ed1',
  '#a85c42': '#cf1322',
};

export const CANALES_CAPTACION = ['redes sociales', 'llamada', 'whatsapp', 'presencial', 'aliado', 'otro'];

export const TIPOS_INTERACCION = ['llamada', 'whatsapp', 'correo', 'visita', 'otro'];

export const TIPOS_ACCION_SEGUIMIENTO = ['contacto telefónico', 'recordatorio', 'reunión', 'otro'];

export const ESTADOS_PAGO = {
  PENDIENTE: 'pendiente',
  EXITOSO: 'exitoso',
  RECHAZADO: 'rechazado',
};

export const MEDIOS_PAGO = [
  { valor: 'tarjeta', texto: 'Tarjeta de crédito/débito' },
  { valor: 'transferencia', texto: 'Transferencia bancaria' },
  { valor: 'deposito', texto: 'Depósito bancario' },
  { valor: 'billetera', texto: 'Billetera electrónica' },
];

export const MODULOS_NUCLEO = ['usuarios', 'configuracion', 'suscripcion', 'pagos', 'auditoria'];

// según la tabla 19 de la tesis: todos los planes incluyen todos los módulos
// y se diferencian por los topes de usuarios y aliados y por el soporte
export const PLANES_SUSCRIPCION = [
  {
    valor: 'basico',
    texto: 'Básico',
    precio: 600000,
    meses: 1,
    maxUsuarios: 3,
    maxAliados: 10,
    modulos: [],
    incluye: ['Soporte estándar'],
  },
  {
    valor: 'estandar',
    texto: 'Estándar',
    precio: 1200000,
    meses: 1,
    maxUsuarios: 8,
    maxAliados: 25,
    modulos: [],
    incluye: ['Soporte estándar'],
  },
  {
    valor: 'avanzado',
    texto: 'Avanzado',
    precio: 2200000,
    meses: 1,
    maxUsuarios: null,
    maxAliados: null,
    modulos: [],
    incluye: ['Soporte prioritario'],
  },
];

export const ESTADOS_SUSCRIPCION = {
  ACTIVA: 'activa',
  VENCIDA: 'vencida',
  CANCELADA: 'cancelada',
};

export const SUSCRIPCION = {
  DIAS_AVISO_VENCIMIENTO: 7,
  HORAS_CONTROL_VENCIMIENTO: 12,

  PLAN_AL_VENCER: 'basico',

  SEGUNDOS_CACHE_PLAN: Number(process.env.CACHE_PLAN_SEGUNDOS ?? 20),
};

export const CARGOS_ALIADO = ['docente', 'directivo', 'otro referente'];

export const ALIADOS = {
  PUNTOS_POR_LEAD: 10,
  PUNTOS_POR_CONVERSION: 50,
  COMISION_TIPO: 'monto',
  COMISION_POR_CONVERSION: 100000,
  COMISION_PORCENTAJE: 10,
  MATRICULA_REFERENCIA: 0,
};

export const LIMITES = {
  DIAS_SIN_SEGUIMIENTO_PARA_ALERTA: 7,
  DIAS_SIN_ACOMPANAMIENTO_RIESGO: 30,
};

export const LEGALES = {
  MOSTRAR_TEXTOS_INGRESO: true,
  AVISO_CONSENTIMIENTO:
    'El interesado autoriza al CEIPAJ a registrar y usar sus datos de contacto ' +
    'únicamente para informarle sobre su oferta educativa y dar seguimiento a su ' +
    'interés (Ley N.º 7593/2025 de Protección de Datos Personales).',
};
