import * as servicio from './servicio.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { validarCorreo, validarTelefono, validarLargo, LARGOS } from '../../comun/validar.js';
import { CARGOS_ALIADO } from '../../configuracion/ajustes.js';

function idDeRuta(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorVisible('Identificador de aliado inválido.');
  return id;
}

function datosValidados(cuerpo) {
  const nombre = String(cuerpo?.nombre ?? '').trim();
  const correo = String(cuerpo?.correo ?? '').trim().toLowerCase();
  const institucion = String(cuerpo?.institucion ?? '').trim();
  const telefono = String(cuerpo?.telefono ?? '').trim();
  const cargo = String(cuerpo?.cargo ?? '').trim();
  if (!nombre) throw new ErrorVisible('El nombre es obligatorio.');
  if (!validarLargo(nombre, LARGOS.nombre)) throw new ErrorVisible(`El nombre no puede pasar de ${LARGOS.nombre} caracteres.`);
  if (!validarCorreo(correo)) throw new ErrorVisible('El correo no es válido.');
  if (!validarLargo(correo, LARGOS.correo)) throw new ErrorVisible(`El correo no puede pasar de ${LARGOS.correo} caracteres.`);
  if (!institucion) throw new ErrorVisible('La institución es obligatoria.');
  if (!validarLargo(institucion, LARGOS.institucion)) throw new ErrorVisible(`La institución no puede pasar de ${LARGOS.institucion} caracteres.`);
  if (!validarTelefono(telefono)) throw new ErrorVisible('El teléfono no tiene un formato válido.');
  if (cargo && !CARGOS_ALIADO.includes(cargo)) throw new ErrorVisible('El cargo no es válido.');
  return { nombre, correo, institucion, cargo: cargo || null, telefono: telefono || null };
}

export async function opciones(req, res) {
  res.json({ cargos: CARGOS_ALIADO });
}

export async function listar(req, res) {
  res.json(await servicio.listarAliados());
}

export async function ver(req, res) {
  res.json(await servicio.obtenerAliado(idDeRuta(req)));
}

export async function crear(req, res) {
  res.status(201).json(await servicio.crearAliado(datosValidados(req.body), req.usuario, req.ip));
}

export async function editar(req, res) {
  res.json(await servicio.editarAliado(idDeRuta(req), datosValidados(req.body), req.usuario, req.ip));
}

export async function reenviarAcceso(req, res) {
  res.json(await servicio.reenviarAcceso(idDeRuta(req), req.usuario, req.ip));
}

export async function cambiarActivo(req, res) {
  const { activo } = req.body ?? {};
  if (typeof activo !== 'boolean') throw new ErrorVisible('Falta indicar si se activa o desactiva.');
  res.json(await servicio.cambiarActivoAliado(idDeRuta(req), activo, req.usuario, req.ip));
}
