import * as servicio from './servicio.js';
import { buscarComisionPagada, marcarEmision, generarReciboComision, numeroDeReciboComision } from './recibo.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
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

  if (estado !== ESTADOS_COMISION.PAGADA) {
    throw new ErrorVisible(`El único cambio permitido es marcar la comisión como "${ESTADOS_COMISION.PAGADA}".`);
  }
  res.json(await servicio.pagarComision(idDeRuta(req), req.usuario, req.ip));
}

export async function recibo(req, res) {
  const id = Number(req.params.id);
  const comision = await buscarComisionPagada(id);
  const emision = await marcarEmision(comision);
  const pdf = await generarReciboComision(comision, emision);
  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: emision.estado === 'Emitido' ? 'recibo_comision_emitido' : 'recibo_comision_reimpreso',
    detalle: numeroDeReciboComision(comision),
    ip: req.ip,
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="recibo-${numeroDeReciboComision(comision)}.pdf"`);
  res.send(pdf);
}
