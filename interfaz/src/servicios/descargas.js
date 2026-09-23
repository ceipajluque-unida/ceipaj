import { tokenActual, recibirRenovacion } from './api.js';

export async function descargarArchivo(ruta, nombre) {
  const respuesta = await fetch(ruta, { headers: { Authorization: `Bearer ${tokenActual()}` } });
  recibirRenovacion(respuesta);
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => ({}));
    throw new Error(cuerpo.error ?? 'No se pudo descargar el archivo.');
  }
  const url = URL.createObjectURL(await respuesta.blob());
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}
