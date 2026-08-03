import * as servicio from './servicio.js';
import { TIPOS_ACCION_SEGUIMIENTO, LIMITES } from '../../configuracion/ajustes.js';
import * as ajustes from '../../servidor/ajustesSistema.js';

export async function opciones(req, res) {
  res.json({
    tiposAccion: TIPOS_ACCION_SEGUIMIENTO,

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
