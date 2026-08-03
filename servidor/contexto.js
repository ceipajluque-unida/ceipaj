import { AsyncLocalStorage } from 'node:async_hooks';

const almacen = new AsyncLocalStorage();

export const PLATAFORMA = 0;

export function conInstitucion(institucionId, seguir) {
  return almacen.run({ institucionId }, seguir);
}

export function institucionActual() {
  return almacen.getStore()?.institucionId ?? null;
}
