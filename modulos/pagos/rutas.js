import { Router } from 'express';
import * as controlador from './controlador.js';
import * as checkout from './checkoutSimulado.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS, PERMISOS_ESCRITURA } from '../../configuracion/permisos.js';

export const rutasPagos = Router();

rutasPagos.get('/medios', autenticar, permitirRoles(...PERMISOS_ESCRITURA.pagos), controlador.medios);

rutasPagos.post('/', autenticar, permitirRoles(...PERMISOS_ESCRITURA.pagos), controlador.crear);
rutasPagos.get('/', autenticar, permitirRoles(...PERMISOS.pagos), controlador.listar);

rutasPagos.post('/plan', autenticar, permitirRoles(...PERMISOS_ESCRITURA.pagos), controlador.pagarPlan);

rutasPagos.post('/conciliar', autenticar, permitirRoles(...PERMISOS_ESCRITURA.pagos), controlador.conciliar);

rutasPagos.get('/:referencia/estado', autenticar, permitirRoles(...PERMISOS.pagos), controlador.estado);
rutasPagos.get('/:referencia/recibo', autenticar, permitirRoles(...PERMISOS.pagos), controlador.recibo);
rutasPagos.delete('/:referencia', autenticar, permitirRoles(...PERMISOS_ESCRITURA.pagos), controlador.descartar);

rutasPagos.post('/notificacion', controlador.notificacion);

rutasPagos.get('/simulada/:hash', autenticar, permitirRoles(...PERMISOS.pagos), checkout.verPedido);
rutasPagos.post('/simulada/:hash/pagar', autenticar, permitirRoles(...PERMISOS_ESCRITURA.pagos), checkout.pagar);
