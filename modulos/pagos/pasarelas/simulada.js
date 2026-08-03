// pasarela de prueba. cumple el mismo contrato que pagopar, así que el resto del sistema
// no distingue una de otra: el pago se crea, se paga en un checkout propio, avisa con la
// misma firma y se acredita por el mismo camino.
//
// existe porque el comercio de Pagopar todavía no está habilitado para servicios
// virtuales, y sin ella no hay forma de mostrar el recorrido completo del cobro.
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { ESTADOS_PAGO, MEDIOS_PAGO, APLICACION } from '../../../configuracion/ajustes.js';
import * as ajustes from '../../../servidor/ajustesSistema.js';

// la clave con la que se firman los avisos. es la misma del sistema, así que un aviso
// fabricado desde afuera no pasa la verificación.
function secreto() {
  return ajustes.leer('PAGOPAR_TOKEN_PRIVADO', '') || process.env.JWT_SECRETO || 'simulada';
}

function firmar(texto) {
  return createHash('sha1').update(secreto() + texto).digest('hex');
}

// no necesita credenciales: es justamente la que se usa cuando todavía no las hay
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
    // el checkout lo sirve el propio sistema, en su pantalla de siempre
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
    formaPagoExterna: datos.forma_pago ?? 'Pasarela de prueba',
    comprobanteExterno: datos.numero_comprobante ?? null,
    pagadorNombre: datos.pagador_nombre ?? null,
    pagadorDocumento: datos.pagador_documento ?? null,
  };
}

// no hay servicio externo al que preguntarle: el estado que vale es el de nuestra base,
// y de eso ya se ocupa quien llama. se devuelve vacío para que no pise nada.
export async function consultarEstado() {
  return { estado: null };
}

export async function listarMedios() {
  return MEDIOS_PAGO.map((medio) => ({ ...medio, minimo: 1 }));
}

// lo usa el checkout propio para armar el aviso firmado, igual que lo mandaría la pasarela
export function avisoDePago({ hash, monto, medio }) {
  return {
    resultado: [{
      hash_pedido: hash,
      token: firmar(hash),
      pagado: true,
      monto: String(monto),
      fecha_pago: new Date().toISOString().slice(0, 19).replace('T', ' '),
      forma_pago: MEDIOS_PAGO.find((m) => m.valor === medio)?.texto ?? 'Pasarela de prueba',
      numero_comprobante: `SIM${Date.now().toString().slice(-8)}`,
    }],
  };
}
