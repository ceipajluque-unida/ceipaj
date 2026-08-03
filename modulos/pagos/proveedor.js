// pagopar es la pasarela del sistema. para sumar otra, crear su archivo en pasarelas/,
// agregarla al mapa y elegirla acá según un ajuste.
import * as pagopar from './pasarelas/pagopar.js';

const PROVEEDORES = { pagopar };
const ACTIVA = 'pagopar';

export function nombreProveedor() {
  return ACTIVA;
}

export function pasarelaActiva() {
  return PROVEEDORES[ACTIVA];
}
