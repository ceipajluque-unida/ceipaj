import { Router } from 'express';
import * as servicio from './servicio.js';
import * as administrador from './administrador.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS } from '../../configuracion/permisos.js';
import { ErrorVisible } from '../../servidor/errores.js';

export const rutasInstituciones = Router();

function idDeRuta(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorVisible('Identificador de institución inválido.');
  return id;
}

rutasInstituciones.use(autenticar, permitirRoles(...PERMISOS.instituciones));

rutasInstituciones.get('/', async (req, res) => res.json(await servicio.listar()));
rutasInstituciones.get('/:id', async (req, res) => res.json(await servicio.obtener(idDeRuta(req))));
rutasInstituciones.post('/', async (req, res) => res.status(201).json(await servicio.crear(req.body, req.usuario, req.ip)));
rutasInstituciones.put('/:id', async (req, res) => res.json(await servicio.editar(idDeRuta(req), req.body, req.usuario, req.ip)));

rutasInstituciones.put('/:id/activo', async (req, res) => {
  const { activo } = req.body ?? {};
  if (typeof activo !== 'boolean') throw new ErrorVisible('Falta indicar si la institución queda activa o no.');
  res.json(await servicio.cambiarActivo(idDeRuta(req), activo, req.usuario, req.ip));
});

rutasInstituciones.post('/:id/administrador', async (req, res) =>
  res.status(201).json(await administrador.crearAdministrador(idDeRuta(req), req.body, req.usuario, req.ip))
);
