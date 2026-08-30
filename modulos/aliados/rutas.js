import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirModulo, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS_ESCRITURA } from '../../configuracion/permisos.js';

export const rutasAliados = Router();

rutasAliados.use(autenticar, permitirModulo('aliados'));
const soloEscritura = permitirRoles(...PERMISOS_ESCRITURA.aliados);

rutasAliados.get('/', controlador.listar);

rutasAliados.get('/opciones', controlador.opciones);
rutasAliados.get('/:id', controlador.ver);
rutasAliados.post('/', soloEscritura, controlador.crear);
rutasAliados.put('/:id', soloEscritura, controlador.editar);
rutasAliados.put('/:id/reenviar-acceso', soloEscritura, controlador.reenviarAcceso);
rutasAliados.put('/:id/activo', soloEscritura, controlador.cambiarActivo);
