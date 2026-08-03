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

export function limpiarCache() {
  guardados.clear();
}

export function conEspera(minimoMs, hacer) {
  const turno = cola.then(async () => {
    const falta = ultima + minimoMs - Date.now();
    if (falta > 0) await new Promise((seguir) => setTimeout(seguir, falta));
    ultima = Date.now();
  });
  cola = turno.catch(() => {});
  return turno.then(hacer);
}
