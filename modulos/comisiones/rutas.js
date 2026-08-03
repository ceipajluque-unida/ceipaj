// urls del módulo de comisiones
import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS } from '../../configuracion/permisos.js';
import { ROLES } from '../../configuracion/ajustes.js';

export const rutasComisiones = Router();

rutasComisiones.get('/', autenticar, permitirRoles(...PERMISOS.comisiones), controlador.listar);
// marcar pagada mueve plata, así que queda solo para el administrador
rutasComisiones.put('/:id/estado', autenticar, permitirRoles(ROLES.ADMINISTRADOR), controlador.pagar);
