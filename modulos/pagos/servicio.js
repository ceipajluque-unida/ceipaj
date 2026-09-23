import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { institucionActual } from '../../servidor/contexto.js';
import { PASARELA, ESTADOS_PAGO, MEDIOS_PAGO } from '../../configuracion/ajustes.js';

import { nombreProveedor, pasarelaActiva } from './proveedor.js';
import { decidirConsulta } from './frecuenciaConsultas.js';
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
    detalle: `${cobro.referencia}: ${concepto}, ${monto} ${PASARELA.MONEDA}, ${medio}`,
    ip,
  });
  return { ...cobro, id: resultado.insertId, concepto, monto, medio, plan, moneda: PASARELA.MONEDA };
}

export async function listarPagos() {
  const [filas] = await bd.query(
    `SELECT referencia, concepto, monto, moneda, estado, proveedor, medio_pago, plan, url_pago,
            fecha_pago, forma_pago_externa, creado_en, actualizado_en
       FROM pagos WHERE institucion_id = ? ORDER BY creado_en DESC LIMIT 50`,
    [institucionDelPedido()]
  );
  return filas;
}

// un cobro pendiente es un pedido que nunca se pagó: se descarta para sacarlo de la lista.
// solo pendientes: un pago acreditado o rechazado es historia y no se toca
export async function descartarPago(referencia, usuario, ip) {
  const institucionId = institucionDelPedido();
  const [[pago]] = await bd.query(
    'SELECT id, estado, concepto, monto FROM pagos WHERE referencia = ? AND institucion_id = ?',
    [referencia, institucionId]
  );
  if (!pago) throw new ErrorVisible('Cobro no encontrado.', 404);
  if (pago.estado !== ESTADOS_PAGO.PENDIENTE) {
    throw new ErrorVisible('Solo se pueden descartar los cobros que quedaron pendientes.', 409);
  }
  const [[suscripcion]] = await bd.query('SELECT id FROM suscripciones WHERE pago_id = ?', [pago.id]);
  if (suscripcion) throw new ErrorVisible('Ese cobro ya activó una suscripción.', 409);

  await bd.query('DELETE FROM pagos WHERE id = ? AND estado = ?', [pago.id, ESTADOS_PAGO.PENDIENTE]);
  await registrarAuditoria({
    usuarioId: usuario.id,
    accion: 'pago_descartado',
    detalle: `${referencia}: ${pago.concepto}, ${pago.monto} ${PASARELA.MONEDA}`,
    ip,
  });
  return { referencia, descartado: true };
}

const consultas = new Map();

export async function estadoDePago(referencia) {
  const [[pago]] = await bd.query(
    'SELECT referencia, estado, plan, identificador_externo, creado_en FROM pagos WHERE referencia = ? AND institucion_id = ?',
    [referencia, institucionDelPedido()]
  );

  if (!pago) throw new ErrorVisible('Pago no encontrado.', 404);
  const respuesta = { referencia: pago.referencia, estado: pago.estado, plan: pago.plan };
  if (pago.estado !== ESTADOS_PAGO.PENDIENTE) {
    consultas.delete(referencia);
    return respuesta;
  }

  const proveedor = pasarelaActiva();
  if (typeof proveedor.consultarEstado !== 'function' || !pago.identificador_externo) return respuesta;

  const registro = consultas.get(referencia) ?? { ultima: 0, usadas: 0 };
  const permitido = decidirConsulta({
    regla: proveedor.CONSULTA,
    edadMs: Date.now() - new Date(pago.creado_en).getTime(),
    ultima: registro.ultima,
    usadas: registro.usadas,
  });
  if (!permitido) return respuesta;
  consultas.set(referencia, { ultima: Date.now(), usadas: registro.usadas + 1 });
  try {
    const aviso = await proveedor.consultarEstado(pago.identificador_externo);
    if (!aviso.estado || aviso.estado === ESTADOS_PAGO.PENDIENTE || aviso.estado === pago.estado) return respuesta;
    await aplicarResultado({ referencia, estado: aviso.estado, usuarioId: null, aviso });
    await registrarAuditoria({ accion: `pago_${aviso.estado}`, detalle: `${referencia}: consulta del estado a la pasarela` });
    consultas.delete(referencia);
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
