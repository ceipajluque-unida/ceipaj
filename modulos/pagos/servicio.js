// módulo de pagos: crear cobros, historial y recibo
import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { institucionActual } from '../../servidor/contexto.js';
import { PASARELA, ESTADOS_PAGO, MEDIOS_PAGO } from '../../configuracion/ajustes.js';
// aplicarResultado sale de acreditacion.js, que no importa este archivo: no hay ciclo
import { nombreProveedor, pasarelaActiva } from './proveedor.js';
import { aplicarResultado } from './acreditacion.js';

// cada cobro es de la institución que lo hizo. sin institución en el pedido no se
// devuelve ni se toca nada: el proveedor no cobra ni mira la plata de sus clientes
function institucionDelPedido() {
  const id = institucionActual();
  if (id === null) throw new ErrorVisible('Esta operación es de una institución.', 403);
  return id;
}

// crea el cobro en la pasarela según el medio elegido y lo guarda en el historial
export async function crearCobro({ concepto, monto, medio, plan }, usuario, ip) {
  // se resuelve antes de salir a la pasarela: si no hay institución, no se pide el pedido
  const institucionId = institucionDelPedido();
  const proveedor = nombreProveedor();
  const cobro = await pasarelaActiva().crearCobro({
    concepto,
    monto,
    medio,
    comprador: { nombre: usuario.nombre, correo: usuario.correo },
  });
  const [resultado] = await bd.query(
    `INSERT INTO pagos (institucion_id, referencia, concepto, monto, moneda, estado, proveedor, medio_pago, plan,
                        identificador_externo, url_pago, pagador_nombre, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [institucionId, cobro.referencia, concepto, monto, PASARELA.MONEDA, cobro.estado, proveedor, medio,
     plan ?? null, cobro.identificadorExterno ?? null, cobro.urlPago ?? null, usuario.nombre, usuario.id]
  );
  await registrarAuditoria({
    usuarioId: usuario.id,
    accion: 'pago_creado',
    detalle: `${cobro.referencia} · ${concepto} · ${monto} ${PASARELA.MONEDA} · ${medio}`,
    ip,
  });
  return { ...cobro, id: resultado.insertId, concepto, monto, medio, plan, moneda: PASARELA.MONEDA };
}

// historial de transacciones, las últimas primero
export async function listarPagos() {
  const [filas] = await bd.query(
    `SELECT referencia, concepto, monto, moneda, estado, proveedor, medio_pago, plan, url_pago,
            fecha_pago, forma_pago_externa, creado_en, actualizado_en
       FROM pagos WHERE institucion_id = ? ORDER BY creado_en DESC LIMIT 50`,
    [institucionDelPedido()]
  );
  return filas;
}

// último momento en que se le preguntó a la pasarela por cada pago
const ultimaConsulta = new Map();

// la pantalla de pago pregunta por acá si el cobro ya se acreditó
export async function estadoDePago(referencia) {
  const [[pago]] = await bd.query(
    'SELECT referencia, estado, plan, identificador_externo FROM pagos WHERE referencia = ? AND institucion_id = ?',
    [referencia, institucionDelPedido()]
  );
  // el pago de otra institución no existe para quien pregunta, ni se confirma que exista
  if (!pago) throw new ErrorVisible('Pago no encontrado.', 404);
  const respuesta = { referencia: pago.referencia, estado: pago.estado, plan: pago.plan };
  if (pago.estado !== ESTADOS_PAGO.PENDIENTE) {
    ultimaConsulta.delete(referencia);
    return respuesta;
  }

  // en local la pasarela no puede avisar (no llega a esta máquina), así que se le pregunta
  const proveedor = pasarelaActiva();
  if (typeof proveedor.consultarEstado !== 'function' || !pago.identificador_externo) return respuesta;
  if (Date.now() - (ultimaConsulta.get(referencia) ?? 0) < PASARELA.SEGUNDOS_ENTRE_CONSULTAS_DE_PAGO * 1000) {
    return respuesta;
  }
  ultimaConsulta.set(referencia, Date.now());
  try {
    const aviso = await proveedor.consultarEstado(pago.identificador_externo);
    if (aviso.estado === ESTADOS_PAGO.PENDIENTE || aviso.estado === pago.estado) return respuesta;
    await aplicarResultado({ referencia, estado: aviso.estado, usuarioId: null, aviso });
    ultimaConsulta.delete(referencia);
    return { ...respuesta, estado: aviso.estado };
  } catch {
    return respuesta; // si la pasarela no contesta, se devuelve lo que hay guardado
  }
}

export async function buscarPago(referencia) {
  const [[pago]] = await bd.query(
    'SELECT * FROM pagos WHERE referencia = ? AND institucion_id = ?',
    [referencia, institucionDelPedido()]
  );
  if (!pago) throw new ErrorVisible('Pago no encontrado.', 404);
  return pago;
}

// los medios reales del comercio; si la pasarela no los da, se usan los del sistema
export async function listarMedios() {
  const proveedor = pasarelaActiva();
  if (typeof proveedor.listarMedios !== 'function' || !proveedor.configurado?.()) return MEDIOS_PAGO;
  try {
    const medios = await proveedor.listarMedios();
    return medios.length > 0 ? medios : MEDIOS_PAGO;
  } catch {
    return MEDIOS_PAGO; // si la consulta falla el formulario igual tiene qué mostrar
  }
}

