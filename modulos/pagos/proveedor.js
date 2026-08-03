// qué pasarela usa el sistema. la elige el proveedor del servicio desde Configuración:
// "simulada" sirve para mostrar y probar el recorrido completo del cobro sin depender de
// que el comercio esté habilitado, y "pagopar" es la de verdad.
import * as pagopar from './pasarelas/pagopar.js';
import * as simulada from './pasarelas/simulada.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { PASARELA } from '../../configuracion/ajustes.js';

const PROVEEDORES = { pagopar, simulada };

export function nombreProveedor() {
  const elegida = ajustes.leer('PASARELA_PROVEEDOR', PASARELA.PROVEEDOR);
  return PROVEEDORES[elegida] ? elegida : PASARELA.PROVEEDOR;
}

export function pasarelaActiva() {
  return PROVEEDORES[nombreProveedor()];
}

// la pantalla necesita saber si está en modo de prueba para avisarlo sin disimulo
export function esSimulada() {
  return nombreProveedor() === 'simulada';
}
