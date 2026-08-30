import { llamarApi } from './api.js';

// los roles ya no estan escritos en la interfaz: el proveedor los edita, asi que
// se piden al servidor. se guardan en memoria porque cambian muy de vez en cuando.
let cache = null;

export async function rolesAsignables() {
  if (!cache) cache = await llamarApi('/api/usuarios/roles-asignables');
  return cache;
}

export function olvidarRoles() { cache = null; }

// para los selectores: solo las claves, en el orden que manda el servidor
export const clavesDe = (roles) => roles.map((r) => r.clave);
