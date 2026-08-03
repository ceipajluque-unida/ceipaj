// urls de los planes de suscripción
import { Router } from 'express';
import express from 'express';
import * as servicio from './servicio.js';
import { guardar as guardarImagen, CARPETA } from './imagen.js';
import { autenticar, permitirRoles } from '../../servidor/middleware/autenticar.js';
import { PERMISOS } from '../../configuracion/permisos.js';
import { MODULOS_NUCLEO } from '../../configuracion/ajustes.js';

export const rutasPlanes = Router();

// las imágenes son públicas: se muestran en el ingreso junto con los planes
rutasPlanes.use('/imagenes', express.static(CARPETA, { maxAge: '1d' }));

// el listado de lo que se ofrece va sin sesión, para poder mostrarlo en el ingreso
rutasPlanes.get('/', async (req, res) => res.json(await servicio.listarActivos()));

// una sola fuente de verdad de quién administra los planes: la matriz de permisos
rutasPlanes.use(autenticar, permitirRoles(...PERMISOS.planes));

// qué módulos se pueden habilitar o bloquear por plan; el núcleo nunca entra acá
rutasPlanes.get('/modulos', (req, res) =>
  res.json(Object.keys(PERMISOS).filter((clave) => !MODULOS_NUCLEO.includes(clave)))
);
rutasPlanes.get('/todos', async (req, res) => res.json(await servicio.listarTodos()));
rutasPlanes.post('/', async (req, res) => res.status(201).json(await servicio.crear(req.body, req.usuario, req.ip)));
rutasPlanes.put('/:id', async (req, res) => res.json(await servicio.editar(req.params.id, req.body, req.usuario, req.ip)));
rutasPlanes.delete('/:id', async (req, res) => res.json(await servicio.apagar(req.params.id, req.usuario, req.ip)));

rutasPlanes.put('/:id/imagen', async (req, res) => {
  const archivo = await guardarImagen(req.body?.imagen);
  res.json(await servicio.guardarImagen(req.params.id, archivo, req.usuario, req.ip));
});
