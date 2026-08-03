// capa http del seguimiento estratégico
import * as servicio from './servicio.js';
import { TIPOS_ACCION_SEGUIMIENTO, LIMITES } from '../../configuracion/ajustes.js';
import * as ajustes from '../../servidor/ajustesSistema.js';

// opciones que necesita la interfaz, así no las duplica
export async function opciones(req, res) {
  res.json({
    tiposAccion: TIPOS_ACCION_SEGUIMIENTO,
    // se lee de la tabla y no del archivo: si no, el título decía 30 días y la lista
    // marcaba riesgo a los 15
    diasRiesgo: ajustes.leerNumero('DIAS_SIN_ACOMPANAMIENTO_RIESGO', LIMITES.DIAS_SIN_ACOMPANAMIENTO_RIESGO),
  });
}

export async function estudiantes(req, res) {
  res.json(await servicio.listarEstudiantes());
}

export async function acciones(req, res) {
  res.json(await servicio.listarAcciones(req.params.leadId));
}

export async function crearAccion(req, res) {
  const { leadId, tipo, detalle } = req.body ?? {};
  res.status(201).json(await servicio.registrarAccion(leadId, { tipo, detalle }, req.usuario.id, req.ip));
}
