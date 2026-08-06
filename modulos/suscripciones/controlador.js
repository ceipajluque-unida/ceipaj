import * as servicio from './servicio.js';
import { ErrorVisible } from '../../servidor/errores.js';

export async function planes(req, res) {
  res.json(await servicio.listarPlanes());
}

export async function resumen(req, res) {
  const planes = await servicio.listarPlanes();
  const cambios = {};
  for (const plan of planes) cambios[plan.valor] = await servicio.calcularCambio(plan.valor);
  res.json({
    vigente: await servicio.suscripcionVigente(),
    historial: await servicio.listarSuscripciones(),
    planes,
    cambios,
    diasAviso: servicio.diasDeAviso(),
  });
}

export async function reducir(req, res) {
  const { plan } = req.body ?? {};
  res.json(await servicio.aplicarReduccion(plan, req.usuario, req.ip));
}

export async function cancelar(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorVisible('Suscripción no válida.');
  res.json(await servicio.cancelar(id, req.usuario, req.ip));
}
