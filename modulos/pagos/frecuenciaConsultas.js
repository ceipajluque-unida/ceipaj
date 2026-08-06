import { PASARELA } from '../../configuracion/ajustes.js';

export function decidirConsulta({ regla, edadMs, ultima, usadas, ahora = Date.now() }) {
  if (!regla) return ahora - ultima >= PASARELA.SEGUNDOS_ENTRE_CONSULTAS_DE_PAGO * 1000;
  if (usadas >= regla.maximoPorPago) return false;
  if (edadMs < regla.segundosPrimera * 1000) return false;
  return ahora - ultima >= regla.segundosEntre * 1000;
}
