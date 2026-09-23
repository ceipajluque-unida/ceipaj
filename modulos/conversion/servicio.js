import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { ACADEMICO, ESTADOS_LEAD } from '../../configuracion/ajustes.js';
import { normalizarCedula } from '../../comun/validar.js';
import { concretarMatricula } from '../leads/servicio.js';
import { motivoDeBloqueo } from '../leads/estados.js';
import { conInstitucion, institucionActual } from '../../servidor/contexto.js';
import { planEnVigor, moduloIncluido } from '../suscripciones/plan.js';
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
  const omitidos = [];
  let coincidencias = 0;
  for (const matriculado of matriculados) {
    const cedula = normalizarCedula(matriculado.cedula);

    const [[lead]] = await bd.query(
      'SELECT id, nombre, activo, consentimiento_revocado_en FROM leads WHERE cedula = ? AND estado <> ? AND institucion_id = ?',
      [cedula, ESTADOS_LEAD.MATRICULADO, institucionId]
    );
    if (!lead) continue;
    coincidencias += 1;
    // figura en el academico, pero aca esta dado de baja: no se matricula ni genera comision
    if (motivoDeBloqueo(lead)) {
      omitidos.push({
        nombre: lead.nombre,
        cedula,
        motivo: lead.consentimiento_revocado_en ? 'revocó la autorización de sus datos' : 'está dado de baja',
      });
      continue;
    }
    try {
      await concretarMatricula(lead.id, matriculado.fecha_inscripcion, usuarioId, ip);
      convertidos.push({ nombre: lead.nombre, cedula });
    } catch (error) {
      omitidos.push({ nombre: lead.nombre, cedula, motivo: error.estadoHttp ? error.message : 'no se pudo matricular' });
      if (!error.estadoHttp) console.error(`Conversión omitida para el lead ${lead.id}:`, error.message);
    }
  }
  await registrarAuditoria({
    usuarioId,
    accion: 'sincronizacion_academico',
    detalle: `${matriculados.length} en el académico, ${coincidencias} coincidencias, ${convertidos.length} convertidos`
      + (omitidos.length ? `, ${omitidos.length} sin matricular por estar dados de baja` : ''),
    ip,
  });
  return { enAcademico: matriculados.length, coincidencias, convertidos, omitidos };
}

export function iniciarSincronizacionAutomatica() {
  if (ACADEMICO.MINUTOS_SINCRONIZACION <= 0) return;
  setInterval(async () => {
    try {
      const [instituciones] = await bd.query('SELECT id FROM instituciones WHERE activo = 1');
      for (const institucion of instituciones) {
        await conInstitucion(institucion.id, async () => {
          // el cruce automático respeta el plan: sin la sección de conversión no convierte
          if (!moduloIncluido(await planEnVigor(), 'conversion')) return;
          await sincronizar(null, 'automatica');
        });
      }
    } catch (error) {
      console.error('Falló la sincronización automática:', error.message);
    }
  }, ACADEMICO.MINUTOS_SINCRONIZACION * 60 * 1000);
}
