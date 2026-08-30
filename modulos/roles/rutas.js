import { Router } from 'express';
import * as servicio from './servicio.js';
import { autenticar, permitirModulo } from '../../servidor/middleware/autenticar.js';

export const rutasRoles = Router();

// los roles son del sistema, no de una institucion: solo los toca el proveedor
rutasRoles.use(autenticar, permitirModulo('roles'));

rutasRoles.get('/', async (req, res) => res.json({
  roles: await servicio.listar(),
  modulos: servicio.catalogoModulos(),
}));

rutasRoles.post('/', async (req, res) =>
  res.status(201).json(await servicio.crear(req.body, req.usuario, req.ip)));

rutasRoles.put('/:clave', async (req, res) =>
  res.json(await servicio.editar(req.params.clave, req.body, req.usuario, req.ip)));

rutasRoles.delete('/:clave', async (req, res) => {
  await servicio.borrar(req.params.clave, req.usuario, req.ip);
  res.json({ ok: true });
});

rutasRoles.post('/restaurar', async (req, res) => {
  await servicio.restaurarDeFabrica(req.usuario, req.ip);
  res.json(await servicio.listar());
});
