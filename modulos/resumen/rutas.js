import { Router } from 'express';
import { autenticar, permitirModulo } from '../../servidor/middleware/autenticar.js';
import { contarBadges } from './servicio.js';
import { obtenerIndicadores } from '../reportes/servicio.js';

export const rutasResumen = Router();

rutasResumen.get('/badges', autenticar, async (req, res) => {
  res.json(await contarBadges(req.usuario));
});

// las cifras del inicio se leen con el permiso de Reportes, pero el plan no las
// tapa: la pantalla de inicio nunca puede recibir a nadie con un error
rutasResumen.get('/indicadores', autenticar, permitirModulo('reportes', { porPlan: false }), async (req, res) => {
  res.json(await obtenerIndicadores());
});
