// urls del visor de auditoría (solo lectura)
import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS } from '../../configuracion/permisos.js';

export const rutasAuditoria = Router();

// los roles salen de la matriz y no escritos acá: estaban fijos en administrador, así que
// el proveedor veía el ítem en su menú y la ruta se lo negaba
rutasAuditoria.get('/', autenticar, permitirRoles(...PERMISOS.auditoria), controlador.listar);
