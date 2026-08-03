import { randomInt } from 'node:crypto';

const MINUS = 'abcdefghjkmnpqrstuvwxyz';
const MAYUS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const NUMEROS = '0123456789';
const ESPECIALES = '@#$%&*!?';
const TODO = MINUS + MAYUS + NUMEROS + ESPECIALES;

const elegir = (conjunto) => conjunto[randomInt(conjunto.length)];

export function generarClaveTemporal(largo = 12) {
  const piezas = [elegir(MINUS), elegir(MAYUS), elegir(NUMEROS), elegir(ESPECIALES)];
  while (piezas.length < largo) piezas.push(elegir(TODO));

  for (let i = piezas.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [piezas[i], piezas[j]] = [piezas[j], piezas[i]];
  }
  return piezas.join('');
}
