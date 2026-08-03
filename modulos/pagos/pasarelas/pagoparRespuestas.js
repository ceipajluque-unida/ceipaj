import { ESTADOS_PAGO } from '../../../configuracion/ajustes.js';

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

export function explicar(motivo) {
  if (/no se encuentra habilitado para ofrecer servicios/i.test(motivo)) {
    return 'Pagopar todavía no habilitó tu comercio para vender servicios o productos virtuales. '
      + 'Pedíselo a su soporte (ver documentacion/pagopar-pedido-a-soporte.txt): es un permiso de la '
      + 'cuenta, no un problema del sistema.';
  }
  if (/Jsonb|No coinciden los campos/i.test(motivo)) {
    return `Pagopar rechazó el formato del pedido (${motivo}). Es un error del sistema, no de la cuenta.`;
  }
  if (/token/i.test(motivo) && /coincide|invalid/i.test(motivo)) {
    return 'Los tokens de Pagopar no coinciden. Revisá que sean los del entorno correcto en Configuración.';
  }
  if (/monto/i.test(motivo)) {
    return `Pagopar no acepta ese monto (${motivo}). El mínimo es Gs. 1.000 y el máximo Gs. 50.000.000.`;
  }
  return `Pagopar: ${motivo}`;
}
