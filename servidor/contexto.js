// institución del pedido que se está atendiendo. va por AsyncLocalStorage y no por
// parámetro para no tener que arrastrar el id por las cien llamadas que leen ajustes:
// se fija una vez al autenticar y lo ve todo lo que corre debajo, incluido el await.
import { AsyncLocalStorage } from 'node:async_hooks';

const almacen = new AsyncLocalStorage();

// id 0 es la plataforma: lo que fija el proveedor y vale para todas las instituciones
export const PLATAFORMA = 0;

export function conInstitucion(institucionId, seguir) {
  return almacen.run({ institucionId }, seguir);
}

// null cuando no hay pedido en curso (arranque, tareas periódicas) o cuando quien
// pide es el superadministrador, que no pertenece a ninguna institución
export function institucionActual() {
  return almacen.getStore()?.institucionId ?? null;
}
