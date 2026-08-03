// suscripción de la institución: cada pago exitoso de un plan abre un período nuevo
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

// la suscripción es de una institución: quien pregunta sin institución no ve ninguna
function institucionDelPedido() {
  const id = institucionActual();
  if (id === null) throw new ErrorVisible('Esta operación es de una institución.', 403);
  return id;
}

// los planes viven en su propia tabla; acá solo se reexportan para no acoplar módulos
export async function listarPlanes() {
  return listarActivos();
}

export async function buscarPlan(valor) {
  return buscarActivo(valor);
}

// la vigente es la última activa que todavía no venció
export async function suscripcionVigente() {
  const [filas] = await bd.query(
    `SELECT id, plan, estado, monto, fecha_inicio, fecha_fin,
            DATEDIFF(fecha_fin, NOW()) AS dias_restantes
       FROM suscripciones
      WHERE institucion_id = ? AND estado = ? AND fecha_fin > NOW()
      ORDER BY fecha_fin DESC LIMIT 1`,
    [institucionDelPedido(), ESTADOS_SUSCRIPCION.ACTIVA]
  );
  const vigente = filas[0];
  if (!vigente) return null;
  const plan = await buscarPlan(vigente.plan);
  return { ...vigente, texto_plan: plan?.texto ?? vigente.plan, por_vencer: vigente.dias_restantes <= diasDeAviso() };
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

// si ya hay una suscripción vigente el período nuevo arranca al terminar la anterior.
// la institución llega por parámetro y no del contexto: al aviso de la pasarela lo
// atiende un pedido sin sesión, y la institución sale del pago que se está acreditando
export async function activarPorPago({ pagoId, institucionId, plan, monto, usuarioId }, ip, conexion = bd) {
  if (!institucionId) throw new ErrorVisible('El pago no tiene institución: no se puede activar la suscripción.', 409);
  const [existe] = await conexion.query('SELECT id FROM suscripciones WHERE pago_id = ?', [pagoId]);
  if (existe.length > 0) return existe[0]; // el aviso del proveedor puede repetirse

  const meses = mesesPorDefecto();
  // sin el filtro, el período nuevo se encadenaría después del vencimiento de otro colegio
  const [vigentes] = await conexion.query(
    `SELECT fecha_fin FROM suscripciones
      WHERE institucion_id = ? AND estado = ? AND fecha_fin > NOW()
      ORDER BY fecha_fin DESC LIMIT 1`,
    [institucionId, ESTADOS_SUSCRIPCION.ACTIVA]
  );
  const desde = vigentes[0]?.fecha_fin ?? new Date();

  const [resultado] = await conexion.query(
    `INSERT INTO suscripciones (institucion_id, plan, estado, monto, fecha_inicio, fecha_fin, pago_id, creado_por)
     VALUES (?, ?, ?, ?, ?, DATE_ADD(?, INTERVAL ? MONTH), ?, ?)`,
    [institucionId, plan, ESTADOS_SUSCRIPCION.ACTIVA, monto, desde, desde, meses, pagoId, usuarioId ?? null]
  );
  // el aviso de la pasarela viene sin institución en el contexto: se la damos, si no
  // el movimiento queda fuera de la auditoría del colegio que pagó
  await conInstitucion(institucionId, () => registrarAuditoria({
    usuarioId, accion: 'suscripcion_activada', detalle: `${plan} · ${meses} mes(es)`, ip,
  }));
  limpiarCachePlan(institucionId); // el plan nuevo tiene que habilitar sus módulos en el acto
  return { id: resultado.insertId };
}

export async function cancelar(id, usuario, ip) {
  // la institución va también en el update: con el id de otra, no se cancela nada
  const [resultado] = await bd.query(
    'UPDATE suscripciones SET estado = ? WHERE id = ? AND institucion_id = ? AND estado = ?',
    [ESTADOS_SUSCRIPCION.CANCELADA, id, institucionDelPedido(), ESTADOS_SUSCRIPCION.ACTIVA]
  );
  if (resultado.affectedRows === 0) throw new ErrorVisible('La suscripción no existe o ya no está activa.', 404);
  await registrarAuditoria({ usuarioId: usuario.id, accion: 'suscripcion_cancelada', detalle: String(id), ip });
  limpiarCachePlan();
  return { id, estado: ESTADOS_SUSCRIPCION.CANCELADA };
}

// pasa a vencidas las que llegaron a su fecha de fin. va sin filtro a propósito: es la
// tarea periódica del servidor y le toca a todas las instituciones
export async function marcarVencidas() {
  const [resultado] = await bd.query(
    'UPDATE suscripciones SET estado = ? WHERE estado = ? AND fecha_fin <= NOW()',
    [ESTADOS_SUSCRIPCION.VENCIDA, ESTADOS_SUSCRIPCION.ACTIVA]
  );
  if (resultado.affectedRows > 0) limpiarCachePlan();
  return resultado.affectedRows;
}

// las que están por vencer, para el badge del menú y el aviso en pantalla
export async function contarPorVencer() {
  // el proveedor no contrata la plataforma, así que no tiene vencimiento que avisar
  const institucionId = institucionActual();
  if (institucionId === null) return 0;
  const [filas] = await bd.query(
    `SELECT COUNT(*) AS total FROM suscripciones
      WHERE institucion_id = ? AND estado = ? AND fecha_fin > NOW() AND fecha_fin <= DATE_ADD(NOW(), INTERVAL ? DAY)`,
    [institucionId, ESTADOS_SUSCRIPCION.ACTIVA, diasDeAviso()]
  );
  return Number(filas[0].total);
}

// control periódico del vencimiento, se arranca junto con el servidor
export function iniciarControlDeVencimientos() {
  const horas = SUSCRIPCION.HORAS_CONTROL_VENCIMIENTO;
  if (horas <= 0) return;
  setInterval(() => {
    marcarVencidas().catch((error) => console.error('control de suscripciones:', error.message));
  }, horas * 3600000);
}
