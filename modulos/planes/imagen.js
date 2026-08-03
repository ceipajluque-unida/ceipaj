import { writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ErrorVisible } from '../../servidor/errores.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../subidas');
export const CARPETA = path.join(RAIZ, 'planes');

const SUBCARPETAS = { planes: CARPETA, fondo: path.join(RAIZ, 'fondo') };
export const CARPETA_FONDO = SUBCARPETAS.fondo;

export const MAXIMO_KB = 400;
export const MAXIMO_KB_FONDO = 2048;
const MAXIMO_POR_CARPETA = { planes: MAXIMO_KB, fondo: MAXIMO_KB_FONDO };

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
  const destino = SUBCARPETAS[subcarpeta];
  if (!destino) throw new ErrorVisible('Destino de imagen no válido.');
  const topeKb = MAXIMO_POR_CARPETA[subcarpeta] ?? MAXIMO_KB;
  if (datos.length > topeKb * 1024) {
    throw new ErrorVisible(`La imagen pesa ${Math.round(datos.length / 1024)} KB y el máximo es ${topeKb} KB. Probá guardarla como JPG.`);
  }
  const firma = reconocer(datos);
  if (!firma) throw new ErrorVisible('El archivo tiene que ser una imagen PNG, JPG o WEBP.');

  await mkdir(destino, { recursive: true });

  const nombre = `${randomUUID()}.${firma.extension}`;
  await writeFile(path.join(destino, nombre), datos);
  return nombre;
}
