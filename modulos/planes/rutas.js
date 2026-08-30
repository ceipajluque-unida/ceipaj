import { Router } from 'express';
import express from 'express';
import * as servicio from './servicio.js';
import { guardar as guardarImagen, CARPETA } from './imagen.js';
import { autenticar, permitirModulo } from '../../servidor/middleware/autenticar.js';

export const rutasPlanes = Router();

rutasPlanes.use('/imagenes', express.static(CARPETA, { maxAge: '1d' }));

rutasPlanes.get('/', async (req, res) => res.json(await servicio.listarActivos()));

rutasPlanes.use(autenticar, permitirModulo('planes'));

rutasPlanes.get('/modulos', (req, res) => res.json(servicio.catalogoModulos()));
rutasPlanes.get('/todos', async (req, res) => res.json(await servicio.listarTodos()));
rutasPlanes.post('/', async (req, res) => res.status(201).json(await servicio.crear(req.body, req.usuario, req.ip)));
rutasPlanes.put('/:id', async (req, res) => res.json(await servicio.editar(req.params.id, req.body, req.usuario, req.ip)));
rutasPlanes.delete('/:id', async (req, res) => res.json(await servicio.apagar(req.params.id, req.usuario, req.ip)));

rutasPlanes.put('/:id/imagen', async (req, res) => {
  const archivo = await guardarImagen(req.body?.imagen);
  res.json(await servicio.guardarImagen(req.params.id, archivo, req.usuario, req.ip));
});
