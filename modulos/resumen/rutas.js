import { Router } from 'express';
import { autenticar, permitirModulo } from '../../servidor/middleware/autenticar.js';
import { contarBadges } from './servicio.js';
import { obtenerIndicadores } from '../reportes/servicio.js';

export const rutasResumen = Router();

rutasResumen.get('/badges', autenticar, async (req, res) => {
  res.json(await contarBadges(req.usuario));
});

rutasResumen.get('/indicadores', autenticar, permitirModulo('reportes'), async (req, res) => {
  res.json(await obtenerIndicadores());
});
