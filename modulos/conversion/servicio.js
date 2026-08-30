import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { ACADEMICO, ESTADOS_LEAD } from '../../configuracion/ajustes.js';
import { normalizarCedula } from '../../comun/validar.js';
import { concretarMatricula } from '../leads/servicio.js';
import { conInstitucion, institucionActual } from '../../servidor/contexto.js';
import * as csv from './academico/csv.js';

function institucionDelPedido() {
  const id = institucionActual();
  if (!id) throw new ErrorVisible('Esta operación es de una institución.', 403);
  return id;
}

export function listarMatriculados() {
  return csv.listarMatriculados(institucionDelPedido());
}

export async function importarPlanilla(contenido, usuarioId, ip) {
  const resumen = await csv.importar(contenido, institucionDelPedido());
  await registrarAuditoria({
    usuarioId,
    accion: 'academico_importado',
    detalle: `${resumen.leidas} leídas, ${resumen.guardadas} guardadas, ${resumen.rechazadas.length} rechazadas`,
    ip,
  });
  return resumen;
}

export async function sincronizar(usuarioId, ip) {
  const institucionId = institucionDelPedido();
  const matriculados = await csv.listarMatriculados(institucionId);
  const convertidos = [];
  let coincidencias = 0;
  for (const matriculado of matriculados) {
    const cedula = normalizarCedula(matriculado.cedula);

    const [[lead]] = await bd.query(
      'SELECT id, nombre FROM leads WHERE cedula = ? AND estado <> ? AND institucion_id = ?',
      [cedula, ESTADOS_LEAD.MATRICULADO, institucionId]
    );
    if (!lead) continue;
    coincidencias += 1;
    try {
      await concretarMatricula(lead.id, matriculado.fecha_inscripcion, usuarioId, ip);
      convertidos.push({ nombre: lead.nombre, cedula });
    } catch (error) {
      console.error(`Conversión omitida para el lead ${lead.id}:`, error.message);
    }
  }
  await registrarAuditoria({
    usuarioId,
    accion: 'sincronizacion_academico',
    detalle: `${matriculados.length} en el académico, ${coincidencias} coincidencias, ${convertidos.length} convertidos`,
    ip,
  });
  return { enAcademico: matriculados.length, coincidencias, convertidos };
}

export function iniciarSincronizacionAutomatica() {
  if (ACADEMICO.MINUTOS_SINCRONIZACION <= 0) return;
  setInterval(async () => {
    try {
      const [instituciones] = await bd.query('SELECT id FROM instituciones WHERE activo = 1');
      for (const institucion of instituciones) {
        await conInstitucion(institucion.id, () => sincronizar(null, 'automatica'));
      }
    } catch (error) {
      console.error('Falló la sincronización automática:', error.message);
    }
  }, ACADEMICO.MINUTOS_SINCRONIZACION * 60 * 1000);
}
