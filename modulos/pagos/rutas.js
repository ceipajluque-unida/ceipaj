// urls del módulo de pagos
import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS } from '../../configuracion/permisos.js';
import { ROLES } from '../../configuracion/ajustes.js';

export const rutasPagos = Router();

// medios de pago disponibles para el formulario de cobro
rutasPagos.get('/medios', autenticar, permitirRoles(ROLES.ADMINISTRADOR), controlador.medios);

// crear cobros es tarea del administrador; mirarlos también puede la dirección
rutasPagos.post('/', autenticar, permitirRoles(ROLES.ADMINISTRADOR), controlador.crear);
rutasPagos.get('/', autenticar, permitirRoles(...PERMISOS.pagos), controlador.listar);

// pago de un plan de suscripción
rutasPagos.post('/plan', autenticar, permitirRoles(ROLES.ADMINISTRADOR), controlador.pagarPlan);

rutasPagos.post('/conciliar', autenticar, permitirRoles(ROLES.ADMINISTRADOR), controlador.conciliar);

// mientras el usuario paga, la pantalla pregunta por acá si ya se acreditó
rutasPagos.get('/:referencia/estado', autenticar, permitirRoles(...PERMISOS.pagos), controlador.estado);
rutasPagos.get('/:referencia/recibo', autenticar, permitirRoles(...PERMISOS.pagos), controlador.recibo);

// la pasarela avisa por acá sin sesión, lo que protege es la firma del aviso
rutasPagos.post('/notificacion', controlador.notificacion);
