import 'dotenv/config';

export const SERVIDOR = {
  PUERTO: Number(process.env.PUERTO ?? 4000),
  // se prende al desplegar detrás de nginx o cloudflare, para que req.ip sea la real
  DETRAS_DE_PROXY: process.env.DETRAS_DE_PROXY === '1',
};

export const APLICACION = {
  URL: process.env.APP_URL ?? 'http://localhost:5173',
};

//política de contraseñas...configurable
export const POLITICA_CLAVE = {
  LARGO_MIN: 8,
  MAYUS: true,
  MINUS: true,
  NUMERO: true,
  ESPECIAL: true,
  DIAS_VIGENCIA: 0, // en 0 nunca vence
};

//conexión a mysql
export const BASE_DATOS = {
  HOST: process.env.BD_HOST ?? 'localhost',
  PUERTO: Number(process.env.BD_PUERTO ?? 3306),
  USUARIO: process.env.BD_USUARIO ?? 'root',
  CLAVE: process.env.BD_CLAVE ?? '',
  NOMBRE: process.env.BD_NOMBRE ?? 'ceipaj_sig',
};

//datos de la institución...editable
export const INSTITUCION = {
  NOMBRE: process.env.INSTITUCION_NOMBRE ?? 'Centro Educativo Integral para Adultos y Jóvenes',
  CIUDAD: process.env.INSTITUCION_CIUDAD ?? 'Luque',
};

//sesiones
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
  // si el usuario marca "recordarme", la sesión le dura estos días en ese equipo
  DIAS_RECORDAR_SESION: 5,
  // muestra códigos y enlaces en pantalla mientras no haya correo ni sms
  MODO_PRUEBA: process.env.MODO_PRUEBA !== '0',
  DIAS_DISPOSITIVO_CONFIANZA: 30,
  AVISAR_INGRESO_NUEVO_EQUIPO: true,
  // captcha del ingreso; sin las dos claves cargadas no se exige
  // control de frecuencia por ip de las rutas públicas. van holgados a propósito: la
  // institución sale a internet por una sola ip y el freno fino ya lo hace bloqueos.js
  // por correo; esto corta el volumen automatizado, no al usuario que se equivoca.
  FRECUENCIA_INGRESO: { pedidos: 100, segundos: 300 },
  FRECUENCIA_RECUPERACION: { pedidos: 10, segundos: 900 },
  FRECUENCIA_GENERAL: { pedidos: 300, segundos: 300 },
  RECAPTCHA_ACTIVO: process.env.RECAPTCHA_ACTIVO === '1',
  RECAPTCHA_CLAVE_SITIO: process.env.RECAPTCHA_CLAVE_SITIO ?? '',
  RECAPTCHA_CLAVE_SECRETA: process.env.RECAPTCHA_CLAVE_SECRETA ?? '',
};

// métodos de verificación
export const METODOS_2FA = [
  { valor: 'app', texto: 'Aplicación de autenticación (Google Authenticator)' },
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
  // la conciliación consulta un pago por llamada, así que se limita cuánto y cada cuánto
  MINUTOS_ENTRE_CONCILIACIONES: 2,
  MAXIMO_POR_CONCILIACION: 20,
  // corriendo en local la pasarela no puede avisar, así que el estado se pregunta.
  // este es el mínimo entre consultas del MISMO pago, para no salir en cada sondeo.
  SEGUNDOS_ENTRE_CONSULTAS_DE_PAGO: 20,
};

// pagopar usa la misma api en desarrollo y en producción, el entorno lo define el par de claves
export const PAGOPAR = {
  API: 'https://api.pagopar.com/api',
  CHECKOUT: 'https://www.pagopar.com/pagos',
  TOKEN_PUBLICO: process.env.PAGOPAR_TOKEN_PUBLICO ?? '',
  TOKEN_PRIVADO: process.env.PAGOPAR_TOKEN_PRIVADO ?? '',
  DIAS_PARA_PAGAR: 3,
  SEGUNDOS_ESPERA: 20,
  // es un servicio ajeno y las llamadas salen de nuestra ip: no hay que golpearlo
  MS_ENTRE_LLAMADAS: 400,
  MINUTOS_CACHE_MEDIOS: 15,
};

// el checkout se muestra dentro de la pantalla; si el proveedor bloqueara el marco, se abre aparte
export const CHECKOUT = {
  INCRUSTADO: process.env.CHECKOUT_INCRUSTADO !== '0',
  ALTO_PIXELES: 640,
  // cada cuánto se le pregunta al servidor si el pago ya se acreditó
  SEGUNDOS_CONSULTA: 5,
  MINUTOS_MAXIMO_ESPERA: 15,
};

// datos que salen impresos en el recibo de pago
export const RECIBO = {
  EMISOR_NOMBRE: process.env.RECIBO_EMISOR_NOMBRE ?? '',
  EMISOR_DIRECCION: process.env.RECIBO_EMISOR_DIRECCION ?? '',
  EMISOR_TELEFONO: process.env.RECIBO_EMISOR_TELEFONO ?? '',
  EMISOR_CORREO: process.env.RECIBO_EMISOR_CORREO ?? '',
  SERIE: process.env.RECIBO_SERIE ?? 'REC',
  // la dnit no exige timbrar el recibo de dinero, pero hay que aclarar que no da crédito fiscal
  LEYENDA: 'DOCUMENTO NO TRIBUTARIO — NO VÁLIDO PARA CRÉDITO FISCAL. Este comprobante acredita '
    + 'únicamente la recepción del pago y no constituye Comprobante de Venta ni Documento Tributario '
    + 'Electrónico conforme al Decreto N.º 6.539/2005 y al Decreto N.º 872/2023 (SIFEN).',
};

export const SMS = {
  TWILIO_SID: process.env.TWILIO_SID ?? '',
  TWILIO_TOKEN: process.env.TWILIO_TOKEN ?? '',
  TWILIO_DESDE: process.env.TWILIO_DESDE ?? '',
  TWILIO_VERIFY_SID: process.env.TWILIO_VERIFY_SID ?? '',
};

// los matriculados llegan por planilla csv o los empuja el académico a la api de entrada
export const ACADEMICO = {
  // clave que tiene que mandar el sistema académico para poder dejar datos
  CLAVE_ENTRADA: process.env.ACADEMICO_CLAVE_ENTRADA ?? '',
  // cada cuántos minutos cruzar solo lo recibido contra los interesados (0 = solo a mano)
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
  // el proveedor del servicio, por encima de la institución. no se asigna desde la
  // pantalla de usuarios: se crea con npm run crear-superadministrador
  SUPERADMINISTRADOR: 'superadministrador',
};

// paleta del sistema. la fija el proveedor y vale para todas las instituciones:
// antes cada usuario elegia la suya y quedaba guardada en su navegador
export const COLORES_SISTEMA = [
  { valor: '#35597e', texto: 'Azul institucional' },
  { valor: '#2a7f76', texto: 'Turquesa' },
  { valor: '#3d7a4e', texto: 'Verde' },
  { valor: '#5f5182', texto: 'Violeta' },
  { valor: '#a85c42', texto: 'Terracota' },
  { valor: '#8a3d52', texto: 'Bordó' },
];

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

// módulos que se usan para administrar la propia cuenta: nunca se bloquean por
// plan, porque si el vencimiento tapara pagos o suscripción no habría forma de
// renovar y la institución quedaría encerrada afuera.
export const MODULOS_NUCLEO = ['usuarios', 'configuracion', 'suscripcion', 'pagos', 'auditoria'];

// planes con los que se cobra el uso de la plataforma. modulos habilita el
// acceso (vacío = todos) y maxUsuarios topea las cuentas internas (null = sin tope).
export const PLANES_SUSCRIPCION = [
  {
    valor: 'basico',
    texto: 'Básico',
    precio: 250000,
    meses: 1,
    maxUsuarios: 3,
    modulos: ['leads', 'seguimiento'],
    incluye: ['Gestión de interesados', 'Seguimiento y alertas', 'Hasta 3 usuarios internos'],
  },
  {
    valor: 'estandar',
    texto: 'Estándar',
    precio: 450000,
    meses: 1,
    maxUsuarios: 8,
    modulos: ['leads', 'seguimiento', 'aliados', 'portal', 'comisiones', 'reportes'],
    incluye: ['Todo lo del plan Básico', 'Aliados institucionales y comisiones', 'Reportes con exportación', 'Hasta 8 usuarios internos'],
  },
  {
    valor: 'avanzado',
    texto: 'Avanzado',
    precio: 750000,
    meses: 1,
    maxUsuarios: null,
    modulos: [],
    incluye: ['Todo lo del plan Estándar', 'Conversión con el sistema académico', 'Tablero gerencial completo', 'Usuarios internos sin límite'],
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
  // sin suscripción vigente el sistema cae a este plan en vez de cerrarse: así la
  // institución sigue trabajando con lo básico y puede entrar a pagar la renovación
  PLAN_AL_VENCER: 'basico',
  // segundos que se cachea el plan en vigor; en 0 se relee siempre (lo usan las pruebas)
  SEGUNDOS_CACHE_PLAN: Number(process.env.CACHE_PLAN_SEGUNDOS ?? 20),
};

// el rf12 habla de docentes o directivos, así que se guarda cuál de los dos es
export const CARGOS_ALIADO = ['docente', 'directivo', 'otro referente'];

export const ALIADOS = {
  PUNTOS_POR_LEAD: 10,
  PUNTOS_POR_CONVERSION: 50,
  COMISION_POR_CONVERSION: 100000,
};

export const LIMITES = {
  DIAS_SIN_SEGUIMIENTO_PARA_ALERTA: 7,
  DIAS_SIN_ACOMPANAMIENTO_RIESGO: 30,
};

export const LEGALES = {
  AVISO_CONSENTIMIENTO:
    'El interesado autoriza al CEIPAJ a registrar y usar sus datos de contacto ' +
    'únicamente para informarle sobre su oferta educativa y dar seguimiento a su ' +
    'interés (Ley N.º 7593/2025 de Protección de Datos Personales).',
};
