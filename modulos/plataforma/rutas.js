import { Router } from 'express';
import * as servicio from './servicio.js';
import * as documentos from './documentos.js';
import { autenticar, permitirModulo } from '../../servidor/middleware/autenticar.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';

export const rutasPlataforma = Router();

rutasPlataforma.use(autenticar, permitirModulo('plataforma'));

rutasPlataforma.get('/', async (req, res) => res.json({
  resumen: await servicio.resumen(),
  planes: await servicio.porPlan(),
  instituciones: await servicio.porInstitucion(),
  meses: await servicio.porMes(),
}));

rutasPlataforma.get('/exportar/:reporte', async (req, res) => {
  const { reporte } = req.params;
  if (!documentos.REPORTES_DISPONIBLES.includes(reporte)) {
    throw new ErrorVisible('Ese reporte no existe.');
  }
  const formato = String(req.query.formato ?? 'csv').toLowerCase();
  await registrarAuditoria({
    usuarioId: req.usuario.id, accion: 'reporte_plataforma',
    detalle: `${documentos.tituloDe(reporte)} (${formato})`, ip: req.ip,
  });

  const nombre = `plataforma-${reporte}-${new Date().toISOString().slice(0, 10)}`;
  if (formato === 'xlsx') {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}.xlsx"`);
    return res.send(await documentos.generarXlsx(reporte));
  }
  if (formato === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}.pdf"`);
    return res.send(await documentos.generarPdf(reporte));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}.csv"`);
  res.send(await documentos.generarCsv(reporte));
});
