import { SEGURIDAD } from '../configuracion/ajustes.js';
import * as ajustes from './ajustesSistema.js';

export function permitido() {
  return ajustes.leerBooleano('MODO_PRUEBA', SEGURIDAD.MODO_PRUEBA);
}

export function revelar(valor, proveedorConfigurado) {
  return !proveedorConfigurado && permitido() ? valor : undefined;
}
