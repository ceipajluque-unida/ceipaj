// lista blanca de tablas exportables con columnas legibles, para csv, excel y pdf
import { bd } from '../../servidor/bd/conexion.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { institucionActual } from '../../servidor/contexto.js';

// tope de filas por archivo, de sobra para el volumen que manejamos
const FILAS_MAXIMAS = 5000;

// cada tabla define sus encabezados y un select con nombres y fechas formateadas.
// el primer ? de cada consulta es siempre la institución: acá salen datos personales,
// así que ninguna se exporta sin ese filtro. las tablas hijas lo toman de su padre.
const EXPORTACIONES = {
  leads: {
    encabezados: ['Nombre', 'Cédula', 'Teléfono', 'Correo', 'Canal', 'Estado', 'Aliado', 'Fecha de conversión', 'Registrado el'],
    sql: `SELECT l.nombre AS nombre, l.cedula AS cedula, l.telefono AS telefono, l.correo AS correo,
                 l.canal AS canal, l.estado AS estado, u.nombre AS aliado,
                 DATE_FORMAT(l.fecha_conversion, '%d/%m/%Y %H:%i') AS convertido_el,
                 DATE_FORMAT(l.creado_en, '%d/%m/%Y %H:%i') AS registrado_el
            FROM leads l
            LEFT JOIN aliados a ON a.id = l.aliado_id
            LEFT JOIN usuarios u ON u.id = a.usuario_id
            WHERE l.institucion_id = ? AND l.activo = 1
            ORDER BY l.creado_en DESC`,
  },
  interacciones: {
    encabezados: ['Interesado', 'Cédula', 'Tipo', 'Detalle', 'Registrado por', 'Fecha'],
    sql: `SELECT le.nombre AS interesado, le.cedula AS cedula, i.tipo AS tipo, i.detalle AS detalle,
                 u.nombre AS registrado_por, DATE_FORMAT(i.fecha, '%d/%m/%Y %H:%i') AS fecha
            FROM interacciones i
            JOIN leads le ON le.id = i.lead_id
            JOIN usuarios u ON u.id = i.usuario_id
            WHERE le.institucion_id = ?
            ORDER BY i.fecha DESC`,
  },
  comisiones: {
    encabezados: ['Aliado', 'Institución', 'Interesado matriculado', 'Monto (Gs.)', 'Estado', 'Fecha'],
    sql: `SELECT u.nombre AS aliado, a.institucion AS institucion, le.nombre AS interesado,
                 c.monto AS monto, c.estado AS estado, DATE_FORMAT(c.creado_en, '%d/%m/%Y %H:%i') AS fecha
            FROM comisiones c
            JOIN aliados a ON a.id = c.aliado_id
            JOIN usuarios u ON u.id = a.usuario_id
            JOIN leads le ON le.id = c.lead_id
            WHERE a.institucion_id = ?
            ORDER BY c.creado_en DESC`,
  },
  pagos: {
    encabezados: ['Referencia', 'Concepto', 'Medio de pago', 'Monto (Gs.)', 'Moneda', 'Estado', 'Proveedor', 'Creado por', 'Fecha'],
    sql: `SELECT p.referencia AS referencia, p.concepto AS concepto, p.medio_pago AS medio_pago, p.monto AS monto, p.moneda AS moneda,
                 p.estado AS estado, p.proveedor AS proveedor, u.nombre AS creado_por,
                 DATE_FORMAT(p.creado_en, '%d/%m/%Y %H:%i') AS fecha
            FROM pagos p
            LEFT JOIN usuarios u ON u.id = p.creado_por
            WHERE p.institucion_id = ?
            ORDER BY p.creado_en DESC`,
  },
  suscripciones: {
    encabezados: ['Plan', 'Estado', 'Monto (Gs.)', 'Inicio', 'Vencimiento', 'Pago'],
    sql: `SELECT s.plan AS plan, s.estado AS estado, s.monto AS monto,
                 DATE_FORMAT(s.fecha_inicio, '%d/%m/%Y') AS inicio,
                 DATE_FORMAT(s.fecha_fin, '%d/%m/%Y') AS vencimiento,
                 p.referencia AS pago
            FROM suscripciones s
            LEFT JOIN pagos p ON p.id = s.pago_id
            WHERE s.institucion_id = ?
            ORDER BY s.fecha_inicio DESC`,
  },
  auditoria: {
    encabezados: ['Fecha', 'Usuario', 'Acción', 'Detalle', 'Dirección IP'],
    sql: `SELECT DATE_FORMAT(au.fecha, '%d/%m/%Y %H:%i:%s') AS fecha, u.nombre AS usuario,
                 au.accion AS accion, au.detalle AS detalle, au.direccion_ip AS ip
            FROM auditoria au
            LEFT JOIN usuarios u ON u.id = au.usuario_id
            WHERE au.institucion_id = ?
            ORDER BY au.fecha DESC`,
  },
};

export const TABLAS_EXPORTABLES = Object.keys(EXPORTACIONES);

// trae los datos legibles (encabezados + filas); lo comparten csv, excel y pdf
export async function obtenerDatos(tabla) {
  const definicion = EXPORTACIONES[tabla];
  if (!definicion) throw new ErrorVisible('Tabla no disponible para exportar.');
  // sin institución no hay exportación: bajar la base entera de todos los clientes en un
  // archivo sería lo peor que puede pasar acá
  const institucionId = institucionActual();
  if (institucionId === null) throw new ErrorVisible('Esta operación es de una institución.', 403);
  const [filas] = await bd.query(`${definicion.sql} LIMIT ?`, [institucionId, FILAS_MAXIMAS]);
  return { encabezados: definicion.encabezados, filas: filas.map((fila) => Object.values(fila)) };
}

// valores entre comillas; apóstrofo delante de = + - @ para que excel no ejecute fórmulas
function escapar(valor) {
  let texto = String(valor ?? '');
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

// separador ';' para el excel en español y bom utf-8 por los acentos
export async function generarCsv(tabla) {
  const { encabezados, filas } = await obtenerDatos(tabla);
  const lineas = [encabezados.map(escapar).join(';')];
  for (const fila of filas) {
    lineas.push(fila.map(escapar).join(';'));
  }
  return '\uFEFF' + lineas.join('\r\n');
}
