import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS } from '../../configuracion/permisos.js';

export const rutasPortal = Router();

rutasPortal.get('/resumen', autenticar, permitirRoles(...PERMISOS.portal), controlador.resumen);
rutasPortal.get('/leads', autenticar, permitirRoles(...PERMISOS.portal), controlador.misLeads);
rutasPortal.get('/comisiones', autenticar, permitirRoles(...PERMISOS.portal), controlador.misComisiones);
rutasPortal.get('/comisiones/:id/recibo', autenticar, permitirRoles(...PERMISOS.portal), controlador.reciboComision);
rutasPortal.post('/leads', autenticar, permitirRoles(...PERMISOS.portal), controlador.crearLead);
