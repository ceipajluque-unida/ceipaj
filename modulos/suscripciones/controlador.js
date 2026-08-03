// capa http del módulo de suscripciones
import * as servicio from './servicio.js';
import { ErrorVisible } from '../../servidor/errores.js';

export async function planes(req, res) {
  res.json(await servicio.listarPlanes());
}

// lo que necesita la pantalla, el plan vigente y el historial
export async function resumen(req, res) {
  res.json({
    vigente: await servicio.suscripcionVigente(),
    historial: await servicio.listarSuscripciones(),
    planes: await servicio.listarPlanes(),
    diasAviso: servicio.diasDeAviso(),
  });
}

export async function cancelar(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorVisible('Suscripción no válida.');
  res.json(await servicio.cancelar(id, req.usuario, req.ip));
}
