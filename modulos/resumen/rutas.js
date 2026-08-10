import { Router } from 'express';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS } from '../../configuracion/permisos.js';
import { contarBadges } from './servicio.js';
import { obtenerIndicadores } from '../reportes/servicio.js';

export const rutasResumen = Router();

rutasResumen.get('/badges', autenticar, async (req, res) => {
  res.json(await contarBadges(req.usuario));
});

rutasResumen.get('/indicadores', autenticar, permitirRoles(...PERMISOS.reportes), async (req, res) => {
  res.json(await obtenerIndicadores());
});
