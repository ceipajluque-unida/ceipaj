import { obtenerDatos } from './exportaciones.js';
import { aXlsx, aPdf } from '../../comun/tablaExportable.js';
import { INSTITUCION } from '../../configuracion/ajustes.js';
import * as ajustes from '../../servidor/ajustesSistema.js';

const TITULOS = {
  leads: 'Interesados', interacciones: 'Interacciones', comisiones: 'Comisiones', suscripciones: 'Suscripciones',
  pagos: 'Pagos', auditoria: 'Auditoría',
};

const institucion = () => ajustes.leer('INSTITUCION_NOMBRE', INSTITUCION.NOMBRE);

export async function generarXlsx(tabla) {
  const { encabezados, filas } = await obtenerDatos(tabla);
  return aXlsx({ titulo: TITULOS[tabla] ?? tabla, autor: institucion(), encabezados, filas });
}

export async function generarPdf(tabla) {
  const { encabezados, filas } = await obtenerDatos(tabla);
  return aPdf({ titulo: `${institucion()}: ${TITULOS[tabla] ?? tabla}`, encabezados, filas });
}
