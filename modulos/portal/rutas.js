import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirModulo } from '../../servidor/middleware/autenticar.js';

export const rutasPortal = Router();

rutasPortal.get('/resumen', autenticar, permitirModulo('portal'), controlador.resumen);
rutasPortal.get('/leads', autenticar, permitirModulo('portal'), controlador.misLeads);
rutasPortal.get('/comisiones', autenticar, permitirModulo('portal'), controlador.misComisiones);
rutasPortal.get('/comisiones/:id/recibo', autenticar, permitirModulo('portal'), controlador.reciboComision);
rutasPortal.post('/leads', autenticar, permitirModulo('portal'), controlador.crearLead);
