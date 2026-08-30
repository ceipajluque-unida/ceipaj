import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirModulo } from '../../servidor/middleware/autenticar.js';

export const rutasLeads = Router();

rutasLeads.get('/opciones', autenticar, controlador.opciones);

rutasLeads.get('/alertas', autenticar, permitirModulo('leads'), controlador.alertas);
rutasLeads.get('/', autenticar, permitirModulo('leads'), controlador.listar);
rutasLeads.get('/:id', autenticar, permitirModulo('leads'), controlador.detalle);
rutasLeads.post('/', autenticar, permitirModulo('leads'), controlador.crear);
rutasLeads.put('/:id', autenticar, permitirModulo('leads'), controlador.editar);
rutasLeads.put('/:id/estado', autenticar, permitirModulo('leads'), controlador.cambiarEstado);
rutasLeads.post('/:id/interacciones', autenticar, permitirModulo('leads'), controlador.crearInteraccion);

rutasLeads.put('/:id/baja', autenticar, permitirModulo('leads'), controlador.darDeBaja);
rutasLeads.put('/:id/reactivar', autenticar, permitirModulo('leads'), controlador.reactivar);
rutasLeads.put('/:id/revocar-consentimiento', autenticar, permitirModulo('leads'), controlador.revocarConsentimiento);
