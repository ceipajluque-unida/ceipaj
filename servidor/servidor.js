import express from 'express';
import cors from 'cors';
import { SERVIDOR, SEGURIDAD } from '../configuracion/ajustes.js';
import { rutasAutenticacion } from '../modulos/autenticacion/rutas.js';
import { rutasUsuarios } from '../modulos/usuarios/rutas.js';
import { rutasLeads } from '../modulos/leads/rutas.js';
import { rutasAliados } from '../modulos/aliados/rutas.js';
import { rutasPortal } from '../modulos/portal/rutas.js';
import { rutasComisiones } from '../modulos/comisiones/rutas.js';
import { rutasConversion } from '../modulos/conversion/rutas.js';
import { rutasSeguimiento } from '../modulos/seguimiento/rutas.js';
import { rutasReportes } from '../modulos/reportes/rutas.js';
import { rutasPagos } from '../modulos/pagos/rutas.js';
import { rutasSuscripciones } from '../modulos/suscripciones/rutas.js';
import { rutasPlanes } from '../modulos/planes/rutas.js';
import { rutasInstituciones } from '../modulos/instituciones/rutas.js';
import { rutasSolicitudes } from '../modulos/solicitudes/rutas.js';
import { rutasRoles } from '../modulos/roles/rutas.js';
import { rutasPlataforma } from '../modulos/plataforma/rutas.js';
import { CARPETA_FONDO } from '../modulos/planes/imagen.js';
import { rutasConfiguracion } from '../modulos/configuracion/rutas.js';
import { rutasResumen } from '../modulos/resumen/rutas.js';
import { rutasAuditoria } from '../modulos/auditoria/rutas.js';
import { iniciarSincronizacionAutomatica } from '../modulos/conversion/servicio.js';
import { iniciarControlDeVencimientos } from '../modulos/suscripciones/servicio.js';
import * as ajustesSistema from './ajustesSistema.js';

const aplicacion = express();

if (SERVIDOR.DETRAS_DE_PROXY) aplicacion.set('trust proxy', 1);

aplicacion.use(express.json({
  limit: '2mb',
  verify: (req, res, cuerpo) => {
    if (req.originalUrl.startsWith('/api/pagos/notificacion')) req.cuerpoCrudo = cuerpo.toString('utf8');
  },
}));
aplicacion.use(cors());

aplicacion.use((req, res, siguiente) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'no-referrer');

  if (req.secure || req.get('x-forwarded-proto') === 'https') {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  siguiente();
});

aplicacion.use('/api/fondo', express.static(CARPETA_FONDO, { maxAge: '1d' }));

aplicacion.get('/api/salud', (req, res) => res.json({ estado: 'ok' }));

aplicacion.use('/api/autenticacion', rutasAutenticacion);
aplicacion.use('/api/usuarios', rutasUsuarios);

aplicacion.use('/api/leads', rutasLeads);
aplicacion.use('/api/aliados', rutasAliados);
aplicacion.use('/api/portal', rutasPortal);
aplicacion.use('/api/comisiones', rutasComisiones);
aplicacion.use('/api/conversion', rutasConversion);
aplicacion.use('/api/seguimiento', rutasSeguimiento);
aplicacion.use('/api/reportes', rutasReportes);
aplicacion.use('/api/pagos', rutasPagos);
aplicacion.use('/api/suscripciones', rutasSuscripciones);
aplicacion.use('/api/planes', rutasPlanes);
aplicacion.use('/api/instituciones', rutasInstituciones);
aplicacion.use('/api/solicitudes', rutasSolicitudes);
aplicacion.use('/api/roles', rutasRoles);
aplicacion.use('/api/plataforma', rutasPlataforma);
aplicacion.use('/api/configuracion', rutasConfiguracion);
aplicacion.use('/api/resumen', rutasResumen);
aplicacion.use('/api/auditoria', rutasAuditoria);

aplicacion.use((error, req, res, siguiente) => {
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'El archivo es demasiado grande. Elegí uno más liviano.' });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El pedido llegó mal formado.' });
  }
  const estado = error.estadoHttp ?? 500;
  if (estado === 500) console.error(error);
  const visible = Boolean(error.estadoHttp);
  res.status(estado).json({ error: visible ? error.message : 'Error interno del servidor.' });
});

const secretoJwt = process.env.JWT_SECRETO ?? '';
const secretosDebiles = ['CEIPAJULTRASECRETOUNIDA', 'cambiar-por-una-clave-larga-y-aleatoria', 'solo-desarrollo-cambiar-este-secreto'];
if (secretoJwt.length < 24 || secretosDebiles.includes(secretoJwt)) {
  console.error('\n✗ Definí un JWT_SECRETO propio, largo y aleatorio en el .env (firma las sesiones). El servidor no arranca por seguridad.\n');
  process.exit(1);
}

ajustesSistema.cargar().finally(() => {
  aplicacion.listen(SERVIDOR.PUERTO, () => {
    console.log(`backend del sig ceipaj escuchando en http://localhost:${SERVIDOR.PUERTO}`);

    iniciarSincronizacionAutomatica();
    iniciarControlDeVencimientos();
  });
});
