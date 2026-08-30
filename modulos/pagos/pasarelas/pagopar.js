import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import { PAGOPAR, ESTADOS_PAGO } from '../../../configuracion/ajustes.js';
import * as ajustes from '../../../servidor/ajustesSistema.js';
import { ErrorVisible } from '../../../servidor/errores.js';
import { armarPedido } from './pagoparPedido.js';
import { estadoDePedido, datosDelPago, explicar } from './pagoparRespuestas.js';
import { conEspera } from './freno.js';

// el checkout va en ventana aparte, como adamspay: la pasarela no se incrusta
export const INCRUSTABLE = false;

function credenciales() {
  return {
    publico: ajustes.leer('PAGOPAR_TOKEN_PUBLICO', PAGOPAR.TOKEN_PUBLICO),
    privado: ajustes.leer('PAGOPAR_TOKEN_PRIVADO', PAGOPAR.TOKEN_PRIVADO),
  };
}

export function configurado() {
  const { publico, privado } = credenciales();
  return Boolean(publico && privado);
}

function firmar(...partes) {
  const { privado } = credenciales();
  return createHash('sha1').update(privado + partes.join('')).digest('hex');
}

async function llamar(ruta, cuerpo) {
  let respuesta;
  try {
    respuesta = await conEspera(PAGOPAR.MS_ENTRE_LLAMADAS, () => fetch(`${PAGOPAR.API}${ruta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(PAGOPAR.SEGUNDOS_ESPERA * 1000),
    }));
  } catch {
    throw new ErrorVisible('No se pudo contactar con Pagopar. Probá de nuevo en unos minutos.', 502);
  }
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || datos.respuesta !== true) {
    const motivo = typeof datos.resultado === 'string' ? datos.resultado : 'Pagopar rechazó la operación.';
    throw new ErrorVisible(explicar(motivo), 502);
  }
  return datos.resultado;
}

export async function crearCobro({ concepto, monto, medio, comprador }) {
  const { publico, privado } = credenciales();
  if (!publico || !privado) {
    throw new ErrorVisible(
      'El cobro en línea no está disponible en este momento. Avisale al proveedor del servicio para que termine de configurar la pasarela.',
      503
    );
  }
  const referencia = `CEIPAJ-${randomUUID().slice(0, 8).toUpperCase()}`;
  const montoEntero = Math.trunc(Number(monto));

  const pedido = armarPedido({
    referencia,
    concepto,
    monto: montoEntero,
    medio,
    comprador,
    publico,
    token: firmar(referencia, String(montoEntero)),
  });
  const resultado = await llamar('/comercios/2.0/iniciar-transaccion', pedido);
  const hash = resultado?.[0]?.data;
  if (!hash) throw new ErrorVisible('Pagopar no devolvió el pedido.', 502);

  return {
    referencia,
    estado: ESTADOS_PAGO.PENDIENTE,
    identificadorExterno: hash,

    // sin forma_pago en la url: el checkout de pagopar muestra todos los
    // medios habilitados del comercio y la persona elige ahí
    urlPago: `${PAGOPAR.CHECKOUT}/${hash}`,
  };
}

export function verificarNotificacion(cuerpo) {
  const datos = cuerpo?.resultado?.[0];
  if (typeof datos?.hash_pedido !== 'string' || typeof datos?.token !== 'string') return null;

  const recibido = datos.token.trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(recibido)) return null;

  const esperado = Buffer.from(firmar(datos.hash_pedido), 'hex');
  if (!timingSafeEqual(esperado, Buffer.from(recibido, 'hex'))) return null;

  return {
    identificadorExterno: datos.hash_pedido,
    estado: estadoDePedido(datos),
    monto: Number(datos.monto),
    ...datosDelPago(datos),
  };
}

export async function consultarEstado(identificadorExterno) {
  const { publico } = credenciales();
  const resultado = await llamar('/pedidos/1.1/traer', {
    hash_pedido: identificadorExterno,
    token: firmar('CONSULTA'),
    token_publico: publico,
  });
  const datos = resultado?.[0];
  return { estado: estadoDePedido(datos), ...datosDelPago(datos) };
}

// el medio se elige en el propio checkout de pagopar, así siempre se ofrecen
// los que el comercio de verdad tiene habilitados; de paso no se consulta su api
export async function listarMedios() {
  return [{ valor: 'pagopar', texto: 'Pagopar', montoMinimo: PAGOPAR.MONTO_MINIMO, ventanaPropia: true }];
}
