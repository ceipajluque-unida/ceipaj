import * as servicio from './servicio.js';

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
