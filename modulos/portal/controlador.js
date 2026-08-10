import * as servicio from './servicio.js';
import { buscarComisionPagada, marcarEmision, generarReciboComision, numeroDeReciboComision } from '../comisiones/recibo.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';

export async function resumen(req, res) {
  res.json(await servicio.obtenerResumen(req.usuario.id));
}

export async function misLeads(req, res) {
  res.json(await servicio.listarMisLeads(req.usuario.id));
}

export async function misComisiones(req, res) {
  res.json(await servicio.listarMisComisiones(req.usuario.id));
}

export async function crearLead(req, res) {
  const { nombre, cedula, telefono, correo, consentimiento } = req.body ?? {};
  res.status(201).json(
    await servicio.registrarLead(req.usuario.id, { nombre, cedula, telefono, correo, consentimiento }, req.ip)
  );
}

export async function reciboComision(req, res) {
  const id = Number(req.params.id);
  const comision = await buscarComisionPagada(id, { aliadoUsuarioId: req.usuario.id });
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
