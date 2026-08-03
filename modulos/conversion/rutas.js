// urls de conversión
import { Router } from 'express';
import * as controlador from './controlador.js';
import { exigirClave } from './recepcion.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS } from '../../configuracion/permisos.js';

export const rutasConversion = Router();

rutasConversion.post('/sincronizar', autenticar, permitirRoles(...PERMISOS.conversion), controlador.sincronizar);
rutasConversion.get('/matriculados', autenticar, permitirRoles(...PERMISOS.conversion), controlador.matriculados);
rutasConversion.post('/importar', autenticar, permitirRoles(...PERMISOS.conversion), controlador.importar);
rutasConversion.get('/ejemplo.csv', autenticar, permitirRoles(...PERMISOS.conversion), controlador.ejemploCsv);

// entrada para el sistema académico: sin sesión, protegida por clave de api
rutasConversion.post('/matriculados', exigirClave, controlador.recibir);
