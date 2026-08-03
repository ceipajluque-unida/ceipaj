// urls del módulo de pagos
import { Router } from 'express';
import * as controlador from './controlador.js';
import * as checkout from './checkoutSimulado.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS, PERMISOS_ESCRITURA } from '../../configuracion/permisos.js';

export const rutasPagos = Router();

// medios de pago disponibles para el formulario de cobro
rutasPagos.get('/medios', autenticar, permitirRoles(...PERMISOS_ESCRITURA.pagos), controlador.medios);

// crear cobros es tarea del administrador; mirarlos también puede la dirección
rutasPagos.post('/', autenticar, permitirRoles(...PERMISOS_ESCRITURA.pagos), controlador.crear);
rutasPagos.get('/', autenticar, permitirRoles(...PERMISOS.pagos), controlador.listar);

// pago de un plan de suscripción
rutasPagos.post('/plan', autenticar, permitirRoles(...PERMISOS_ESCRITURA.pagos), controlador.pagarPlan);

rutasPagos.post('/conciliar', autenticar, permitirRoles(...PERMISOS_ESCRITURA.pagos), controlador.conciliar);

// mientras el usuario paga, la pantalla pregunta por acá si ya se acreditó
rutasPagos.get('/:referencia/estado', autenticar, permitirRoles(...PERMISOS.pagos), controlador.estado);
rutasPagos.get('/:referencia/recibo', autenticar, permitirRoles(...PERMISOS.pagos), controlador.recibo);

// la pasarela avisa por acá sin sesión, lo que protege es la firma del aviso
rutasPagos.post('/notificacion', controlador.notificacion);

// checkout de la pasarela de prueba. pide sesión igual que el resto del módulo: no es
// una pasarela de verdad, es una pantalla más del sistema.
rutasPagos.get('/simulada/:hash', autenticar, permitirRoles(...PERMISOS.pagos), checkout.verPedido);
rutasPagos.post('/simulada/:hash/pagar', autenticar, permitirRoles(...PERMISOS_ESCRITURA.pagos), checkout.pagar);
