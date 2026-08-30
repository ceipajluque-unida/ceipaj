import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirModulo } from '../../servidor/middleware/autenticar.js';

export const rutasSeguimiento = Router();

rutasSeguimiento.get('/opciones', autenticar, permitirModulo('seguimiento'), controlador.opciones);
rutasSeguimiento.get('/estudiantes', autenticar, permitirModulo('seguimiento'), controlador.estudiantes);
rutasSeguimiento.get('/acciones/:leadId', autenticar, permitirModulo('seguimiento'), controlador.acciones);
rutasSeguimiento.post('/acciones', autenticar, permitirModulo('seguimiento'), controlador.crearAccion);
