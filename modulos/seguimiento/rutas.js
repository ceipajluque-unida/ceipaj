import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS } from '../../configuracion/permisos.js';

export const rutasSeguimiento = Router();

rutasSeguimiento.get('/opciones', autenticar, permitirRoles(...PERMISOS.seguimiento), controlador.opciones);
rutasSeguimiento.get('/estudiantes', autenticar, permitirRoles(...PERMISOS.seguimiento), controlador.estudiantes);
rutasSeguimiento.get('/acciones/:leadId', autenticar, permitirRoles(...PERMISOS.seguimiento), controlador.acciones);
rutasSeguimiento.post('/acciones', autenticar, permitirRoles(...PERMISOS.seguimiento), controlador.crearAccion);
