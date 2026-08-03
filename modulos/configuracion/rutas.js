// urls del módulo de configuración. entran el administrador de la institución y el
// proveedor: cada uno ve y guarda solo los ajustes de su ámbito, y eso lo decide el
// servicio, no esta capa.
import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS } from '../../configuracion/permisos.js';

export const rutasConfiguracion = Router();

// los textos legales van sin sesión: se muestran en el pie del ingreso
rutasConfiguracion.get('/legales', controlador.legales);

rutasConfiguracion.use(autenticar, permitirRoles(...PERMISOS.configuracion));

rutasConfiguracion.get('/', controlador.obtener);
rutasConfiguracion.put('/', controlador.guardar);
// la imagen no entra en un ajuste de texto, así que se sube aparte y se guarda su nombre
rutasConfiguracion.put('/fondo', controlador.guardarFondo);
rutasConfiguracion.post('/probar-correo', controlador.probarCorreo);
rutasConfiguracion.post('/probar-sms', controlador.probarSms);
