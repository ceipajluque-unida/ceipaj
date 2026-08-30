import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { ESTADOS_PAGO, MEDIOS_PAGO, APLICACION, nombreDePasarela } from '../../../configuracion/ajustes.js';
import * as ajustes from '../../../servidor/ajustesSistema.js';

// el recibo compara la forma de pago con el nombre de la pasarela, así que sale del mismo lugar
const NOMBRE = nombreDePasarela('simulada');

function secreto() {
  return ajustes.leer('PAGOPAR_TOKEN_PRIVADO', '') || process.env.JWT_SECRETO || 'simulada';
}

function firmar(texto) {
  return createHash('sha1').update(secreto() + texto).digest('hex');
}

export function configurado() {
  return true;
}

export async function crearCobro({ concepto, monto, medio }) {
  const referencia = `SIM-${randomUUID().slice(0, 8).toUpperCase()}`;
  const hash = randomUUID().replace(/-/g, '');
  const base = ajustes.leer('APP_URL', APLICACION.URL).replace(/\/$/, '');
  return {
    referencia,
    estado: ESTADOS_PAGO.PENDIENTE,
    identificadorExterno: hash,

    urlPago: `${base}/checkout/${hash}?medio=${encodeURIComponent(medio ?? '')}`,
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
    estado: datos.pagado ? ESTADOS_PAGO.EXITOSO : ESTADOS_PAGO.PENDIENTE,
    monto: Number(datos.monto),
    fechaPago: datos.fecha_pago ?? null,
    formaPagoExterna: datos.forma_pago ?? NOMBRE,
    comprobanteExterno: datos.numero_comprobante ?? null,
    pagadorNombre: datos.pagador_nombre ?? null,
    pagadorDocumento: datos.pagador_documento ?? null,
  };
}

export async function consultarEstado() {
  return { estado: null };
}

export async function listarMedios() {
  return MEDIOS_PAGO.map((medio) => ({ ...medio, minimo: 1 }));
}

// la hora va en el huso del servidor, igual que creado_en y que NOW() de mysql:
// con toISOString() salía en utc y el recibo mostraba el pago tres horas después
// de haberse creado
function ahoraLocal() {
  const ahora = new Date();
  const desfase = ahora.getTimezoneOffset() * 60000;
  return new Date(ahora.getTime() - desfase).toISOString().slice(0, 19).replace('T', ' ');
}

export function avisoDePago({ hash, monto, medio }) {
  return {
    resultado: [{
      hash_pedido: hash,
      token: firmar(hash),
      pagado: true,
      monto: String(monto),
      fecha_pago: ahoraLocal(),
      forma_pago: MEDIOS_PAGO.find((m) => m.valor === medio)?.texto ?? NOMBRE,
      numero_comprobante: `SIM${Date.now().toString().slice(-8)}`,
    }],
  };
}
