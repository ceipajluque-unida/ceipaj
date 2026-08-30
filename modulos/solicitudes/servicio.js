import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { ESTADOS_SOLICITUD, SOLICITUDES } from '../../configuracion/landing.js';

const CAMPOS = `id, nombre, institucion, correo, telefono, ciudad, motivo, plan, mensaje,
                estado, nota, direccion_ip, creado_en, atendida_en, atendida_por`;
const CAMPOS_S = CAMPOS.split(',').map((c) => 's.' + c.trim()).join(', ');

export async function listar({ estado, texto } = {}) {
  const condiciones = [];
  const valores = [];
  if (estado && estado !== 'todas') { condiciones.push('s.estado = ?'); valores.push(estado); }
  if (texto) {
    // sin escapar, un % o un _ escritos en la busqueda traerian cualquier cosa
    const patron = '%' + String(texto).replace(/[!%_]/g, (c) => '!' + c) + '%';
    condiciones.push("(s.nombre LIKE ? ESCAPE '!' OR s.correo LIKE ? ESCAPE '!' OR s.institucion LIKE ? ESCAPE '!')");
    valores.push(patron, patron, patron);
  }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await bd.query(
    `SELECT ${CAMPOS_S},
            u.nombre AS atendida_por_nombre,
            p.titulo AS plan_titulo
       FROM solicitudes s
       LEFT JOIN usuarios u ON u.id = s.atendida_por
       LEFT JOIN planes p ON p.clave = s.plan
       ${donde}
       ORDER BY s.creado_en DESC
       LIMIT ${SOLICITUDES.TOPE_LISTADO}`,
    valores
  );
  return filas;
}

export async function contarNuevas() {
  const [[fila]] = await bd.query("SELECT COUNT(*) AS total FROM solicitudes WHERE estado = 'nueva'");
  return Number(fila.total);
}

export async function obtener(id) {
  const [[fila]] = await bd.query(`SELECT ${CAMPOS} FROM solicitudes WHERE id = ?`, [id]);
  if (!fila) throw new ErrorVisible('La solicitud no existe.', 404);
  return fila;
}

export async function atender(id, cuerpo, usuario, ip) {
  const solicitud = await obtener(id);
  const estado = String(cuerpo?.estado ?? '').trim();
  if (!ESTADOS_SOLICITUD.some((e) => e.valor === estado)) {
    throw new ErrorVisible('El estado de la solicitud no es válido.');
  }
  // si no viene la nota, se deja la que ya tenía: guardar el estado no la borra
  const nota = cuerpo?.nota === undefined
    ? solicitud.nota
    : (String(cuerpo.nota).trim().slice(0, SOLICITUDES.LARGO_NOTA) || null);

  // el sello se pone al salir de nueva y se saca al volver, para que no quede
  // una solicitud sin atender con fecha de atención
  const sello = estado === 'nueva' ? 'NULL' : (solicitud.estado === 'nueva' ? 'NOW()' : 'atendida_en');
  await bd.query(
    `UPDATE solicitudes SET estado = ?, nota = ?, atendida_por = ?,
            atendida_en = ${sello} WHERE id = ?`,
    [estado, nota, estado === 'nueva' ? null : usuario.id, id]
  );

  await registrarAuditoria({
    usuarioId: usuario.id,
    accion: 'solicitud_atendida',
    detalle: `solicitud ${id} de ${solicitud.correo}: ${solicitud.estado} a ${estado}`,
    ip,
  });
  return obtener(id);
}

export async function descartarViejas(dias, usuario, ip) {
  const limite = Math.trunc(Number(dias));
  if (!Number.isInteger(limite) || limite < SOLICITUDES.DIAS_DESCARTE_MINIMO
      || limite > SOLICITUDES.DIAS_DESCARTE_MAXIMO) {
    throw new ErrorVisible(`Los días van en un número entero entre ${SOLICITUDES.DIAS_DESCARTE_MINIMO} `
      + `y ${SOLICITUDES.DIAS_DESCARTE_MAXIMO}.`);
  }
  const [resultado] = await bd.query(
    "UPDATE solicitudes SET estado = 'descartada', atendida_por = ?, atendida_en = NOW() "
    + "WHERE estado = 'nueva' AND creado_en < DATE_SUB(NOW(), INTERVAL ? DAY)",
    [usuario.id, limite]
  );
  if (resultado.affectedRows > 0) {
    await registrarAuditoria({
      usuarioId: usuario.id,
      accion: 'solicitudes_descartadas',
      detalle: `${resultado.affectedRows} solicitud(es) sin atender con más de ${limite} día(s)`,
      ip,
    });
  }
  return { descartadas: resultado.affectedRows };
}
