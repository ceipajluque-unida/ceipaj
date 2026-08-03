// urls de los contadores del menú (badges) y del tablero de inicio
import { Router } from 'express';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS } from '../../configuracion/permisos.js';
import { contarBadges } from './servicio.js';
import { obtenerIndicadores } from '../reportes/servicio.js';

export const rutasResumen = Router();

rutasResumen.get('/badges', autenticar, async (req, res) => {
  res.json(await contarBadges(req.usuario.rol));
});

// el tablero de inicio vive acá y no en reportes porque este router no pasa por el
// candado del plan: colgado de reportes, un colegio con el plan básico se quedaba sin
// pantalla de inicio, que es la primera que ve al entrar. son las mismas cifras de
// interesados que el plan básico ya incluye; lo que se vende en Reportes es el detalle
// y la exportación.
rutasResumen.get('/indicadores', autenticar, permitirRoles(...PERMISOS.reportes), async (req, res) => {
  res.json(await obtenerIndicadores());
});
