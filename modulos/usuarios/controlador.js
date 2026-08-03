// capa http de usuarios, valida entradas y llama al servicio
import * as servicio from './servicio.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { validarCorreo, validarTelefono, validarLargo, LARGOS } from '../../comun/validar.js';
import { ROLES } from '../../configuracion/ajustes.js';
import { ROLES_ASIGNABLES } from '../../configuracion/permisos.js';

// convierte el :id de la url en un entero válido o corta con error claro
function idDeRuta(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorVisible('Identificador de usuario inválido.');
  return id;
}

// mismas reglas para el alta y la edición, así no se separan con el tiempo
function datosValidados(cuerpo) {
  const nombre = String(cuerpo?.nombre ?? '').trim();
  const correo = String(cuerpo?.correo ?? '').trim().toLowerCase();
  const telefono = String(cuerpo?.telefono ?? '').trim();
  const direccion = String(cuerpo?.direccion ?? '').trim();
  if (!nombre) throw new ErrorVisible('El nombre es obligatorio.');
  if (!validarLargo(nombre, LARGOS.nombre)) throw new ErrorVisible(`El nombre no puede pasar de ${LARGOS.nombre} caracteres.`);
  if (!validarCorreo(correo)) throw new ErrorVisible('El correo no es válido.');
  if (!validarLargo(correo, LARGOS.correo)) throw new ErrorVisible(`El correo no puede pasar de ${LARGOS.correo} caracteres.`);
  if (!validarTelefono(telefono)) throw new ErrorVisible('El teléfono no tiene un formato válido.');
  if (!validarLargo(direccion, LARGOS.direccion)) throw new ErrorVisible(`La dirección no puede pasar de ${LARGOS.direccion} caracteres.`);
  return { nombre, correo, telefono, direccion };
}

function rolValidado(rol) {
  // los aliados llevan datos extra (institución, puntaje) y se dan de alta en su módulo
  if (rol === ROLES.ALIADO) throw new ErrorVisible('Los aliados se registran desde el módulo de Aliados.');
  // contra la lista blanca: el superadministrador es del proveedor y no se asigna desde acá
  if (!ROLES_ASIGNABLES.includes(rol)) throw new ErrorVisible('El rol no es válido.');
  return rol;
}

export async function listar(req, res) {
  res.json(await servicio.listarUsuarios());
}

export async function ver(req, res) {
  res.json(await servicio.obtenerUsuario(idDeRuta(req)));
}

export async function crear(req, res) {
  const datos = datosValidados(req.body);
  const rol = rolValidado(req.body?.rol);
  res.status(201).json(await servicio.crearUsuario({ ...datos, rol }, req.usuario, req.ip));
}

export async function editar(req, res) {
  const datos = datosValidados(req.body);
  res.json(await servicio.editarUsuario(idDeRuta(req), datos, req.usuario, req.ip));
}

export async function cambiarRol(req, res) {
  const rol = rolValidado(req.body?.rol);
  res.json(await servicio.cambiarRol(idDeRuta(req), rol, req.usuario, req.ip));
}

export async function cambiarActivo(req, res) {
  const { activo } = req.body ?? {};
  if (typeof activo !== 'boolean') throw new ErrorVisible('Falta indicar si el usuario queda activo o no.');
  res.json(await servicio.cambiarActivo({ id: idDeRuta(req), activo }, req.usuario, req.ip));
}

export async function restablecerClave(req, res) {
  res.json(await servicio.restablecerClave({ id: idDeRuta(req) }, req.usuario, req.ip));
}
