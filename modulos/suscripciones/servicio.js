import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { conInstitucion, institucionActual } from '../../servidor/contexto.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { PLANES_SUSCRIPCION, ESTADOS_SUSCRIPCION, SUSCRIPCION } from '../../configuracion/ajustes.js';
import { listarActivos, buscar as buscarActivo } from '../planes/servicio.js';
import { limpiarCachePlan } from './plan.js';

export function mesesPorDefecto() {
  return ajustes.leerNumero('MESES_SUSCRIPCION', PLANES_SUSCRIPCION[0].meses);
}

export function diasDeAviso() {
  return ajustes.leerNumero('DIAS_AVISO_VENCIMIENTO', SUSCRIPCION.DIAS_AVISO_VENCIMIENTO);
}

function institucionDelPedido() {
  const id = institucionActual();
  if (id === null) throw new ErrorVisible('Esta operación es de una institución.', 403);
  return id;
}

export async function listarPlanes() {
  return listarActivos();
}

export async function buscarPlan(valor) {
  return buscarActivo(valor);
}

export async function suscripcionVigente() {
  const [filas] = await bd.query(
    `SELECT id, plan, estado, monto, fecha_inicio, fecha_fin, cancelada_en,
            DATEDIFF(fecha_fin, NOW()) AS dias_restantes,
            DATEDIFF(fecha_fin, fecha_inicio) AS dias_totales
       FROM suscripciones
      WHERE institucion_id = ? AND estado = ? AND fecha_inicio <= NOW() AND fecha_fin > NOW()
      ORDER BY fecha_inicio DESC LIMIT 1`,
    [institucionDelPedido(), ESTADOS_SUSCRIPCION.ACTIVA]
  );
  const vigente = filas[0];
  if (!vigente) return null;
  const plan = await buscarPlan(vigente.plan);
  return {
    ...vigente,
    texto_plan: plan?.texto ?? vigente.plan,
    por_vencer: vigente.dias_restantes <= diasDeAviso(),

    renueva: !vigente.cancelada_en,
  };
}

function creditoSinUsar(vigente) {
  if (!vigente) return 0;
  const totales = Number(vigente.dias_totales) || 0;
  if (totales <= 0) return 0;

  const restantes = Math.min(totales, Math.max(0, Number(vigente.dias_restantes) || 0));
  return Math.floor((Number(vigente.monto) * restantes) / totales);
}

export async function calcularCambio(claveDestino) {
  const destino = await buscarPlan(claveDestino);
  if (!destino) throw new ErrorVisible('Elegí un plan válido.');
  const vigente = await suscripcionVigente();

  if (!vigente) {
    return { tipo: 'alta', plan: destino.valor, texto: destino.texto, precio: destino.precio, aPagar: destino.precio, credito: 0, desde: null };
  }

  const credito = creditoSinUsar(vigente);
  const actual = await buscarPlan(vigente.plan);
  const precioActual = Number(actual?.precio ?? vigente.monto);

  if (destino.valor === vigente.plan) {
    return {
      tipo: 'renovacion', plan: destino.valor, texto: destino.texto, precio: destino.precio,
      aPagar: destino.precio, credito: 0, desde: vigente.fecha_fin, diasRestantes: vigente.dias_restantes,
    };
  }

  if (destino.precio > precioActual) {
    return {
      tipo: 'mejora', plan: destino.valor, texto: destino.texto, precio: destino.precio,
      aPagar: Math.max(0, destino.precio - credito), credito, desde: null,
      diasRestantes: vigente.dias_restantes, planActual: actual?.texto ?? vigente.plan,
    };
  }

  const diasDelPeriodo = Math.max(1, Number(vigente.dias_totales) || 30);
  const diasQueCubre = destino.precio > 0
    ? Math.floor((credito * diasDelPeriodo) / destino.precio)
    : diasDelPeriodo;

  return {
    tipo: 'reduccion', plan: destino.valor, texto: destino.texto, precio: destino.precio,
    aPagar: 0, credito, desde: null, diasQueCubre,
    diasRestantes: vigente.dias_restantes, planActual: actual?.texto ?? vigente.plan,
  };
}

export async function aplicarReduccion(claveDestino, usuario, ip) {
  const cambio = await calcularCambio(claveDestino);
  if (cambio.tipo !== 'reduccion') {
    throw new ErrorVisible('Ese plan no es una baja de categoría: se contrata pagando.', 409);
  }
  if (cambio.diasQueCubre < 1) {
    throw new ErrorVisible('No queda saldo suficiente para cubrir un día del plan nuevo. Esperá al vencimiento o renová.', 409);
  }
  const institucionId = institucionDelPedido();
  const vigente = await suscripcionVigente();

  const conexion = await bd.getConnection();
  try {
    await conexion.beginTransaction();
    await conexion.query(
      'UPDATE suscripciones SET estado = ?, fecha_fin = NOW() WHERE id = ? AND institucion_id = ?',
      [ESTADOS_SUSCRIPCION.VENCIDA, vigente.id, institucionId]
    );
    await conexion.query(
      `INSERT INTO suscripciones (institucion_id, plan, estado, monto, fecha_inicio, fecha_fin, creado_por)
       VALUES (?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), ?)`,
      [institucionId, cambio.plan, ESTADOS_SUSCRIPCION.ACTIVA, cambio.credito, cambio.diasQueCubre, usuario.id]
    );
    await conexion.commit();
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }

  await registrarAuditoria({
    usuarioId: usuario.id,
    accion: 'suscripcion_reducida',
    detalle: `${vigente.plan} → ${cambio.plan}, saldo ${cambio.credito} por ${cambio.diasQueCubre} días`,
    ip,
  });
  limpiarCachePlan(institucionId);
  return { plan: cambio.plan, dias: cambio.diasQueCubre, credito: cambio.credito };
}

export async function listarSuscripciones() {
  const [filas] = await bd.query(
    `SELECT s.id, s.plan, s.estado, s.monto, s.fecha_inicio, s.fecha_fin, p.referencia
       FROM suscripciones s
       LEFT JOIN pagos p ON p.id = s.pago_id
      WHERE s.institucion_id = ?
      ORDER BY s.fecha_inicio DESC LIMIT 50`,
    [institucionDelPedido()]
  );
  return filas;
}

export async function activarPorPago({ pagoId, institucionId, plan, monto, usuarioId }, ip, conexion = bd) {
  if (!institucionId) throw new ErrorVisible('El pago no tiene institución: no se puede activar la suscripción.', 409);
  const [existe] = await conexion.query('SELECT id FROM suscripciones WHERE pago_id = ?', [pagoId]);
  if (existe.length > 0) return existe[0];

  const meses = mesesPorDefecto();

  const [vigentes] = await conexion.query(
    `SELECT id, plan, monto, fecha_fin FROM suscripciones
      WHERE institucion_id = ? AND estado = ? AND fecha_fin > NOW()
      ORDER BY fecha_fin DESC LIMIT 1`,
    [institucionId, ESTADOS_SUSCRIPCION.ACTIVA]
  );
  const enCurso = vigentes[0];

  let desde = enCurso?.fecha_fin ?? new Date();
  if (enCurso && enCurso.plan !== plan && Number(monto) > 0) {
    const [[planNuevo]] = await conexion.query('SELECT precio FROM planes WHERE clave = ?', [plan]);
    const [[planViejo]] = await conexion.query('SELECT precio FROM planes WHERE clave = ?', [enCurso.plan]);
    if (Number(planNuevo?.precio ?? 0) > Number(planViejo?.precio ?? 0)) {
      await conexion.query(
        'UPDATE suscripciones SET estado = ?, fecha_fin = NOW() WHERE id = ?',
        [ESTADOS_SUSCRIPCION.VENCIDA, enCurso.id]
      );
      desde = new Date();
    }
  }

  const [resultado] = await conexion.query(
    `INSERT INTO suscripciones (institucion_id, plan, estado, monto, fecha_inicio, fecha_fin, pago_id, creado_por)
     VALUES (?, ?, ?, ?, ?, DATE_ADD(?, INTERVAL ? MONTH), ?, ?)`,
    [institucionId, plan, ESTADOS_SUSCRIPCION.ACTIVA, monto, desde, desde, meses, pagoId, usuarioId ?? null]
  );

  await conInstitucion(institucionId, () => registrarAuditoria({
    usuarioId, accion: 'suscripcion_activada', detalle: `${plan} — ${meses} mes(es)`, ip,
  }));
  limpiarCachePlan(institucionId);
  return { id: resultado.insertId };
}

export async function cancelar(id, usuario, ip) {
  const [resultado] = await bd.query(
    `UPDATE suscripciones SET cancelada_en = NOW()
      WHERE id = ? AND institucion_id = ? AND estado = ? AND cancelada_en IS NULL`,
    [id, institucionDelPedido(), ESTADOS_SUSCRIPCION.ACTIVA]
  );
  if (resultado.affectedRows === 0) throw new ErrorVisible('La suscripción no existe, ya venció o ya estaba dada de baja.', 404);
  await registrarAuditoria({ usuarioId: usuario.id, accion: 'suscripcion_cancelada', detalle: String(id), ip });
  const vigente = await suscripcionVigente();
  return { id, renueva: false, fechaFin: vigente?.fecha_fin ?? null };
}

export async function marcarVencidas() {
  const [resultado] = await bd.query(
    'UPDATE suscripciones SET estado = ? WHERE estado = ? AND fecha_fin <= NOW()',
    [ESTADOS_SUSCRIPCION.VENCIDA, ESTADOS_SUSCRIPCION.ACTIVA]
  );
  if (resultado.affectedRows > 0) limpiarCachePlan();
  return resultado.affectedRows;
}

export async function contarPorVencer() {
  const institucionId = institucionActual();
  if (institucionId === null) return 0;
  const [filas] = await bd.query(
    `SELECT COUNT(*) AS total FROM suscripciones
      WHERE institucion_id = ? AND estado = ? AND fecha_fin > NOW() AND fecha_fin <= DATE_ADD(NOW(), INTERVAL ? DAY)`,
    [institucionId, ESTADOS_SUSCRIPCION.ACTIVA, diasDeAviso()]
  );
  return Number(filas[0].total);
}

export function iniciarControlDeVencimientos() {
  const horas = SUSCRIPCION.HORAS_CONTROL_VENCIMIENTO;
  if (horas <= 0) return;
  setInterval(() => {
    marcarVencidas().catch((error) => console.error('control de suscripciones:', error.message));
  }, horas * 3600000);
}
