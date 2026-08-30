import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirModulo } from '../../servidor/middleware/autenticar.js';

export const rutasReportes = Router();

rutasReportes.get('/indicadores', autenticar, permitirModulo('reportes'), controlador.indicadores);

rutasReportes.get('/exportar/:tabla', autenticar, permitirModulo('reportes'), controlador.exportar);
