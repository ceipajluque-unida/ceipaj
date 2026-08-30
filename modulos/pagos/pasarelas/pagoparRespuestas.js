import { ESTADOS_PAGO, PAGOPAR } from '../../../configuracion/ajustes.js';

function esVerdadero(valor) {
  return valor === true || valor === 1 || String(valor).toLowerCase() === 'true';
}

export function estadoDePedido(datos) {
  if (esVerdadero(datos?.pagado)) return ESTADOS_PAGO.EXITOSO;
  if (esVerdadero(datos?.cancelado)) return ESTADOS_PAGO.RECHAZADO;
  return ESTADOS_PAGO.PENDIENTE;
}

export function datosDelPago(datos) {
  return {
    fechaPago: datos?.fecha_pago || null,
    formaPago: datos?.forma_pago || null,
    comprobante: datos?.numero_comprobante_interno || null,
    pagadorNombre: datos?.nombre_comprador || datos?.comprador || null,
    pagadorDocumento: datos?.documento_comprador || null,
  };
}

// traduce el rechazo de pagopar a algo que se entienda y se pueda accionar
export function explicar(motivo) {
  if (/Jsonb|No coinciden los campos/i.test(motivo)) {
    return `Pagopar rechazó el formato del pedido (${motivo}). Es un error del sistema, no de la cuenta.`;
  }
  if (/token/i.test(motivo) && /coincide|invalid/i.test(motivo)) {
    return 'Los tokens de Pagopar no coinciden. Revisá que sean los del entorno correcto en Configuración.';
  }
  if (/monto/i.test(motivo)) {
    return `Pagopar no acepta ese monto (${motivo}). El mínimo es Gs. ${PAGOPAR.MONTO_MINIMO.toLocaleString('es-PY')} `
      + `y el máximo Gs. ${PAGOPAR.MONTO_MAXIMO.toLocaleString('es-PY')}.`;
  }
  return `Pagopar: ${motivo}`;
}
