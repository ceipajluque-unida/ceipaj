const CLAVE_TOKEN = 'ceipaj_token';
const CLAVE_USUARIO = 'ceipaj_usuario';

// sin recordarme la sesión vive en sessionStorage y se pierde al cerrar la pestaña
function leer(clave) {
  return localStorage.getItem(clave) ?? sessionStorage.getItem(clave);
}

export function guardarSesion(token, usuario, recordar) {
  // si no aclaran, se respeta dónde estaba guardada la sesión de antes
  const recordarla = recordar ?? Boolean(localStorage.getItem(CLAVE_TOKEN));
  cerrarSesion();
  const almacen = recordarla ? localStorage : sessionStorage;
  almacen.setItem(CLAVE_TOKEN, token);
  almacen.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
  // aviso para que la apariencia cargue el color guardado por el usuario
  window.dispatchEvent(new Event('sesion'));
}

export function cerrarSesion() {
  for (const almacen of [localStorage, sessionStorage]) {
    almacen.removeItem(CLAVE_TOKEN);
    almacen.removeItem(CLAVE_USUARIO);
  }
}

export function usuarioActual() {
  try {
    return JSON.parse(leer(CLAVE_USUARIO));
  } catch {
    return null;
  }
}

export function haySesion() {
  return Boolean(leer(CLAVE_TOKEN));
}

export function tokenActual() {
  return leer(CLAVE_TOKEN);
}

// el equipo de confianza va siempre en localStorage, así no se vuelve a pedir el código
const CLAVE_DISPOSITIVO = 'ceipaj_dispositivo';

export function tokenDispositivo() {
  return localStorage.getItem(CLAVE_DISPOSITIVO);
}

export function guardarDispositivo(token) {
  if (token) localStorage.setItem(CLAVE_DISPOSITIVO, token);
}

export function olvidarDispositivo() {
  localStorage.removeItem(CLAVE_DISPOSITIVO);
}

export async function llamarApi(ruta, { metodo = 'GET', cuerpo } = {}) {
  const encabezados = { 'Content-Type': 'application/json' };
  const token = leer(CLAVE_TOKEN);
  if (token) encabezados.Authorization = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(ruta, {
      method: metodo,
      headers: encabezados,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new Error('No hay conexión con el servidor. ¿Está corriendo el backend?');
  }

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    // sesión vencida...se limpia y vuelve al login
    if (respuesta.status === 401 && haySesion()) {
      cerrarSesion();
      window.location.assign('/ingreso');
    }
    throw new Error(datos.error ?? `Error ${respuesta.status} del servidor`);
  }
  return datos;
}
