import { Router } from 'express';
import * as controlador from './controlador.js';
import { rolesAsignables } from '../roles/servicio.js';
import { detalleRoles } from '../instituciones/servicio.js';
import { institucionActual } from '../../servidor/contexto.js';
import { autenticar, permitirModulo } from '../../servidor/middleware/autenticar.js';
import { ErrorVisible } from '../../servidor/errores.js';

export const rutasUsuarios = Router();

rutasUsuarios.use(autenticar, permitirModulo('usuarios'));

rutasUsuarios.get('/', controlador.listar);
rutasUsuarios.get('/roles', async (req, res) => {
  const institucionId = institucionActual();
  if (institucionId === null) throw new ErrorVisible('Esta consulta es de una institución.', 403);
  res.json(await detalleRoles(institucionId));
});
// quien administra cuentas necesita saber que roles puede asignarles
rutasUsuarios.get('/roles-asignables', async (req, res) => res.json(await rolesAsignables()));
rutasUsuarios.get('/:id', controlador.ver);
rutasUsuarios.post('/', controlador.crear);
rutasUsuarios.put('/:id', controlador.editar);
rutasUsuarios.put('/:id/rol', controlador.cambiarRol);
rutasUsuarios.put('/:id/activo', controlador.cambiarActivo);
rutasUsuarios.put('/:id/restablecer-clave', controlador.restablecerClave);
