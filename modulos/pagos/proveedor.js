import * as pagopar from './pasarelas/pagopar.js';
import * as simulada from './pasarelas/simulada.js';
import * as adamspay from './pasarelas/adamspay.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { PASARELA } from '../../configuracion/ajustes.js';

const PROVEEDORES = { pagopar, simulada, adamspay };

export function nombreProveedor() {
  const elegida = ajustes.leer('PASARELA_PROVEEDOR', PASARELA.PROVEEDOR);
  return PROVEEDORES[elegida] ? elegida : PASARELA.PROVEEDOR;
}

export function pasarelaActiva() {
  return PROVEEDORES[nombreProveedor()];
}

export function esSimulada() {
  return nombreProveedor() === 'simulada';
}

export function esIncrustable() {
  return pasarelaActiva().INCRUSTABLE !== false;
}
