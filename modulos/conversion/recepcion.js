import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { validarCedula, normalizarCedula } from '../../comun/validar.js';
import { leerFechaDelDia } from '../../comun/fechas.js';
import { ACADEMICO } from '../../configuracion/ajustes.js';
import { conInstitucion, institucionActual } from '../../servidor/contexto.js';
import { timingSafeEqual } from 'node:crypto';

const MAXIMO_POR_ENVIO = 500;

function coincide(recibida, esperada) {
  if (!esperada) return false;
  const a = Buffer.from(String(recibida ?? ''));
  const b = Buffer.from(String(esperada));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function exigirClave(req, res, siguiente) {
  const recibida = req.get('X-API-Key') ?? String(req.get('Authorization') ?? '').replace(/^Bearer /i, '');
  const [claves] = await bd.query(
    "SELECT institucion_id, valor FROM ajustes_sistema WHERE clave = 'ACADEMICO_CLAVE_ENTRADA' AND valor <> ''"
  );
  const porDefecto = ACADEMICO.CLAVE_ENTRADA;
  if (claves.length === 0 && !porDefecto) {
    return siguiente(new ErrorVisible('La API de matriculados está cerrada: falta cargar su clave en Configuración.', 503));
  }

  let acerto = coincide(recibida, porDefecto);
  const dueñas = [];
  for (const fila of claves) {
    if (coincide(recibida, fila.valor)) {
      acerto = true;
      dueñas.push(fila.institucion_id);
    }
  }
  if (!acerto) return siguiente(new ErrorVisible('Clave de API incorrecta.', 401));

  if (dueñas.length > 1) {
    return siguiente(new ErrorVisible('Esa clave está repetida en más de una institución: pedí que la cambien.', 409));
  }

  if (dueñas.length === 0) {
    return siguiente(new ErrorVisible(
      'La API de matriculados está cerrada: falta cargar su clave en la Configuración de la institución.',
      503
    ));
  }

  return conInstitucion(dueñas[0], siguiente);
}

export async function recibirMatriculados(cuerpo, ip) {
  const lista = Array.isArray(cuerpo?.matriculados) ? cuerpo.matriculados : null;
  if (!lista) throw new ErrorVisible('Se espera un objeto con la lista "matriculados".');
  if (lista.length === 0) throw new ErrorVisible('La lista vino vacía.');
  if (lista.length > MAXIMO_POR_ENVIO) {
    throw new ErrorVisible(`Como máximo ${MAXIMO_POR_ENVIO} matriculados por envío.`);
  }

  const rechazados = [];
  let guardados = 0;
  for (const [indice, fila] of lista.entries()) {
    const cedula = fila?.cedula;
    const nombre = String(fila?.nombre ?? '').trim();
    if (!validarCedula(cedula)) {
      rechazados.push({ posicion: indice, motivo: `cédula no válida (${cedula ?? 'vacía'})` });
      continue;
    }
    if (!nombre) {
      rechazados.push({ posicion: indice, motivo: 'falta el nombre' });
      continue;
    }
    const inscripcion = leerFechaDelDia(fila?.fecha_inscripcion);
    if (inscripcion && inscripcion > new Date()) {
      rechazados.push({ posicion: indice, motivo: 'la fecha de inscripción todavía no llegó' });
      continue;
    }
    await bd.query(
      `INSERT INTO academico_matriculados (cedula, nombre, fecha_inscripcion, origen, institucion_id)
       VALUES (?, ?, COALESCE(?, NOW()), 'api', ?)
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), fecha_inscripcion = VALUES(fecha_inscripcion), importado_en = NOW()`,
      [normalizarCedula(cedula), nombre.slice(0, 100), inscripcion, institucionActual()]
    );
    guardados += 1;
  }

  await registrarAuditoria({
    accion: 'academico_recepcion',
    detalle: `${guardados} guardados, ${rechazados.length} rechazados`,
    ip,
  });
  return { recibidos: lista.length, guardados, rechazados };
}
