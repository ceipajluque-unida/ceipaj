import { bd } from '../../../servidor/bd/conexion.js';
import { ErrorVisible } from '../../../servidor/errores.js';
import { validarCedula, normalizarCedula } from '../../../comun/validar.js';

const COLUMNAS_ESPERADAS = 'cedula;nombre;fecha_inscripcion';
const MAXIMO_FILAS = 2000;

export async function listarMatriculados(institucionId) {
  const [filas] = await bd.query(
    `SELECT cedula, nombre, fecha_inscripcion FROM academico_matriculados
      WHERE institucion_id = ?
      ORDER BY fecha_inscripcion DESC`,
    [institucionId]
  );
  return filas;
}

function separar(linea) {
  const separador = linea.includes(';') ? ';' : ',';
  return linea.split(separador).map((celda) => celda.trim().replace(/^"|"$/g, ''));
}

function interpretarFecha(texto) {
  if (!texto) return null;
  const partido = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (partido) return `${partido[3]}-${partido[2].padStart(2, '0')}-${partido[1].padStart(2, '0')}`;
  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString().slice(0, 10);
}

export async function importar(contenido, institucionId) {
  const texto = String(contenido ?? '').replace(/^﻿/, '').trim();
  if (!texto) throw new ErrorVisible('El archivo está vacío.');

  const lineas = texto.split(/\r?\n/).filter((linea) => linea.trim());

  const primera = separar(lineas[0]).join(';').toLowerCase();
  const filas = primera.startsWith('cedula') ? lineas.slice(1) : lineas;
  if (filas.length === 0) throw new ErrorVisible(`La planilla no tiene datos. Se espera: ${COLUMNAS_ESPERADAS}`);
  if (filas.length > MAXIMO_FILAS) throw new ErrorVisible(`La planilla supera las ${MAXIMO_FILAS} filas.`);

  const rechazadas = [];
  let guardadas = 0;
  for (const [indice, linea] of filas.entries()) {
    const numeroLinea = indice + (primera.startsWith('cedula') ? 2 : 1);
    const [cedula, nombre, fecha] = separar(linea);

    if (!validarCedula(cedula)) {
      rechazadas.push({ linea: numeroLinea, motivo: `cédula no válida (${cedula || 'vacía'})` });
      continue;
    }
    if (!nombre) {
      rechazadas.push({ linea: numeroLinea, motivo: 'falta el nombre' });
      continue;
    }
    const inscripcion = interpretarFecha(fecha);

    await bd.query(
      `INSERT INTO academico_matriculados (cedula, nombre, fecha_inscripcion, origen, institucion_id)
       VALUES (?, ?, COALESCE(?, NOW()), 'csv', ?)
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), fecha_inscripcion = VALUES(fecha_inscripcion), importado_en = NOW()`,
      [normalizarCedula(cedula), nombre.slice(0, 100), inscripcion, institucionId]
    );
    guardadas += 1;
  }

  return { leidas: filas.length, guardadas, rechazadas };
}
