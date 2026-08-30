import { Router } from 'express';
import * as servicio from './servicio.js';
import { autenticar, permitirModulo } from '../../servidor/middleware/autenticar.js';

export const rutasPlataforma = Router();

rutasPlataforma.use(autenticar, permitirModulo('plataforma'));

rutasPlataforma.get('/', async (req, res) => {
  const [resumen, planes, instituciones, meses] = await Promise.all([
    servicio.resumen(), servicio.porPlan(), servicio.porInstitucion(), servicio.porMes(req.query?.meses),
  ]);
  res.json({ resumen, planes, instituciones, meses });
});
