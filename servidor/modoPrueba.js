// muestra en pantalla los códigos y el enlace de recuperación, solo si no hay proveedor configurado
import { SEGURIDAD } from '../configuracion/ajustes.js';
import * as ajustes from './ajustesSistema.js';

export function permitido() {
  return ajustes.leerBooleano('MODO_PRUEBA', SEGURIDAD.MODO_PRUEBA);
}

// devuelve el secreto solo si además el proveedor está sin configurar
export function revelar(valor, proveedorConfigurado) {
  return !proveedorConfigurado && permitido() ? valor : undefined;
}
