import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirModulo, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS_ESCRITURA } from '../../configuracion/permisos.js';

export const rutasComisiones = Router();

rutasComisiones.get('/', autenticar, permitirModulo('comisiones'), controlador.listar);

rutasComisiones.get('/:id/recibo', autenticar, permitirModulo('comisiones'), controlador.recibo);

rutasComisiones.put('/:id/estado', autenticar, permitirModulo('comisiones'), permitirRoles(...PERMISOS_ESCRITURA.comisiones), controlador.pagar);
