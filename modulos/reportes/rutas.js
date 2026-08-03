import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS } from '../../configuracion/permisos.js';

export const rutasReportes = Router();

rutasReportes.get('/indicadores', autenticar, permitirRoles(...PERMISOS.reportes), controlador.indicadores);

rutasReportes.get('/exportar/:tabla', autenticar, permitirRoles(...PERMISOS.reportes), controlador.exportar);
