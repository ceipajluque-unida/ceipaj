import { Router } from 'express';
import * as controlador from './controlador.js';
import { exigirClave } from './recepcion.js';
import { autenticar, permitirModulo } from '../../servidor/middleware/autenticar.js';

export const rutasConversion = Router();

rutasConversion.post('/sincronizar', autenticar, permitirModulo('conversion'), controlador.sincronizar);
rutasConversion.get('/matriculados', autenticar, permitirModulo('conversion'), controlador.matriculados);
rutasConversion.post('/importar', autenticar, permitirModulo('conversion'), controlador.importar);
rutasConversion.get('/ejemplo.csv', autenticar, permitirModulo('conversion'), controlador.ejemploCsv);

rutasConversion.post('/matriculados', exigirClave, controlador.recibir);
