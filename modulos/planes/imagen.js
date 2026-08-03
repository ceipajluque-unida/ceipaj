// subida de la imagen del plan. llega en base64 dentro del json, así no hace falta multer
import { writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ErrorVisible } from '../../servidor/errores.js';

// se ancla al archivo y no al cwd: con path.resolve('subidas/planes') la carpeta cambiaba
// según desde dónde se arrancara el servidor, y express.static servía un directorio vacío
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../subidas');
export const CARPETA = path.join(RAIZ, 'planes');
// solo estas subcarpetas: el nombre viene del código, nunca de lo que mande el navegador
const SUBCARPETAS = { planes: CARPETA, fondo: path.join(RAIZ, 'fondo') };
export const CARPETA_FONDO = SUBCARPETAS.fondo;
export const MAXIMO_KB = 400;
const MAXIMO_BYTES = MAXIMO_KB * 1024;
// solo formatos de imagen conocidos, y se confía en la firma del archivo, no en el nombre
const FIRMAS = [
  { tipo: 'image/png', extension: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { tipo: 'image/jpeg', extension: 'jpg', bytes: [0xff, 0xd8, 0xff] },
  { tipo: 'image/webp', extension: 'webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

function reconocer(datos) {
  return FIRMAS.find((firma) => firma.bytes.every((byte, i) => datos[i] === byte));
}

export async function guardar(base64, subcarpeta = 'planes') {
  const limpio = String(base64 ?? '').replace(/^data:image\/[a-z+]+;base64,/, '');
  if (!limpio) throw new ErrorVisible('No llegó ninguna imagen.');

  let datos;
  try {
    datos = Buffer.from(limpio, 'base64');
  } catch {
    throw new ErrorVisible('La imagen no se pudo leer.');
  }
  if (datos.length > MAXIMO_BYTES) {
    throw new ErrorVisible(`La imagen no puede pasar de ${Math.round(MAXIMO_BYTES / 1024)} KB.`);
  }
  const firma = reconocer(datos);
  if (!firma) throw new ErrorVisible('El archivo tiene que ser una imagen PNG, JPG o WEBP.');

  const destino = SUBCARPETAS[subcarpeta];
  if (!destino) throw new ErrorVisible('Destino de imagen no válido.');
  await mkdir(destino, { recursive: true });
  // el nombre lo genera el sistema: así no se puede escribir fuera de la carpeta
  const nombre = `${randomUUID()}.${firma.extension}`;
  await writeFile(path.join(destino, nombre), datos);
  return nombre;
}
