import * as servicio from './servicio.js';
import { generarCsv, TABLAS_EXPORTABLES } from './exportaciones.js';
import { generarXlsx, generarPdf } from './documentos.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { PERMISOS_EXPORTACION } from '../../configuracion/permisos.js';
import { hoyLocal } from '../../comun/fechas.js';

export async function indicadores(req, res) {
  res.json(await servicio.obtenerIndicadores());
}

export async function exportar(req, res) {
  const { tabla } = req.params;
  const formato = String(req.query.formato ?? 'csv').toLowerCase();
  if (!TABLAS_EXPORTABLES.includes(tabla)) {
    throw new ErrorVisible('Tabla no disponible para exportar.');
  }

  if (!PERMISOS_EXPORTACION[tabla].includes(req.usuario.rol)) {
    throw new ErrorVisible('No tenés permiso para exportar esta información.', 403);
  }

  await registrarAuditoria({ usuarioId: req.usuario.id, accion: 'reporte_exportado', detalle: `${tabla} (${formato})`, ip: req.ip });

  const nombre = `${tabla}-${hoyLocal()}`;

  if (formato === 'xlsx') {
    const archivo = await generarXlsx(tabla);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}.xlsx"`);
    return res.send(archivo);
  }
  if (formato === 'pdf') {
    const archivo = await generarPdf(tabla);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}.pdf"`);
    return res.send(archivo);
  }
  const csv = await generarCsv(tabla);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}.csv"`);
  res.send(csv);
}
