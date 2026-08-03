// capa http de comisiones, valida lo que entra antes de llamar al servicio
import * as servicio from './servicio.js';
import { ErrorVisible } from '../../servidor/errores.js';

const { ESTADOS_COMISION } = servicio;

function idDeRuta(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorVisible('Identificador de comisión inválido.');
  return id;
}

export async function listar(req, res) {
  res.json(await servicio.listarComisiones());
}

export async function pagar(req, res) {
  const { estado } = req.body ?? {};
  // el único cambio de estado que existe es pagar una pendiente
  if (estado !== ESTADOS_COMISION.PAGADA) {
    throw new ErrorVisible(`El único cambio permitido es marcar la comisión como "${ESTADOS_COMISION.PAGADA}".`);
  }
  res.json(await servicio.pagarComision(idDeRuta(req), req.usuario, req.ip));
}
