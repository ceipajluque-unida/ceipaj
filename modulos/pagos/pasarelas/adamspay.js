import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import { ADAMSPAY, PASARELA, ESTADOS_PAGO, APLICACION } from '../../../configuracion/ajustes.js';
import * as ajustes from '../../../servidor/ajustesSistema.js';
import { ErrorVisible } from '../../../servidor/errores.js';

export const INCRUSTABLE = false;
export const RECHAZO_ES_FINAL = true;

export const CONSULTA = {
  segundosPrimera: ADAMSPAY.SEGUNDOS_PRIMERA_CONSULTA,
  segundosEntre: ADAMSPAY.SEGUNDOS_ENTRE_CONSULTAS,
  maximoPorPago: ADAMSPAY.MAXIMO_CONSULTAS_POR_PAGO,
};

function credenciales() {
  return {
    apiKey: ajustes.leer('ADAMSPAY_API_KEY', ADAMSPAY.API_KEY),
    secreto: ajustes.leer('ADAMSPAY_SECRETO', ADAMSPAY.SECRETO),
  };
}

function base() {
  const entorno = ajustes.leer('ADAMSPAY_ENTORNO', ADAMSPAY.ENTORNO);
  return ADAMSPAY.ENTORNOS[entorno] ?? ADAMSPAY.ENTORNOS.staging;
}

export function configurado() {
  const { apiKey, secreto } = credenciales();
  return Boolean(apiKey && secreto);
}

async function llamar(ruta, { metodo = 'GET', cuerpo, encabezados } = {}) {
  const { apiKey } = credenciales();
  let respuesta;
  try {
    respuesta = await fetch(`${base()}${ruta}`, {
      method: metodo,
      headers: {
        apikey: apiKey,
        Accept: 'application/json',
        ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
        ...(encabezados ?? {}),
      },
      ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
      signal: AbortSignal.timeout(ADAMSPAY.SEGUNDOS_ESPERA * 1000),
    });
  } catch {
    throw new ErrorVisible('No se pudo contactar con AdamsPay. Probá de nuevo en unos minutos.', 502);
  }
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const motivo = datos?.meta?.description ?? datos?.meta?.message ?? `respondió ${respuesta.status}`;
    throw new ErrorVisible(`AdamsPay rechazó la operación: ${motivo}.`, 502);
  }
  return datos;
}

function estadoDeDeuda(deuda) {
  if (deuda?.payStatus?.status === 'paid') return ESTADOS_PAGO.EXITOSO;
  const objeto = deuda?.objStatus?.status;
  if (['expired', 'canceled', 'deleted', 'error', 'reversed'].includes(objeto)) return ESTADOS_PAGO.RECHAZADO;
  return ESTADOS_PAGO.PENDIENTE;
}

function datosDelPago(deuda) {
  const pagada = deuda?.payStatus?.status === 'paid';
  return {
    fechaPago: pagada ? deuda?.payStatus?.time ?? null : null,
    formaPago: 'AdamsPay',
    comprobante: pagada ? deuda?.objId ?? null : null,
    pagadorNombre: null,
    pagadorDocumento: null,
  };
}

export async function crearCobro({ concepto, monto }) {
  if (!configurado()) {
    throw new ErrorVisible(
      'El cobro en línea no está disponible en este momento. Avisale al proveedor del servicio para que termine de configurar la pasarela.',
      503
    );
  }
  const referencia = `ADP-${randomUUID().slice(0, 8).toUpperCase()}`;
  const inicio = new Date();
  const fin = new Date(inicio.getTime() + ADAMSPAY.DIAS_PARA_PAGAR * 86400000);

  const datos = await llamar('/debts', {
    metodo: 'POST',
    encabezados: { 'x-if-exists': 'update' },
    cuerpo: {
      debt: {
        docId: referencia,
        label: concepto,
        amount: { currency: PASARELA.MONEDA, value: String(monto) },
        validPeriod: {
          start: inicio.toISOString().slice(0, 19) + 'Z',
          end: fin.toISOString().slice(0, 19) + 'Z',
        },
        returnUrl: `${ajustes.leer('APP_URL', APLICACION.URL).replace(/\/$/, '')}/pago-finalizado`,
      },
    },
  });
  const urlPago = datos?.debt?.payUrl;
  if (!urlPago) throw new ErrorVisible('AdamsPay no devolvió la deuda creada.', 502);

  return { referencia, estado: ESTADOS_PAGO.PENDIENTE, identificadorExterno: referencia, urlPago };
}

export async function consultarEstado(identificadorExterno) {
  const datos = await llamar(`/debts/${encodeURIComponent(identificadorExterno)}`);
  const deuda = datos?.debt;
  return { estado: estadoDeDeuda(deuda), monto: Number(deuda?.amount?.value), ...datosDelPago(deuda) };
}

export function verificarNotificacion(cuerpo, req) {
  const { secreto } = credenciales();
  const crudo = req?.cuerpoCrudo;
  const firma = String(req?.headers?.['x-adams-notify-hash'] ?? '').trim().toLowerCase();
  if (!secreto || !crudo || !/^[0-9a-f]{32}$/.test(firma)) return null;

  const esperado = createHash('md5').update('adams' + crudo + secreto).digest();
  if (!timingSafeEqual(esperado, Buffer.from(firma, 'hex'))) return null;

  const deuda = cuerpo?.debt;
  if (cuerpo?.notify?.type !== 'debtStatus' || !deuda?.docId) return { ignorar: true };

  return {
    identificadorExterno: deuda.docId,
    estado: estadoDeDeuda(deuda),
    monto: Number(deuda?.amount?.value),
    ...datosDelPago(deuda),
  };
}

export async function listarMedios() {
  return [{ valor: 'adamspay', texto: 'AdamsPay (el medio se elige al pagar)', montoMinimo: 0, ventanaPropia: true }];
}
