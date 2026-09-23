const CLAVE_TOKEN = 'ceipaj_token';
const CLAVE_USUARIO = 'ceipaj_usuario';

const CLAVE_MOTIVO_SALIDA = 'ceipaj_motivo_salida';

export function motivoDeSalida() {
  const motivo = sessionStorage.getItem(CLAVE_MOTIVO_SALIDA);
  if (motivo) sessionStorage.removeItem(CLAVE_MOTIVO_SALIDA);
  return motivo;
}

const CABECERA_RENOVADA = 'X-Sesion-Renovada';
let temporizadorCierre = null;

function leer(clave) {
  return localStorage.getItem(clave) ?? sessionStorage.getItem(clave);
}

function venceEn(token) {
  try {
    const carga = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return carga.exp * 1000;
  } catch {
    return null;
  }
}

// si la pantalla queda quieta hasta que vence la sesion, se cierra sola: asi no
// quedan datos a la vista de quien se siente despues frente a la computadora
function programarCierre() {
  clearTimeout(temporizadorCierre);
  const token = leer(CLAVE_TOKEN);
  const vence = token && venceEn(token);
  if (!vence) return;
  temporizadorCierre = setTimeout(() => {
    if (leer(CLAVE_TOKEN) !== token) return programarCierre();
    cerrarSesion();
    sessionStorage.setItem(CLAVE_MOTIVO_SALIDA, 'Tu sesión se cerró por inactividad. Volvé a ingresar para seguir.');
    window.location.assign('/ingreso');
  }, Math.max(0, vence - Date.now()));
}

export function recibirRenovacion(respuesta) {
  const nuevo = respuesta.headers.get(CABECERA_RENOVADA);
  if (!nuevo) return;
  const almacen = localStorage.getItem(CLAVE_TOKEN) ? localStorage : sessionStorage;
  if (!almacen.getItem(CLAVE_TOKEN)) return;
  almacen.setItem(CLAVE_TOKEN, nuevo);
  programarCierre();
}

export function guardarSesion(token, usuario, recordar) {
  const recordarla = recordar ?? Boolean(localStorage.getItem(CLAVE_TOKEN));
  cerrarSesion();
  const almacen = recordarla ? localStorage : sessionStorage;
  almacen.setItem(CLAVE_TOKEN, token);
  almacen.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
  programarCierre();

  window.dispatchEvent(new Event('sesion'));
}

export function cerrarSesion() {
  clearTimeout(temporizadorCierre);
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
    throw new Error('No hay conexión con el servidor.');
  }
  recibirRenovacion(respuesta);

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    if (respuesta.status === 401 && haySesion()) {
      cerrarSesion();
      sessionStorage.setItem(CLAVE_MOTIVO_SALIDA, datos.error ?? 'Tu sesión venció. Volvé a ingresar.');
      window.location.assign('/ingreso');
    }
    throw new Error(datos.error ?? `Error ${respuesta.status} del servidor`);
  }
  return datos;
}

programarCierre();
