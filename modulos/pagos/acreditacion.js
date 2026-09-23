import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { institucionActual, conInstitucion } from '../../servidor/contexto.js';
import { ESTADOS_PAGO, PASARELA } from '../../configuracion/ajustes.js';
import { pasarelaActiva } from './proveedor.js';
import { enviarReciboDePago } from './reciboCorreo.js';
import { activarPorPago } from '../suscripciones/servicio.js';

function institucionDelPedido() {
  const id = institucionActual();
  if (id === null) throw new ErrorVisible('Esta operación es de una institución.', 403);
  return id;
}

function guardarDatosDelPago(conexion, referencia, aviso = {}) {
  return conexion.query(
    `UPDATE pagos SET fecha_pago = COALESCE(?, fecha_pago, NOW()),
            forma_pago_externa = COALESCE(?, forma_pago_externa),
            comprobante_externo = COALESCE(?, comprobante_externo),
            pagador_nombre = COALESCE(?, pagador_nombre),
            pagador_documento = COALESCE(?, pagador_documento)
      WHERE referencia = ?`,
    [aviso.fechaPago ?? null, aviso.formaPago ?? null, aviso.comprobante ?? null,
     aviso.pagadorNombre ?? null, aviso.pagadorDocumento ?? null, referencia]
  );
}

// el monto se compara en los tres caminos que acreditan (aviso, consulta y
// conciliacion), siempre que la pasarela lo informe
async function exigirMontoCorrecto(conexion, referencia, aviso, ip) {
  if (!Number.isFinite(Number(aviso?.monto))) return;
  const [[registrado]] = await conexion.query('SELECT monto FROM pagos WHERE referencia = ? FOR UPDATE', [referencia]);
  if (registrado && Number(registrado.monto) !== Number(aviso.monto)) {
    await registrarAuditoria({
      accion: 'pago_monto_no_coincide',
      detalle: `${referencia}: se esperaban ${registrado.monto} y la pasarela informó ${aviso.monto}`,
      ip,
    });
    throw new ErrorVisible('El monto que informó la pasarela no coincide con el del pago, así que no se acredita.', 409);
  }
}

export async function aplicarResultado({ referencia, estado, usuarioId, aviso }, ip) {
  const conexion = await bd.getConnection();
  let pago;
  try {
    await conexion.beginTransaction();
    if (estado === ESTADOS_PAGO.EXITOSO) await exigirMontoCorrecto(conexion, referencia, aviso, ip);

    const [actualizacion] = await conexion.query(
      'UPDATE pagos SET estado = ? WHERE referencia = ? AND estado <> ?',
      [estado, referencia, ESTADOS_PAGO.EXITOSO]
    );
    if (actualizacion.affectedRows === 0) {
      await conexion.rollback();
      throw new ErrorVisible('Pago no encontrado o ya procesado.', 404);
    }
    if (estado === ESTADOS_PAGO.EXITOSO) await guardarDatosDelPago(conexion, referencia, aviso);

    const [filas] = await conexion.query(
      'SELECT id, plan, monto, institucion_id FROM pagos WHERE referencia = ?', [referencia]
    );
    pago = filas[0];
    if (estado === ESTADOS_PAGO.EXITOSO && pago?.plan) {
      await activarPorPago(
        { pagoId: pago.id, institucionId: pago.institucion_id, plan: pago.plan, monto: pago.monto, usuarioId },
        ip, conexion
      );
    }
    await conexion.commit();
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }

  // el recibo sale con el cobro ya confirmado y sin esperarlo: el aviso de la pasarela
  // necesita respuesta rápida y el correo no puede demorar ni revertir la acreditación
  if (estado === ESTADOS_PAGO.EXITOSO && pago) {
    conInstitucion(pago.institucion_id, () => enviarReciboDePago(pago.id, usuarioId, ip));
  }
  return { referencia, estado, plan: pago?.plan ?? null };
}

export async function procesarNotificacion(cuerpo, ip, req) {
  const proveedor = pasarelaActiva();
  if (typeof proveedor.verificarNotificacion !== 'function') {
    throw new ErrorVisible('El proveedor activo no recibe notificaciones.', 400);
  }
  const aviso = proveedor.verificarNotificacion(cuerpo, req);
  if (!aviso) {
    await registrarAuditoria({ accion: 'pago_notificacion_invalida', detalle: 'firma incorrecta', ip });
    throw new ErrorVisible('Notificación no válida.', 401);
  }
  if (aviso.ignorar) return { referencia: null, estado: null };

  const [[pago]] = await bd.query(
    'SELECT referencia, estado, monto FROM pagos WHERE identificador_externo = ?',
    [aviso.identificadorExterno]
  );

  if (!pago) {
    await registrarAuditoria({ accion: 'pago_notificacion_desconocida', detalle: aviso.identificadorExterno, ip });
    return { referencia: null, estado: null };
  }

  const sinCambios = aviso.estado === ESTADOS_PAGO.PENDIENTE
    || pago.estado === ESTADOS_PAGO.EXITOSO
    || pago.estado === aviso.estado;
  if (sinCambios) return { referencia: pago.referencia, estado: pago.estado };

  if (aviso.estado === ESTADOS_PAGO.EXITOSO && Number(pago.monto) !== Number(aviso.monto)) {
    await registrarAuditoria({ accion: 'pago_monto_no_coincide', detalle: pago.referencia, ip });
    throw new ErrorVisible('El monto informado no coincide con el del pago.', 409);
  }

  const datos = await aplicarResultado({ referencia: pago.referencia, estado: aviso.estado, usuarioId: null, aviso }, ip);
  await registrarAuditoria({ accion: `pago_${aviso.estado}`, detalle: `${pago.referencia}: aviso del proveedor`, ip });
  return datos;
}

const ultimaConciliacion = new Map();

export async function conciliarPendientes(ip) {
  const institucionId = institucionDelPedido();
  const proveedor = pasarelaActiva();
  if (typeof proveedor.consultarEstado !== 'function') return { revisados: 0, actualizados: 0 };

  const esperaMs = PASARELA.MINUTOS_ENTRE_CONCILIACIONES * 60000;
  const falta = (ultimaConciliacion.get(institucionId) ?? 0) + esperaMs - Date.now();
  if (falta > 0) {
    throw new ErrorVisible(`Recién se conciliaron los pagos. Probá de nuevo en ${Math.ceil(falta / 60000)} minuto(s).`, 429);
  }
  ultimaConciliacion.set(institucionId, Date.now());

  const soloPendientes = proveedor.RECHAZO_ES_FINAL === true;
  const [porRevisar] = await bd.query(
    `SELECT referencia, estado, identificador_externo FROM pagos
      WHERE institucion_id = ? AND estado ${soloPendientes ? '= ?' : '<> ?'} AND identificador_externo IS NOT NULL
      ORDER BY creado_en DESC LIMIT ?`,
    [institucionId, soloPendientes ? ESTADOS_PAGO.PENDIENTE : ESTADOS_PAGO.EXITOSO, PASARELA.MAXIMO_POR_CONCILIACION]
  );
  let actualizados = 0;
  for (const pago of porRevisar) {
    try {
      const aviso = await proveedor.consultarEstado(pago.identificador_externo);
      // sin un estado conocido no se toca el pago: si no, queda con el estado vacío
      if (!aviso.estado || aviso.estado === pago.estado || aviso.estado === ESTADOS_PAGO.PENDIENTE) continue;
      await aplicarResultado({ referencia: pago.referencia, estado: aviso.estado, usuarioId: null, aviso }, ip);
      await registrarAuditoria({ accion: `pago_conciliado_${aviso.estado}`, detalle: pago.referencia, ip });
      actualizados += 1;
    } catch (error) {
      console.error('conciliación de pagos:', error.message);
    }
  }

  const [[{ pendientes }]] = await bd.query(
    `SELECT COUNT(*) AS pendientes FROM pagos
      WHERE institucion_id = ? AND estado ${soloPendientes ? '= ?' : '<> ?'} AND identificador_externo IS NOT NULL`,
    [institucionId, soloPendientes ? ESTADOS_PAGO.PENDIENTE : ESTADOS_PAGO.EXITOSO]
  );
  return { revisados: porRevisar.length, actualizados, sinRevisar: Math.max(0, pendientes - porRevisar.length) };
}
