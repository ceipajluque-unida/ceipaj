import { Router } from 'express';
import * as controlador from './controlador.js';
import { detalleRoles } from '../instituciones/servicio.js';
import { institucionActual } from '../../servidor/contexto.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS } from '../../configuracion/permisos.js';
import { ErrorVisible } from '../../servidor/errores.js';

export const rutasUsuarios = Router();

rutasUsuarios.use(autenticar, permitirRoles(...PERMISOS.usuarios));

rutasUsuarios.get('/', controlador.listar);
rutasUsuarios.get('/roles', async (req, res) => {
  const institucionId = institucionActual();
  if (institucionId === null) throw new ErrorVisible('Esta consulta es de una institución.', 403);
  res.json(await detalleRoles(institucionId));
});
rutasUsuarios.get('/:id', controlador.ver);
rutasUsuarios.post('/', controlador.crear);
rutasUsuarios.put('/:id', controlador.editar);
rutasUsuarios.put('/:id/rol', controlador.cambiarRol);
rutasUsuarios.put('/:id/activo', controlador.cambiarActivo);
rutasUsuarios.put('/:id/restablecer-clave', controlador.restablecerClave);
