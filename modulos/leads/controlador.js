// capa http de leads, delega en el servicio, que es donde están las validaciones fuertes
import * as servicio from './servicio.js';
import * as consultas from './consultas.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { CANALES_CAPTACION, TIPOS_INTERACCION, ESTADOS_LEAD, LEGALES, LIMITES } from '../../configuracion/ajustes.js';

// opciones que necesita la interfaz (y el portal del aliado), así no las duplica
export async function opciones(req, res) {
  res.json({
    canales: CANALES_CAPTACION,
    tiposInteraccion: TIPOS_INTERACCION,
    estados: Object.values(ESTADOS_LEAD),
    avisoConsentimiento: ajustes.leer('TEXTO_CONSENTIMIENTO', LEGALES.AVISO_CONSENTIMIENTO),
    // se lee de la tabla, no del archivo: si no, el título decía 7 días y la lista usaba 15
    diasAlerta: ajustes.leerNumero('DIAS_SIN_SEGUIMIENTO_PARA_ALERTA', LIMITES.DIAS_SIN_SEGUIMIENTO_PARA_ALERTA),
  });
}

export async function listar(req, res) {
  const { estado, canal, buscar, aliado, incluirBajas } = req.query;
  res.json(await consultas.listarLeads({ estado, canal, buscar, aliado, incluirBajas: incluirBajas === '1' }));
}

export async function alertas(req, res) {
  res.json(await consultas.listarAlertas());
}

export async function detalle(req, res) {
  res.json(await consultas.obtenerLead(req.params.id));
}

export async function crear(req, res) {
  const { nombre, cedula, telefono, correo, canal, consentimiento } = req.body ?? {};
  res.status(201).json(
    await servicio.crearLead(
      { nombre, cedula, telefono, correo, canal, consentimiento, creadoPor: req.usuario.id },
      req.ip
    )
  );
}

export async function editar(req, res) {
  const { nombre, telefono, correo, canal } = req.body ?? {};
  res.json(await servicio.editarLead(req.params.id, { nombre, telefono, correo, canal }, req.usuario.id, req.ip));
}

export async function cambiarEstado(req, res) {
  const { estado } = req.body ?? {};
  res.json(await servicio.cambiarEstado(req.params.id, estado, req.usuario.id, req.ip));
}

export async function crearInteraccion(req, res) {
  const { tipo, detalle } = req.body ?? {};
  res.status(201).json(await servicio.registrarInteraccion(req.params.id, { tipo, detalle }, req.usuario.id, req.ip));
}

export async function darDeBaja(req, res) {
  res.json(await servicio.darDeBaja(req.params.id, req.body?.motivo, req.usuario.id, req.ip));
}

export async function reactivar(req, res) {
  res.json(await servicio.reactivar(req.params.id, req.usuario.id, req.ip));
}

export async function revocarConsentimiento(req, res) {
  res.json(await servicio.revocarConsentimiento(req.params.id, req.usuario.id, req.ip));
}
