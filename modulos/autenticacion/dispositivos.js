// equipos de confianza donde no se vuelve a pedir el código, se guarda solo el hash del token
import crypto from 'node:crypto';
import { bd } from '../../servidor/bd/conexion.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { SEGURIDAD } from '../../configuracion/ajustes.js';

const hashear = (token) => crypto.createHash('sha256').update(String(token ?? '')).digest('hex');

function diasDeVigencia() {
  return ajustes.leerNumero('DIAS_DISPOSITIVO_CONFIANZA', SEGURIDAD.DIAS_DISPOSITIVO_CONFIANZA);
}

// del user-agent sale un nombre reconocible para que el usuario sepa cuál borrar
export function nombrarEquipo(userAgent = '') {
  const navegador = /Edg/i.test(userAgent) ? 'Edge'
    : /OPR|Opera/i.test(userAgent) ? 'Opera'
    : /Chrome/i.test(userAgent) ? 'Chrome'
    : /Firefox/i.test(userAgent) ? 'Firefox'
    : /Safari/i.test(userAgent) ? 'Safari'
    : 'Navegador';
  const sistema = /Windows/i.test(userAgent) ? 'Windows'
    : /Android/i.test(userAgent) ? 'Android'
    : /iPhone|iPad/i.test(userAgent) ? 'iOS'
    : /Mac OS/i.test(userAgent) ? 'Mac'
    : /Linux/i.test(userAgent) ? 'Linux'
    : 'equipo';
  return `${navegador} en ${sistema}`;
}

export async function recordar(usuarioId, userAgent) {
  const token = crypto.randomBytes(32).toString('hex');
  await bd.query(
    'INSERT INTO dispositivos_confianza (usuario_id, token_hash, nombre, vence) VALUES (?, ?, ?, NOW() + INTERVAL ? DAY)',
    [usuarioId, hashear(token), nombrarEquipo(userAgent), diasDeVigencia()]
  );
  return token;
}

// devuelve true solo si el token es de ese usuario y no venció
export async function esDeConfianza(usuarioId, token) {
  if (!token) return false;
  const [[fila]] = await bd.query(
    'SELECT id FROM dispositivos_confianza WHERE usuario_id = ? AND token_hash = ? AND vence > NOW()',
    [usuarioId, hashear(token)]
  );
  if (!fila) return false;
  await bd.query('UPDATE dispositivos_confianza SET ultimo_uso = NOW() WHERE id = ?', [fila.id]);
  return true;
}

export async function listar(usuarioId) {
  const [filas] = await bd.query(
    `SELECT id, nombre, creado_en, ultimo_uso, vence FROM dispositivos_confianza
      WHERE usuario_id = ? AND vence > NOW() ORDER BY creado_en DESC`,
    [usuarioId]
  );
  return filas;
}

export async function olvidar(usuarioId, id) {
  const [resultado] = await bd.query(
    'DELETE FROM dispositivos_confianza WHERE id = ? AND usuario_id = ?',
    [id, usuarioId]
  );
  return resultado.affectedRows > 0;
}

// si la cuenta estuvo comprometida, los equipos recordados dejan de valer
export async function olvidarTodos(usuarioId) {
  await bd.query('DELETE FROM dispositivos_confianza WHERE usuario_id = ?', [usuarioId]);
}
