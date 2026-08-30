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
      { texto: '¿Qué es?', ancla: 'que-es' },
      { texto: '¿Qué resuelve?', ancla: 'funciones' },
      { texto: 'Planes', ancla: 'planes' },
      { texto: 'Preguntas', ancla: 'preguntas' },
    ],
    INGRESAR: 'Ingresar',
    BOTON: 'Solicitar demostración',
  },

  PORTADA: {
    TITULO: 'Convierta cada consulta en una matrícula',
    // esta parte del título se pinta con el acento; vacío = título todo parejo
    TITULO_RESALTADO: 'en una matrícula',
    BAJADA: 'Un sistema de gestión para instituciones educativas: registra a cada interesado, '
      + 'ordena su seguimiento y mide el resultado de la captación.',
    BOTON: 'Solicitar demostración',
    BOTON_PLANES: 'Ver planes y precios',
  },

  // lo primero que pregunta quien entra a la pagina: que es esto
  QUE_ES: {
    TITULO: '¿Qué es?',
    TEXTO: 'Un sistema de gestión de la captación para instituciones educativas. Acompaña a cada '
      + 'persona desde la primera consulta hasta que se matricula, y sigue acompañándola durante su '
      + 'primer año. Trabaja junto al sistema académico que la institución ya utiliza: no lo '
      + 'reemplaza ni duplica su trabajo.',
    PASOS: [
      {
        titulo: 'Registra',
        texto: 'Cada consulta queda anotada con sus datos y su canal de origen, venga de donde venga.',
      },
      {
        titulo: 'Acompaña',
        texto: 'Controla los plazos de contacto y avisa cuando un interesado queda sin respuesta o '
          + 'cuando un alumno empieza a dar señales de riesgo de abandono.',
      },
      {
        titulo: 'Mide',
        texto: 'Compara cuántos interesados entran con cuántos llegan a matricularse, y muestra por '
          + 'qué canal llegó cada uno.',
      },
    ],
  },

  // titulo de la seccion de tarjetas, centrado
  FUNCIONES_TITULO: {
    TITULO: '¿Qué resuelve?',
    BAJADA: 'El sistema resuelve cuatro problemas concretos de la captación: la información dispersa '
      + 'entre varios canales, el seguimiento que se pierde por falta de tiempo, las recomendaciones '
      + 'que nadie atribuye y las decisiones que se toman sin datos.',
  },

  // tarjetas con icono. textos cortos a proposito: se leen de un vistazo
  FUNCIONES: [
    {
      etiqueta: 'Captación',
      icono: 'captacion',
      titulo: 'Reúna todas las consultas en un solo registro',
      texto: 'Cada consulta queda anotada con su canal de origen, llegue por redes, por teléfono o '
        + 'en la puerta de la institución.',
      puntos: [
        'Una sola ficha por persona, sin duplicados',
        'El canal de origen de cada consulta',
        'La misma información a la vista de todo el equipo',
      ],
    },
    {
      etiqueta: 'Seguimiento',
      icono: 'seguimiento',
      titulo: 'No pierda un interesado por olvido',
      texto: 'El sistema avisa cuando alguien lleva demasiados días sin contacto y cuando un alumno '
        + 'empieza a mostrar riesgo de abandonar.',
      puntos: [
        'Aviso al superarse el plazo sin contacto',
        'Alerta temprana de riesgo de deserción',
        'Historial completo de cada gestión',
      ],
    },
    {
      etiqueta: 'Aliados',
      icono: 'aliados',
      titulo: 'Mida cuánto aporta cada recomendación',
      texto: 'Docentes y directivos cargan a sus recomendados desde su propio portal, y el sistema '
        + 'calcula sus puntos y comisiones.',
      puntos: [
        'Cada matriculado queda ligado al aliado que lo recomendó',
        'Los puntos y las comisiones se calculan solos',
        'El aliado carga y consulta desde su propio acceso',
      ],
    },
    {
      etiqueta: 'Gerencia',
      icono: 'gerencia',
      titulo: 'Decida con números, no con impresiones',
      texto: 'La dirección ve qué canales traen alumnos, cuánto se convierte y qué aliado rinde, y '
        + 'descarga esa información cuando la necesita.',
      puntos: [
        'Interesados por canal y tasa de conversión',
        'Rendimiento de cada aliado institucional',
        'Reportes exportables a PDF y Excel',
      ],
    },
  ],

  PLANES: {
    TITULO: 'Planes',
    // la bajada dice dónde está la diferencia real, que es lo primero que se
    // pregunta quien compara tres precios
    BAJADA: 'Se cambia de plan cuando haga falta, sin perder información.',
    // clave del plan que se muestra destacado; si no existe, no se destaca ninguno
    DESTACADO: 'estandar',
    ETIQUETA_DESTACADO: 'El más elegido',
    BOTON: 'Consultar por este plan',
    PIE: 'Precios mensuales, en guaraníes.',
  },

  PREGUNTAS: {
    TITULO: 'Preguntas frecuentes',
    LISTA: [
      {
        pregunta: '¿Reemplaza al sistema académico que ya utilizamos?',
        respuesta: 'No, lo complementa. Las inscripciones, las calificaciones y los certificados siguen '
          + 'donde están hoy. Este sistema cubre la etapa anterior y la posterior: desde la primera '
          + 'consulta hasta la matriculación, y el acompañamiento del alumno durante su primer año.',
      },
      {
        pregunta: '¿En qué se diferencian los planes?',
        respuesta: 'En qué secciones del sistema quedan habilitadas y cuántas personas y aliados '
          + 'admite cada uno. Al subir de plan, las secciones nuevas quedan disponibles enseguida.',
      },
      {
        pregunta: '¿Quiénes lo utilizan dentro de la institución?',
        respuesta: 'El personal que atiende consultas registra y hace el seguimiento. La dirección '
          + 'consulta los indicadores. El administrador gestiona las cuentas y la configuración.',
      },
      {
        pregunta: '¿Qué son los aliados institucionales?',
        respuesta: 'Docentes y directivos externos que recomiendan interesados. La institución les '
          + 'crea un acceso propio desde donde cargan a sus recomendados y consultan su puntaje. '
          + 'Cuando uno de ellos se matricula, el sistema calcula la comisión que le corresponde.',
      },
      {
        pregunta: '¿Cómo se protegen los datos de las personas registradas?',
        respuesta: 'El tratamiento se ajusta a la Ley N.º 7593/2025 de Protección de Datos Personales '
          + 'de la República del Paraguay: se pide autorización al registrar y puede retirarse en '
          + 'cualquier momento.',
      },
      {
        pregunta: '¿Es necesario instalar algo?',
        respuesta: 'No. Se utiliza desde el navegador, en computadora o celular, dentro y fuera de '
          + 'la institución.',
      },
      {
        pregunta: '¿Se puede cargar la información que ya tenemos?',
        respuesta: 'Sí. Los matriculados se importan desde una planilla, y el sistema los cruza por '
          + 'número de cédula con los interesados ya registrados para marcar automáticamente quiénes '
          + 'se convirtieron.',
      },
      {
        pregunta: '¿Qué ocurre si no se renueva la suscripción?',
        respuesta: 'No se pierde ninguna información. La institución pasa al plan Free, desde donde '
          + 'puede consultar todo lo que ya tenía cargado, y recupera el resto de las secciones al '
          + 'volver a contratar.',
      },
      {
        pregunta: '¿Cómo se contrata?',
        respuesta: 'Complete el formulario de esta página. Coordinamos una demostración y desde allí '
          + 'se contrata el plan.',
      },
    ],
  },

  CIERRE: {
    TITULO: 'Vea el sistema funcionando',
    TEXTO: 'Coordinamos una demostración con su equipo y respondemos sus consultas.',
    BOTON: 'Solicitar demostración',
  },

  CONTACTO: {
    TITULO: 'Contacto',
    BAJADA: 'Complete el formulario y nos comunicamos a la brevedad.',
    EXITO: 'Recibimos su solicitud. Le escribimos al correo indicado.',
    // debajo del formulario queda solo el enlace a la política
    AVISO: '',
    ENLACE_AVISO: 'Cómo tratamos los datos',
    // opciones del desplegable; el valor viaja tal cual al sistema del proveedor
    MOTIVOS: [
      { valor: 'demostracion', texto: 'Solicitud de demostración' },
      { valor: 'plan', texto: 'Contratación de un plan' },
      { valor: 'consulta', texto: 'Consulta general' },
    ],
  },

  PIE: {
    TEXTO: '',
    COLUMNAS: [
      { titulo: 'El sistema', enlaces: [
        { texto: '¿Qué es?', ancla: 'que-es' },
        { texto: '¿Qué resuelve?', ancla: 'funciones' },
        { texto: 'Planes', ancla: 'planes' },
        { texto: 'Preguntas frecuentes', ancla: 'preguntas' },
      ] },
      { titulo: 'Contacto', enlaces: [
        { texto: 'Solicitar demostración', ancla: 'contacto' },
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
