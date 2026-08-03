// capa http del módulo de suscripciones
import * as servicio from './servicio.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { listarPagos } from '../pagos/servicio.js';

export async function planes(req, res) {
  res.json(await servicio.listarPlanes());
}

// lo que necesita la pantalla: el plan vigente, el historial y qué implica pasarse a
// cada plan, para que los botones digan la verdad y no cambiar al que ya se tiene
export async function resumen(req, res) {
  const planes = await servicio.listarPlanes();
  const cambios = {};
  for (const plan of planes) cambios[plan.valor] = await servicio.calcularCambio(plan.valor);
  res.json({
    vigente: await servicio.suscripcionVigente(),
    historial: await servicio.listarSuscripciones(),
    // los cobros de la plataforma se muestran acá y no en Pagos, que es de los cobros del colegio
    pagos: await listarPagos({ soloSuscripciones: true }),
    planes,
    cambios,
    diasAviso: servicio.diasDeAviso(),
  });
}

export async function cancelar(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorVisible('Suscripción no válida.');
  res.json(await servicio.cancelar(id, req.usuario, req.ip));
}
