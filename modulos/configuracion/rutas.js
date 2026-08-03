import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS } from '../../configuracion/permisos.js';

export const rutasConfiguracion = Router();

rutasConfiguracion.get('/legales', controlador.legales);

rutasConfiguracion.use(autenticar, permitirRoles(...PERMISOS.configuracion));

rutasConfiguracion.get('/', controlador.obtener);
rutasConfiguracion.put('/', controlador.guardar);

rutasConfiguracion.put('/fondo', controlador.guardarFondo);
rutasConfiguracion.post('/probar-correo', controlador.probarCorreo);
rutasConfiguracion.post('/probar-sms', controlador.probarSms);
