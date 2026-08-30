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
      WHERE institucion_id = ? AND estado = ? AND fecha_inicio <= fecha_fin
        AND fecha_inicio <= NOW() AND fecha_fin > NOW()
      ORDER BY fecha_fin DESC, id DESC LIMIT 1`,
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

function creditoSinUsar(vigente, precioDeLista) {
  if (!vigente) return 0;
  const totales = Number(vigente.dias_totales) || 0;
  if (totales <= 0) return 0;
  const restantes = Math.min(totales, Math.max(0, Number(vigente.dias_restantes) || 0));
  const base = Number(precioDeLista ?? vigente.monto);
  return Math.floor((base * restantes) / totales);
}

export async function calcularCambio(claveDestino) {
  const destino = await buscarPlan(claveDestino);
  if (!destino) throw new ErrorVisible('Elegí un plan válido.');
  const vigente = await suscripcionVigente();

  if (!vigente) {
    return { tipo: 'alta', plan: destino.valor, texto: destino.texto, precio: destino.precio, aPagar: destino.precio, credito: 0, desde: null };
  }

  const actual = await buscarPlan(vigente.plan);
  const precioActual = Number(actual?.precio ?? vigente.monto);
  const credito = creditoSinUsar(vigente, precioActual);

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

  // mientras haya un plan vigente solo se sube. bajar obligaria a devolver plata
  // o a recortar un periodo ya pagado, y ninguna de las dos cosas hace el sistema.
  return {
    tipo: 'no_permitido', plan: destino.valor, texto: destino.texto, precio: destino.precio,
    aPagar: 0, credito: 0, desde: null,
    diasRestantes: vigente.dias_restantes, planActual: actual?.texto ?? vigente.plan,
    motivo: `El plan ${destino.texto} es más económico que el ${actual?.texto ?? vigente.plan}, que está vigente `
      + `hasta el vencimiento. Se puede pasar a un plan superior cuando quieras; para bajar, esperá a que `
      + `termine el período contratado.`,
  };
}

// cada periodo informa su situacion real: decirles "Activa" a todos confunde
// cuando conviven varios. el orden de las reglas importa y va de lo mas
// especifico a lo mas general.
function conSituacion(filas) {
  const ahora = Date.now();
  const momento = (valor) => new Date(valor).getTime();
  const coherente = (f) => momento(f.fecha_inicio) <= momento(f.fecha_fin);

  const enVigencia = filas.filter((f) => f.estado === ESTADOS_SUSCRIPCION.ACTIVA && coherente(f)
    && momento(f.fecha_inicio) <= ahora && momento(f.fecha_fin) > ahora);
  const rige = enVigencia.sort((a, b) => momento(b.fecha_fin) - momento(a.fecha_fin))[0];

  return filas.map((f) => {
    // un periodo que empieza despues de terminar es un dato roto, no una situacion:
    // se avisa en vez de imprimir un rango al reves como si nada
    if (!coherente(f)) return { ...f, situacion: 'inconsistente' };
    if (f.motivo_cierre === 'cambio_de_plan') return { ...f, situacion: 'reemplazada' };
    if (f.motivo_cierre === 'baja') return { ...f, situacion: 'dada_de_baja' };
    if (f.estado !== ESTADOS_SUSCRIPCION.ACTIVA) return { ...f, situacion: 'vencida' };
    if (momento(f.fecha_inicio) > ahora) return { ...f, situacion: 'programada' };
    if (momento(f.fecha_fin) <= ahora) return { ...f, situacion: 'vencida' };
    return { ...f, situacion: rige && rige.id === f.id ? 'en_curso' : 'cubierta' };
  });
}

export async function listarSuscripciones() {
  const [filas] = await bd.query(
    `SELECT s.id, s.plan, s.estado, s.monto, s.fecha_inicio, s.fecha_fin,
            s.cancelada_en, s.motivo_cierre, s.baja_en, s.motivo_baja,
            u.nombre AS baja_por_nombre, p.referencia, p.estado AS estado_pago
       FROM suscripciones s
       LEFT JOIN pagos p ON p.id = s.pago_id
       LEFT JOIN usuarios u ON u.id = s.baja_por
      WHERE s.institucion_id = ?
      ORDER BY s.fecha_inicio DESC, s.id DESC LIMIT 50`,
    [institucionDelPedido()]
  );
  // lo que importa va arriba: el que rige hoy, despues lo que todavia puede
  // pasar, y al final el historial cerrado. ordenar solo por fecha dejaba el
  // periodo vigente fuera de la primera pagina.
  const PRIORIDAD = { en_curso: 0, programada: 1, cubierta: 2, inconsistente: 3 };
  return conSituacion(filas).sort((a, b) => {
    const pa = PRIORIDAD[a.situacion] ?? 9;
    const pb = PRIORIDAD[b.situacion] ?? 9;
    if (pa !== pb) return pa - pb;
    return new Date(b.fecha_inicio) - new Date(a.fecha_inicio) || b.id - a.id;
  });
}

export async function activarPorPago({ pagoId, institucionId, plan, monto, usuarioId }, ip, conexion = bd) {
  if (!institucionId) {
    throw new ErrorVisible(
      'El pago se registró, pero no se pudo activar la suscripción porque no quedó asociado a ninguna '
      + 'institución. Avisale al proveedor con el número de comprobante: el cobro está hecho y la '
      + 'suscripción se activa a mano.',
      409
    );
  }
  const [existe] = await conexion.query('SELECT id FROM suscripciones WHERE pago_id = ?', [pagoId]);
  if (existe.length > 0) return existe[0];

  const [[planFila]] = await conexion.query('SELECT meses FROM planes WHERE clave = ?', [plan]);
  const meses = Number(planFila?.meses) || mesesPorDefecto();

  const [vigentes] = await conexion.query(
    `SELECT id, plan, monto, fecha_fin FROM suscripciones
      WHERE institucion_id = ? AND estado = ? AND fecha_inicio <= NOW() AND fecha_fin > NOW()
      ORDER BY fecha_fin DESC, id DESC LIMIT 1`,
    [institucionId, ESTADOS_SUSCRIPCION.ACTIVA]
  );
  const enCurso = vigentes[0];

  let desde = enCurso?.fecha_fin ?? new Date();
  if (enCurso && enCurso.plan !== plan && Number(monto) > 0) {
    const [[planNuevo]] = await conexion.query('SELECT precio FROM planes WHERE clave = ?', [plan]);
    const [[planViejo]] = await conexion.query('SELECT precio FROM planes WHERE clave = ?', [enCurso.plan]);
    if (Number(planNuevo?.precio ?? 0) > Number(planViejo?.precio ?? 0)) {
      await conexion.query(
        `UPDATE suscripciones SET estado = ?, fecha_fin = GREATEST(fecha_inicio, NOW()),
                motivo_cierre = 'cambio_de_plan'
          WHERE id = ?`,
        [ESTADOS_SUSCRIPCION.CANCELADA, enCurso.id]
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
    usuarioId, accion: 'suscripcion_activada', detalle: `${plan}, ${meses} mes(es)`, ip,
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

// corta el periodo en el acto, sin esperar a su fecha de fin. es distinto de
// cancelar: aca la institucion cae al plan minimo enseguida, asi que solo lo
// hace el proveedor y siempre con un motivo, que queda en la auditoria.
export async function darDeBajaAhora(id, motivo, usuario, ip) {
  const razon = String(motivo ?? '').trim().slice(0, 200);
  if (!razon) throw new ErrorVisible('Escribí por qué se da de baja: queda registrado.');

  const institucionId = institucionDelPedido();
  const [resultado] = await bd.query(
    `UPDATE suscripciones SET estado = ?, fecha_fin = GREATEST(fecha_inicio, NOW()),
            cancelada_en = COALESCE(cancelada_en, NOW()),
            motivo_cierre = 'baja', baja_en = NOW(), baja_por = ?, motivo_baja = ?
      WHERE id = ? AND institucion_id = ? AND estado = ?`,
    [ESTADOS_SUSCRIPCION.CANCELADA, usuario.id, razon, id, institucionId, ESTADOS_SUSCRIPCION.ACTIVA]
  );
  if (resultado.affectedRows === 0) throw new ErrorVisible('La suscripción no existe o ya no estaba activa.', 404);

  await registrarAuditoria({
    usuarioId: usuario.id, accion: 'suscripcion_dada_de_baja', detalle: `suscripción ${id}: ${razon}`, ip,
  });
  limpiarCachePlan(institucionId);
  return { id, fechaFin: new Date() };
}

export async function marcarVencidas() {
  const [resultado] = await bd.query(
    `UPDATE suscripciones SET estado = ?, motivo_cierre = 'vencimiento'
      WHERE estado = ? AND fecha_fin <= NOW()`,
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
