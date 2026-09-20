import { Router } from 'express';
import * as servicio from './servicio.js';
import * as publico from './publico.js';
import { autenticar, permitirModulo } from '../../servidor/middleware/autenticar.js';
import { frenoSolicitud, frenoGeneral } from '../../servidor/middleware/frecuencia.js';
import { ErrorVisible } from '../../servidor/errores.js';

export const rutasSolicitudes = Router();

function idDeRuta(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorVisible('Identificador de solicitud inválido.');
  return id;
}

rutasSolicitudes.get('/publico', frenoGeneral, async (req, res) => res.json(await publico.datosPublicos()));
rutasSolicitudes.post('/', frenoSolicitud, async (req, res) =>
  res.status(201).json(await publico.registrar(req.body, req.ip))
);

rutasSolicitudes.use(autenticar, permitirModulo('solicitudes'));

rutasSolicitudes.get('/', async (req, res) => {
  const { estado, texto } = req.query ?? {};
  res.json(await servicio.listar({ estado, texto }));
});

rutasSolicitudes.post('/descartar-viejas', async (req, res) =>
  res.json(await servicio.descartarViejas(req.body?.dias, req.usuario, req.ip))
);

rutasSolicitudes.get('/:id', async (req, res) => res.json(await servicio.obtener(idDeRuta(req))));

rutasSolicitudes.put('/:id', async (req, res) =>
  res.json(await servicio.atender(idDeRuta(req), req.body, req.usuario, req.ip))
);
