import { bd } from './bd/conexion.js';
import { institucionActual } from './contexto.js';

export async function registrarAuditoria({ usuarioId = null, accion, detalle = null, ip = null }) {
  try {
    await bd.query(
      'INSERT INTO auditoria (usuario_id, accion, detalle, direccion_ip, institucion_id) VALUES (?, ?, ?, ?, ?)',
      [usuarioId, accion, detalle, ip, institucionActual()]
    );
  } catch (error) {
    console.error('No se pudo registrar auditoría:', error.message);
  }
}
