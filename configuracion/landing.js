// contenido de la pagina publica que ofrece el sistema. todo lo que se lee ahi
// se edita aca: la pagina no trae ningun texto escrito adentro.
// los datos de contacto del proveedor no se repiten: salen de RECIBO_EMISOR_*.
import { COLORES_SISTEMA } from './ajustes.js';

export const LANDING = {
  // con esto en false la pagina y el formulario dejan de responder
  ACTIVA: true,

  // el azul de la paleta del sistema
  COLOR: COLORES_SISTEMA[0].valor,

  // franja fina de arriba de todo. si no hay texto ni datos del proveedor
  // cargados, la pagina no la dibuja
  BARRA_SUPERIOR: {
    TEXTO: '',
    MOSTRAR: true,
  },

  NAVEGACION: {
    ENLACES: [
      { texto: 'Qué resuelve', ancla: 'funciones' },
      { texto: 'Planes', ancla: 'planes' },
      { texto: 'Preguntas', ancla: 'preguntas' },
    ],
    INGRESAR: 'Ingresar',
    BOTON: 'Solicitá tu plan',
  },

  PORTADA: {
    TITULO: 'Ordená la captación de estudiantes de punta a punta',
    // esta parte del título se pinta con el acento; vacío = título todo parejo
    TITULO_RESALTADO: 'de punta a punta',
    BAJADA: 'Centraliza el registro de interesados, ordena su seguimiento y entrega a la dirección '
      + 'los indicadores para decidir. Dirigido a instituciones educativas que hoy manejan esa '
      + 'información de forma dispersa.',
    BOTON: 'Solicitá tu plan',
    BOTON_PLANES: 'Ver los planes',
  },

  // titulo de la seccion de tarjetas, centrado
  FUNCIONES_TITULO: {
    TITULO: 'Qué resuelve',
    BAJADA: '',
  },

  // tarjetas con icono. textos cortos a proposito: se leen de un vistazo
  FUNCIONES: [
    {
      etiqueta: 'Captación',
      icono: 'captacion',
      titulo: 'Un registro único de interesados',
      texto: 'Redes sociales, teléfono, mensajería o atención presencial: toda consulta entra al '
        + 'mismo lugar.',
      puntos: [
        'Una sola ficha por persona, sin duplicados',
        'Canal de origen de cada consulta',
        'Autorización de datos registrada y revocable',
      ],
    },
    {
      etiqueta: 'Seguimiento',
      icono: 'seguimiento',
      titulo: 'Seguimiento con plazos definidos',
      texto: 'Ningún interesado queda sin respuesta por olvido.',
      puntos: [
        'Aviso cuando se supera el plazo sin contacto',
        'Alerta de riesgo de deserción del estudiante',
        'Registro de las acciones de acompañamiento',
      ],
    },
    {
      etiqueta: 'Aliados',
      icono: 'aliados',
      titulo: 'Recomendaciones con atribución',
      texto: 'Docentes y directivos que acercan interesados, con su aporte medido.',
      puntos: [
        'Cada recomendación atribuida a quien la trajo',
        'Puntos y comisiones calculados automáticamente',
        'Carga desde su propio portal, sin ocupar al personal',
      ],
    },
    {
      etiqueta: 'Gerencia',
      icono: 'gerencia',
      titulo: 'Indicadores para decidir',
      texto: 'La dirección decide con datos del propio proceso, no con estimaciones.',
      puntos: [
        'Interesados por canal y tasas de conversión',
        'Rendimiento de cada aliado institucional',
        'Reportes exportables a PDF y Excel',
      ],
    },
  ],

  PLANES: {
    TITULO: 'Planes',
    // la bajada quedó vacía a propósito: cada tarjeta ya muestra sus límites y
    // su soporte, que es donde está la diferencia real entre un plan y otro
    BAJADA: '',
    // clave del plan que se muestra destacado; si no existe, no se destaca ninguno
    DESTACADO: 'estandar',
    ETIQUETA_DESTACADO: 'El más elegido',
    BOTON: 'Me interesa este plan',
    PIE: 'Precios por mes, en guaraníes.',
  },

  PREGUNTAS: {
    TITULO: 'Preguntas frecuentes',
    LISTA: [
      {
        pregunta: '¿Reemplaza al sistema académico que ya utilizamos?',
        respuesta: 'No. Lo complementa. Las inscripciones, las calificaciones y los certificados siguen '
          + 'donde están hoy. Este sistema se ocupa de la etapa anterior: el seguimiento de cada '
          + 'interesado desde la primera consulta hasta su matriculación.',
      },
      {
        pregunta: '¿El plan más caro incluye más funciones?',
        respuesta: 'No. Los tres planes incluyen exactamente las mismas funciones. Lo que cambia es '
          + 'cuántas personas de la institución pueden utilizarlo, cuántos aliados admite y el tipo de '
          + 'soporte.',
      },
      {
        pregunta: '¿Qué ocurre con los datos de las personas registradas?',
        respuesta: 'Al registrar a un interesado se solicita su autorización para el uso de sus datos, y '
          + 'esa autorización puede retirarse después. Toda acción relevante queda registrada con la '
          + 'fecha, la hora y el responsable, conforme a la Ley 7593.',
      },
      {
        pregunta: '¿Es necesario instalar algo?',
        respuesta: 'No. Se utiliza desde el navegador, tanto en la computadora como en el celular. No '
          + 'requiere instalar ningún programa ni descargar una aplicación.',
      },
      {
        pregunta: '¿Qué ocurre si no se renueva la suscripción?',
        respuesta: 'No se pierde información. La institución pasa al plan Básico y continúa trabajando '
          + 'con menos usuarios, hasta que renueve el plan que tenía.',
      },
      {
        pregunta: '¿Cómo se contrata?',
        respuesta: 'Dejás tus datos en el formulario de esta página. Te escribimos para coordinar una '
          + 'demostración y desde ahí se contrata el plan.',
      },
    ],
  },

  CIERRE: {
    TITULO: 'Conocelo por dentro',
    TEXTO: 'Coordinamos una demostración y respondemos todas tus consultas.',
    BOTON: 'Solicitá tu plan',
  },

  CONTACTO: {
    TITULO: 'Dejanos tus datos',
    BAJADA: 'Completá el formulario y nos comunicamos con vos.',
    EXITO: 'Recibimos tu solicitud. Te vamos a escribir al correo que dejaste.',
    // debajo del formulario queda solo el enlace a la política
    AVISO: '',
    ENLACE_AVISO: 'Cómo tratamos los datos',
    // opciones del desplegable; el valor viaja tal cual al sistema del proveedor
    MOTIVOS: [
      { valor: 'demostracion', texto: 'Quiero una demostración' },
      { valor: 'plan', texto: 'Quiero contratar un plan' },
      { valor: 'consulta', texto: 'Tengo una consulta' },
    ],
  },

  PIE: {
    TEXTO: '',
    COLUMNAS: [
      { titulo: 'El sistema', enlaces: [
        { texto: 'Qué resuelve', ancla: 'funciones' },
        { texto: 'Planes', ancla: 'planes' },
        { texto: 'Preguntas frecuentes', ancla: 'preguntas' },
      ] },
      { titulo: 'Contacto', enlaces: [
        { texto: 'Solicitá tu plan', ancla: 'contacto' },
      ] },
    ],
  },
};

// largos maximos de cada campo del formulario publico, tambien usados por el servidor
export const LARGOS_SOLICITUD = {
  nombre: 100,
  institucion: 150,
  correo: 150,
  telefono: 30,
  ciudad: 80,
  mensaje: 600,
};

// numeros del modulo de solicitudes, para que no queden escritos en la logica
export const SOLICITUDES = {
  TOPE_LISTADO: 500,          // cuantas trae el listado del proveedor de una vez
  LARGO_NOTA: 500,            // largo de la nota interna
  DIAS_DESCARTE: 90,          // los que ofrece el boton de descarte masivo
  DIAS_DESCARTE_MINIMO: 30,   // por debajo de esto el servidor no descarta en masa
  DIAS_DESCARTE_MAXIMO: 3650, // techo, para que un numero enorme no barra con todo
};

export const ESTADOS_SOLICITUD = [
  { valor: 'nueva', texto: 'Nueva' },
  { valor: 'contactada', texto: 'Contactada' },
  { valor: 'convertida', texto: 'Convertida' },
  { valor: 'descartada', texto: 'Descartada' },
];
