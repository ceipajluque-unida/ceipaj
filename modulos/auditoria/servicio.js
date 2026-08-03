import { bd } from '../../servidor/bd/conexion.js';
import { institucionActual } from '../../servidor/contexto.js';

const POR_PAGINA = 20;

export async function listarAuditoria({ buscar = '', accion = '', pagina = 1 }) {
  const pag = Math.max(1, Number(pagina) || 1);
  const condiciones = [];
  const args = [];

  const institucionId = institucionActual();
  if (institucionId !== null) {
    condiciones.push('a.institucion_id = ?');
    args.push(institucionId);
  }
  if (buscar) {
    condiciones.push('(u.nombre LIKE ? OR a.detalle LIKE ?)');
    args.push(`%${buscar}%`, `%${buscar}%`);
  }
  if (accion) {
    condiciones.push('a.accion = ?');
    args.push(accion);
  }
  const donde = condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : '';

  const [[{ total }]] = await bd.query(
    `SELECT COUNT(*) AS total FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id ${donde}`,
    args
  );
  const [registros] = await bd.query(
    `SELECT a.id, a.accion, a.detalle, a.direccion_ip, a.fecha, u.nombre AS usuario
       FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id
       ${donde} ORDER BY a.fecha DESC LIMIT ? OFFSET ?`,
    [...args, POR_PAGINA, (pag - 1) * POR_PAGINA]
  );

  const [acciones] = await bd.query(
    `SELECT DISTINCT a.accion FROM auditoria a
      ${institucionId !== null ? 'WHERE a.institucion_id = ?' : ''} ORDER BY a.accion`,
    institucionId !== null ? [institucionId] : []
  );

  return {
    registros,
    total: Number(total),
    pagina: pag,
    paginas: Math.max(1, Math.ceil(Number(total) / POR_PAGINA)),
    acciones: acciones.map((fila) => fila.accion),
  };
}
