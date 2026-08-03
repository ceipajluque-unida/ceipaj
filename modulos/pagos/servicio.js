import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { institucionActual } from '../../servidor/contexto.js';
import { PASARELA, ESTADOS_PAGO, MEDIOS_PAGO } from '../../configuracion/ajustes.js';

import { nombreProveedor, pasarelaActiva } from './proveedor.js';
import { aplicarResultado } from './acreditacion.js';

function institucionDelPedido() {
  const id = institucionActual();
  if (id === null) throw new ErrorVisible('Esta operación es de una institución.', 403);
  return id;
}

export async function crearCobro({ concepto, monto, medio, plan }, usuario, ip) {
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
    detalle: `${cobro.referencia} — ${concepto} — ${monto} ${PASARELA.MONEDA} — ${medio}`,
    ip,
  });
  return { ...cobro, id: resultado.insertId, concepto, monto, medio, plan, moneda: PASARELA.MONEDA };
}

export async function listarPagos({ soloSuscripciones = false } = {}) {
  const condicionPlan = soloSuscripciones ? 'plan IS NOT NULL' : 'plan IS NULL';
  const [filas] = await bd.query(
    `SELECT referencia, concepto, monto, moneda, estado, proveedor, medio_pago, plan, url_pago,
            fecha_pago, forma_pago_externa, creado_en, actualizado_en
       FROM pagos WHERE institucion_id = ? AND ${condicionPlan} ORDER BY creado_en DESC LIMIT 50`,
    [institucionDelPedido()]
  );
  return filas;
}

const ultimaConsulta = new Map();

export async function estadoDePago(referencia) {
  const [[pago]] = await bd.query(
    'SELECT referencia, estado, plan, identificador_externo FROM pagos WHERE referencia = ? AND institucion_id = ?',
    [referencia, institucionDelPedido()]
  );

  if (!pago) throw new ErrorVisible('Pago no encontrado.', 404);
  const respuesta = { referencia: pago.referencia, estado: pago.estado, plan: pago.plan };
  if (pago.estado !== ESTADOS_PAGO.PENDIENTE) {
    ultimaConsulta.delete(referencia);
    return respuesta;
  }

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
    return respuesta;
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

export async function listarMedios() {
  const proveedor = pasarelaActiva();
  if (typeof proveedor.listarMedios !== 'function' || !proveedor.configurado?.()) return MEDIOS_PAGO;
  try {
    const medios = await proveedor.listarMedios();
    return medios.length > 0 ? medios : MEDIOS_PAGO;
  } catch {
    return MEDIOS_PAGO;
  }
}
