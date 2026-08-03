// api de entrada: el sistema académico EMPUJA sus matriculados acá.
// el sistema no sale a buscar datos a ningún lado, solo recibe.
import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { validarCedula, normalizarCedula } from '../../comun/validar.js';
import { ACADEMICO } from '../../configuracion/ajustes.js';
import { conInstitucion, institucionActual } from '../../servidor/contexto.js';
import { timingSafeEqual } from 'node:crypto';

const MAXIMO_POR_ENVIO = 500;

// comparación en tiempo constante, para no filtrar la clave por el tiempo de respuesta
function coincide(recibida, esperada) {
  if (!esperada) return false;
  const a = Buffer.from(String(recibida ?? ''));
  const b = Buffer.from(String(esperada));
  return a.length === b.length && timingSafeEqual(a, b);
}

// el académico no tiene sesión, así que la clave es lo que dice de qué institución
// viene el envío: se busca entre las claves cargadas y la que coincide manda.
export async function exigirClave(req, res, siguiente) {
  const recibida = req.get('X-API-Key') ?? String(req.get('Authorization') ?? '').replace(/^Bearer /i, '');
  const [claves] = await bd.query(
    "SELECT institucion_id, valor FROM ajustes_sistema WHERE clave = 'ACADEMICO_CLAVE_ENTRADA' AND valor <> ''"
  );
  const porDefecto = ACADEMICO.CLAVE_ENTRADA;
  if (claves.length === 0 && !porDefecto) {
    return siguiente(new ErrorVisible('La API de matriculados está cerrada: falta cargar su clave en Configuración.', 503));
  }
  // se recorren todas siempre, para que el tiempo de respuesta no delate cuál acertó
  let acerto = coincide(recibida, porDefecto);
  let institucionId = null;
  for (const fila of claves) {
    if (coincide(recibida, fila.valor)) {
      acerto = true;
      institucionId = fila.institucion_id;
    }
  }
  if (!acerto) return siguiente(new ErrorVisible('Clave de API incorrecta.', 401));

  // el resto del pedido corre dentro de la institución dueña de esa clave
  return conInstitucion(institucionId, siguiente);
}

// guarda lo que manda el académico. una fila mala no tumba el envío, se informa aparte
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
    const fecha = fila?.fecha_inscripcion ? new Date(fila.fecha_inscripcion) : null;
    const inscripcion = fecha && !Number.isNaN(fecha.getTime()) ? fecha.toISOString().slice(0, 10) : null;
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
