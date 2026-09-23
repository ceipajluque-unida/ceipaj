import { Router } from 'express';
import * as controlador from './controlador.js';
import * as checkout from './checkoutSimulado.js';
import { autenticar, permitirModulo, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS_ESCRITURA } from '../../configuracion/permisos.js';
import { frenoGeneral } from '../../servidor/middleware/frecuencia.js';

export const rutasPagos = Router();

rutasPagos.get('/medios', autenticar, permitirRoles(...PERMISOS_ESCRITURA.pagos), controlador.medios);

rutasPagos.get('/', autenticar, permitirModulo('pagos'), controlador.listar);

rutasPagos.post('/plan', autenticar, permitirRoles(...PERMISOS_ESCRITURA.pagos), controlador.pagarPlan);

rutasPagos.post('/conciliar', autenticar, permitirRoles(...PERMISOS_ESCRITURA.pagos), controlador.conciliar);

rutasPagos.get('/:referencia/estado', autenticar, permitirModulo('pagos'), controlador.estado);
rutasPagos.get('/:referencia/recibo', autenticar, permitirModulo('pagos'), controlador.recibo);
rutasPagos.delete('/:referencia', autenticar, permitirRoles(...PERMISOS_ESCRITURA.pagos), controlador.descartar);

// es la unica ruta de pagos sin sesion: cada aviso falso deja una fila en la auditoria
rutasPagos.post('/notificacion', frenoGeneral, controlador.notificacion);

rutasPagos.get('/simulada/:hash', autenticar, permitirModulo('pagos'), checkout.verPedido);
rutasPagos.post('/simulada/:hash/pagar', autenticar, permitirRoles(...PERMISOS_ESCRITURA.pagos), checkout.pagar);
