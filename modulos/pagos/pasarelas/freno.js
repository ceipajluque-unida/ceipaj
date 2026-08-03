// cuida el trato con la pasarela: guarda en memoria lo que no cambia y no deja ráfagas de llamadas
const guardados = new Map();
let ultima = 0;
let cola = Promise.resolve();

export async function enCache(clave, segundos, obtener) {
  const guardado = guardados.get(clave);
  if (guardado && guardado.vence > Date.now()) return guardado.valor;
  const valor = await obtener();
  guardados.set(clave, { valor, vence: Date.now() + segundos * 1000 });
  return valor;
}

// al cambiar las credenciales lo cacheado ya no sirve
export function limpiarCache() {
  guardados.clear();
}

// las llamadas salen de a una y separadas, aunque varias pantallas pidan a la vez
export function conEspera(minimoMs, hacer) {
  const turno = cola.then(async () => {
    const falta = ultima + minimoMs - Date.now();
    if (falta > 0) await new Promise((seguir) => setTimeout(seguir, falta));
    ultima = Date.now();
  });
  cola = turno.catch(() => {});
  return turno.then(hacer);
}
