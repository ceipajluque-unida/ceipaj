import { Router } from 'express';
import * as servicio from './servicio.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS } from '../../configuracion/permisos.js';

export const rutasPlataforma = Router();

rutasPlataforma.use(autenticar, permitirRoles(...PERMISOS.plataforma));

rutasPlataforma.get('/', async (req, res) => {
  const [resumen, planes, instituciones, meses] = await Promise.all([
    servicio.resumen(), servicio.porPlan(), servicio.porInstitucion(), servicio.porMes(req.query?.meses),
  ]);
  res.json({ resumen, planes, instituciones, meses });
});
