import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirModulo } from '../../servidor/middleware/autenticar.js';

export const rutasAuditoria = Router();

rutasAuditoria.get('/', autenticar, permitirModulo('auditoria'), controlador.listar);
