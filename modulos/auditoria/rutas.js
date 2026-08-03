// urls del visor de auditoría (solo administrador; solo lectura)
import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { ROLES } from '../../configuracion/ajustes.js';

export const rutasAuditoria = Router();

rutasAuditoria.get('/', autenticar, permitirRoles(ROLES.ADMINISTRADOR), controlador.listar);
