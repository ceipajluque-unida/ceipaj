// el proveedor puede renombrar un rol o crear otros, asi que sus nombres no
// pueden estar escritos en la interfaz: llegan con el perfil y se guardan acá
// para toda la sesión.
let nombres = {};

export function guardarNombresDeRol(mapa) {
  nombres = mapa ?? {};
}

// si el rol no está en el mapa (sesión recién abierta, o un rol borrado que
// todavía figura en la auditoría) se muestra la clave con la primera en mayúscula
export function nombreDeRol(clave) {
  if (!clave) return '—';
  return nombres[clave] ?? clave.charAt(0).toUpperCase() + clave.slice(1);
}

// cuando la pantalla ya pidió la lista de roles al servidor, ese título es el
// más fresco de todos; si no está, se usa el que llegó con el perfil
export function nombreDeRolEn(roles, clave) {
  return roles?.find((rol) => rol.clave === clave)?.titulo ?? nombreDeRol(clave);
}
