// urls del módulo de aliados
import { Router } from 'express';
import * as controlador from './controlador.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS, PERMISOS_ESCRITURA } from '../../configuracion/permisos.js';

export const rutasAliados = Router();

// dirección mira el padrón; crear y modificar queda en administración y comercial
rutasAliados.use(autenticar, permitirRoles(...PERMISOS.aliados));
const soloEscritura = permitirRoles(...PERMISOS_ESCRITURA.aliados);

rutasAliados.get('/', controlador.listar);
// va antes de /:id para que express no lea "opciones" como un identificador
rutasAliados.get('/opciones', controlador.opciones);
rutasAliados.get('/:id', controlador.ver);
rutasAliados.post('/', soloEscritura, controlador.crear);
rutasAliados.put('/:id', soloEscritura, controlador.editar);
rutasAliados.put('/:id/reenviar-acceso', soloEscritura, controlador.reenviarAcceso);
rutasAliados.put('/:id/activo', soloEscritura, controlador.cambiarActivo);
