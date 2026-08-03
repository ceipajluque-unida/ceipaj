// urls de leads.
import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS } from '../../configuracion/permisos.js';

export const rutasLeads = Router();

// sin filtro de rol porque el portal del aliado también necesita estas opciones
rutasLeads.get('/opciones', autenticar, controlador.opciones);

// las rutas fijas van antes que /:id para que express no las confunda con un id
rutasLeads.get('/alertas', autenticar, permitirRoles(...PERMISOS.leads), controlador.alertas);
rutasLeads.get('/', autenticar, permitirRoles(...PERMISOS.leads), controlador.listar);
rutasLeads.get('/:id', autenticar, permitirRoles(...PERMISOS.leads), controlador.detalle);
rutasLeads.post('/', autenticar, permitirRoles(...PERMISOS.leads), controlador.crear);
rutasLeads.put('/:id', autenticar, permitirRoles(...PERMISOS.leads), controlador.editar);
rutasLeads.put('/:id/estado', autenticar, permitirRoles(...PERMISOS.leads), controlador.cambiarEstado);
rutasLeads.post('/:id/interacciones', autenticar, permitirRoles(...PERMISOS.leads), controlador.crearInteraccion);
// no hay borrado: la baja es lógica para no romper interacciones ni comisiones
rutasLeads.put('/:id/baja', autenticar, permitirRoles(...PERMISOS.leads), controlador.darDeBaja);
rutasLeads.put('/:id/reactivar', autenticar, permitirRoles(...PERMISOS.leads), controlador.reactivar);
rutasLeads.put('/:id/revocar-consentimiento', autenticar, permitirRoles(...PERMISOS.leads), controlador.revocarConsentimiento);
