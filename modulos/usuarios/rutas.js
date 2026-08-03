import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS } from '../../configuracion/permisos.js';

export const rutasUsuarios = Router();

rutasUsuarios.use(autenticar, permitirRoles(...PERMISOS.usuarios));

rutasUsuarios.get('/', controlador.listar);
rutasUsuarios.get('/:id', controlador.ver);
rutasUsuarios.post('/', controlador.crear);
rutasUsuarios.put('/:id', controlador.editar);
rutasUsuarios.put('/:id/rol', controlador.cambiarRol);
rutasUsuarios.put('/:id/activo', controlador.cambiarActivo);
rutasUsuarios.put('/:id/restablecer-clave', controlador.restablecerClave);
