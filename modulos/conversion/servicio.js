// lógica de conversión: cruza por cédula los matriculados del académico con los leads
import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { ACADEMICO, ESTADOS_LEAD } from '../../configuracion/ajustes.js';
import { normalizarCedula } from '../../comun/validar.js';
import { concretarMatricula } from '../leads/servicio.js';
import { conInstitucion, institucionActual } from '../../servidor/contexto.js';
import * as csv from './academico/csv.js';

// los matriculados son de la institución que los cargó: sin institución en el pedido no
// se devuelve nada, ni al proveedor del servicio, que no tiene por qué verlos (ley 7593)
function institucionDelPedido() {
  const id = institucionActual();
  if (!id) throw new ErrorVisible('Esta operación es de una institución.', 403);
  return id;
}

// el sistema no sale a buscar datos a ningún lado: los matriculados llegan por planilla
// o los empuja el académico a POST /api/conversion/matriculados
export function listarMatriculados() {
  return csv.listarMatriculados(institucionDelPedido());
}

// carga de la planilla que hoy hace las veces de la api del sistema académico
export async function importarPlanilla(contenido, usuarioId, ip) {
  const resumen = await csv.importar(contenido, institucionDelPedido());
  await registrarAuditoria({
    usuarioId,
    accion: 'academico_importado',
    detalle: `${resumen.leidas} leídas · ${resumen.guardadas} guardadas · ${resumen.rechazadas.length} rechazadas`,
    ip,
  });
  return resumen;
}

// por cada matriculado busca un lead con esa cédula sin matricular y lo convierte
export async function sincronizar(usuarioId, ip) {
  const institucionId = institucionDelPedido();
  const matriculados = await csv.listarMatriculados(institucionId);
  const convertidos = [];
  let coincidencias = 0;
  for (const matriculado of matriculados) {
    const cedula = normalizarCedula(matriculado.cedula);
    // el cruce va dentro de la institución: la misma cédula en otro colegio es otra
    // persona para el sistema y matricularla sería convertir a un interesado ajeno
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
      // un lead que no admite matricularse no frena al resto: se informa y se sigue
      console.error(`Conversión omitida para el lead ${lead.id}:`, error.message);
    }
  }
  await registrarAuditoria({
    usuarioId,
    accion: 'sincronizacion_academico',
    detalle: `${matriculados.length} en el académico · ${coincidencias} coincidencias · ${convertidos.length} convertidos`,
    ip,
  });
  return { enAcademico: matriculados.length, coincidencias, convertidos };
}

// sincronización periódica; con MINUTOS_SINCRONIZACION en 0 queda solo la manual.
// no hay pedido detrás, así que recorre institución por institución dentro de su
// propio contexto: si no, no sabría de quién son los matriculados que cruza
export function iniciarSincronizacionAutomatica() {
  if (ACADEMICO.MINUTOS_SINCRONIZACION <= 0) return;
  setInterval(async () => {
    try {
      const [instituciones] = await bd.query('SELECT id FROM instituciones WHERE activo = 1');
      for (const institucion of instituciones) {
        await conInstitucion(institucion.id, () => sincronizar(null, 'automatica'));
      }
    } catch (error) {
      // que una caída del académico no tumbe el servidor: reintenta al próximo ciclo
      console.error('Falló la sincronización automática:', error.message);
    }
  }, ACADEMICO.MINUTOS_SINCRONIZACION * 60 * 1000);
}
