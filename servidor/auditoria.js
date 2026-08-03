// guarda quién hizo qué, cuándo y desde qué ip.
import { bd } from './bd/conexion.js';
import { institucionActual } from './contexto.js';

export async function registrarAuditoria({ usuarioId = null, accion, detalle = null, ip = null }) {
  // si falla la auditoría no debe tumbar la operación, solo se avisa
  try {
    // la institución sale del contexto del pedido; en null quedan las acciones del
    // proveedor y las que ocurren sin sesión, que solo ve el superadministrador
    await bd.query(
      'INSERT INTO auditoria (usuario_id, accion, detalle, direccion_ip, institucion_id) VALUES (?, ?, ?, ?, ?)',
      [usuarioId, accion, detalle, ip, institucionActual()]
    );
  } catch (error) {
    console.error('No se pudo registrar auditoría:', error.message);
  }
}
