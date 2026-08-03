import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS, PERMISOS_ESCRITURA } from '../../configuracion/permisos.js';

export const rutasComisiones = Router();

rutasComisiones.get('/', autenticar, permitirRoles(...PERMISOS.comisiones), controlador.listar);

rutasComisiones.put('/:id/estado', autenticar, permitirRoles(...PERMISOS_ESCRITURA.comisiones), controlador.pagar);
