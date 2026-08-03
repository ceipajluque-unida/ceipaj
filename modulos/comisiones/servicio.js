import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { institucionActual } from '../../servidor/contexto.js';

export const ESTADOS_COMISION = { PENDIENTE: 'pendiente', PAGADA: 'pagada' };

function institucionDelPedido() {
  const id = institucionActual();
  if (id === null) throw new ErrorVisible('Esta operación es de una institución.', 403);
  return id;
}

function resumirPorAliado(filas) {
  const porAliado = new Map();
  for (const fila of filas) {
    const acumulado = porAliado.get(fila.aliado_id) ?? { aliado_id: fila.aliado_id, aliado: fila.aliado, cantidad: 0, pendiente: 0, pagada: 0 };
    acumulado.cantidad += 1;
    acumulado[fila.estado] += Number(fila.monto);
    porAliado.set(fila.aliado_id, acumulado);
  }
  return [...porAliado.values()];
}

export async function listarComisiones() {
  const [filas] = await bd.query(
    `SELECT c.id, c.aliado_id, u.nombre AS aliado, a.institucion, l.nombre AS lead,
            c.monto, c.estado, c.creado_en, c.actualizado_en
       FROM comisiones c
       JOIN aliados a ON a.id = c.aliado_id
       JOIN usuarios u ON u.id = a.usuario_id
       JOIN leads l ON l.id = c.lead_id
      WHERE a.institucion_id = ?
      ORDER BY c.creado_en DESC`,
    [institucionDelPedido()]
  );
  return { comisiones: filas, resumen: resumirPorAliado(filas) };
}

export async function pagarComision(id, usuario, ip) {
  const institucionId = institucionDelPedido();
  const [actualizacion] = await bd.query(
    `UPDATE comisiones c JOIN aliados a ON a.id = c.aliado_id
        SET c.estado = ?
      WHERE c.id = ? AND c.estado = ? AND a.institucion_id = ?`,
    [ESTADOS_COMISION.PAGADA, id, ESTADOS_COMISION.PENDIENTE, institucionId]
  );
  if (actualizacion.affectedRows === 0) {
    const [[existe]] = await bd.query(
      'SELECT c.id FROM comisiones c JOIN aliados a ON a.id = c.aliado_id WHERE c.id = ? AND a.institucion_id = ?',
      [id, institucionId]
    );
    if (!existe) throw new ErrorVisible('Comisión no encontrada.', 404);
    throw new ErrorVisible('Esa comisión ya está pagada.', 409);
  }
  await registrarAuditoria({ usuarioId: usuario.id, accion: 'comision_pagada', detalle: `comisión ${id}`, ip });
  return { id, estado: ESTADOS_COMISION.PAGADA };
}
