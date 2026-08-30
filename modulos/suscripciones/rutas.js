import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirModulo, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS_ESCRITURA } from '../../configuracion/permisos.js';

export const rutasSuscripciones = Router();

rutasSuscripciones.get('/', autenticar, permitirModulo('suscripcion'), controlador.resumen);
rutasSuscripciones.get('/planes', autenticar, permitirModulo('suscripcion'), controlador.planes);
rutasSuscripciones.post('/reducir', autenticar, permitirRoles(...PERMISOS_ESCRITURA.suscripcion), controlador.reducir);
rutasSuscripciones.post('/:id/cancelar', autenticar, permitirRoles(...PERMISOS_ESCRITURA.suscripcion), controlador.cancelar);
