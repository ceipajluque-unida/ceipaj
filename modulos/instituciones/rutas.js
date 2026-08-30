import { Router } from 'express';
import * as servicio from './servicio.js';
import * as administrador from './administrador.js';
import * as usuarios from '../usuarios/servicio.js';
import * as aliados from '../aliados/servicio.js';
import * as suscripciones from '../suscripciones/servicio.js';
import { conInstitucion } from '../../servidor/contexto.js';
import { autenticar, permitirModulo } from '../../servidor/middleware/autenticar.js';
import { rolesAsignables } from '../roles/servicio.js';
import { ErrorVisible } from '../../servidor/errores.js';

export const rutasInstituciones = Router();

function idDeRuta(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorVisible('Identificador de institución inválido.');
  return id;
}

function suscripcionDeRuta(req) {
  const id = Number(req.params.suscripcionId);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorVisible('Identificador de suscripción inválido.');
  return id;
}

function usuarioDeRuta(req) {
  const id = Number(req.params.usuarioId);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorVisible('Identificador de usuario inválido.');
  return id;
}

rutasInstituciones.use(autenticar, permitirModulo('instituciones'));

rutasInstituciones.get('/', async (req, res) => res.json(await servicio.listar()));
rutasInstituciones.get('/:id', async (req, res) => res.json(await servicio.obtener(idDeRuta(req))));
rutasInstituciones.get('/:id/roles', async (req, res) => res.json(await servicio.detalleRoles(idDeRuta(req))));

rutasInstituciones.get('/:id/usuarios', async (req, res) =>
  res.json(await conInstitucion(idDeRuta(req), () => usuarios.listarUsuarios()))
);

// los aliados no salen en el padrón de usuarios (su alta y su baja son del colegio),
// así que el proveedor los ve acá, de solo lectura
rutasInstituciones.get('/:id/aliados', async (req, res) =>
  res.json(await conInstitucion(idDeRuta(req), () => aliados.listarAliados()))
);

rutasInstituciones.put('/:id/usuarios/:usuarioId', async (req, res) => {
  const { nombre, correo, telefono, direccion } = req.body ?? {};
  res.json(await conInstitucion(idDeRuta(req),
    () => usuarios.editarUsuario(usuarioDeRuta(req), { nombre, correo, telefono, direccion }, req.usuario, req.ip)));
});

rutasInstituciones.put('/:id/usuarios/:usuarioId/activo', async (req, res) => {
  const { activo } = req.body ?? {};
  if (typeof activo !== 'boolean') throw new ErrorVisible('Falta indicar si el usuario queda activo o no.');
  res.json(await conInstitucion(idDeRuta(req),
    () => usuarios.cambiarActivo({ id: usuarioDeRuta(req), activo }, req.usuario, req.ip)));
});

rutasInstituciones.put('/:id/usuarios/:usuarioId/rol', async (req, res) => {
  const { rol } = req.body ?? {};
  const asignables = await rolesAsignables();
  if (!asignables.some((r) => r.clave === rol)) throw new ErrorVisible('Ese rol no se puede asignar.');
  res.json(await conInstitucion(idDeRuta(req),
    () => usuarios.cambiarRol(usuarioDeRuta(req), rol, req.usuario, req.ip)));
});

rutasInstituciones.post('/:id/usuarios/:usuarioId/restablecer', async (req, res) =>
  res.json(await conInstitucion(idDeRuta(req),
    () => usuarios.restablecerClave({ id: usuarioDeRuta(req) }, req.usuario, req.ip)))
);
rutasInstituciones.post('/', async (req, res) => res.status(201).json(await servicio.crear(req.body, req.usuario, req.ip)));
rutasInstituciones.put('/:id', async (req, res) => res.json(await servicio.editar(idDeRuta(req), req.body, req.usuario, req.ip)));

rutasInstituciones.put('/:id/activo', async (req, res) => {
  const { activo } = req.body ?? {};
  if (typeof activo !== 'boolean') throw new ErrorVisible('Falta indicar si la institución queda activa o no.');
  res.json(await servicio.cambiarActivo(idDeRuta(req), activo, req.usuario, req.ip));
});

// el proveedor ve y corta la suscripción de cada institución desde su ficha
rutasInstituciones.get('/:id/suscripciones', async (req, res) =>
  res.json(await conInstitucion(idDeRuta(req), () => suscripciones.listarSuscripciones()))
);

rutasInstituciones.post('/:id/suscripciones/:suscripcionId/cancelar', async (req, res) =>
  res.json(await conInstitucion(idDeRuta(req),
    () => suscripciones.cancelar(suscripcionDeRuta(req), req.usuario, req.ip)))
);

rutasInstituciones.post('/:id/suscripciones/:suscripcionId/dar-de-baja', async (req, res) =>
  res.json(await conInstitucion(idDeRuta(req),
    () => suscripciones.darDeBajaAhora(suscripcionDeRuta(req), req.body?.motivo, req.usuario, req.ip)))
);

rutasInstituciones.post('/:id/administrador', async (req, res) =>
  res.status(201).json(await administrador.crearAdministrador(idDeRuta(req), req.body, req.usuario, req.ip))
);
