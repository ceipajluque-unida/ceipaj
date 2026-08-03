import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS, PERMISOS_ESCRITURA } from '../../configuracion/permisos.js';

export const rutasSuscripciones = Router();

rutasSuscripciones.get('/', autenticar, permitirRoles(...PERMISOS.suscripcion), controlador.resumen);
rutasSuscripciones.get('/planes', autenticar, permitirRoles(...PERMISOS.suscripcion), controlador.planes);
rutasSuscripciones.post('/:id/cancelar', autenticar, permitirRoles(...PERMISOS_ESCRITURA.suscripcion), controlador.cancelar);
