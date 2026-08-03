import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS } from '../../configuracion/permisos.js';

export const rutasAuditoria = Router();

rutasAuditoria.get('/', autenticar, permitirRoles(...PERMISOS.auditoria), controlador.listar);
