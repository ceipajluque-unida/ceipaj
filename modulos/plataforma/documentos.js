import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import * as servicio from './servicio.js';
import { PLATAFORMA } from '../../configuracion/ajustes.js';

// los tres reportes del negocio del proveedor. no reusan el modulo de reportes
// porque aquel filtra por institucion y estos miran todas juntas.

const fecha = (v) => (v ? new Date(v).toLocaleDateString('es-PY') : '');
const ESTADO_PLAN = { vigente: 'Vigente', vencido: 'Vencido', sin_plan: 'Nunca contrató' };

const REPORTES = {
  planes: {
    titulo: 'Ingresos por plan',
    encabezados: ['Plan', 'Precio mensual (Gs.)', 'Instituciones con el plan',
      'Períodos vendidos', 'Cobrado (Gs.)', 'Ingreso mensual (Gs.)', 'Participación (%)'],
    async filas() {
      return (await servicio.porPlan()).map((p) => [
        p.titulo, Number(p.precio), Number(p.institucionesVigentes), Number(p.periodosVendidos),
        Number(p.recaudado), Number(p.ingresoMensual), p.participacion,
      ]);
    },
  },
  instituciones: {
    titulo: 'Instituciones',
    encabezados: ['Institución', 'Ciudad', 'Estado', 'Plan', 'Situación del plan',
      'Vence o venció', 'Usuarios', 'Aliados', 'Interesados', 'Pagado (Gs.)', 'Alta'],
    async filas() {
      return (await servicio.porInstitucion()).map((i) => [
        i.nombre, i.ciudad ?? '', i.activo ? 'Activa' : 'Suspendida',
        i.planVigente ?? i.ultimoPlan ?? '', ESTADO_PLAN[i.estadoPlan],
        fecha(i.venceEl ?? i.vencioEl), Number(i.usuarios), Number(i.aliados),
        Number(i.interesados), Number(i.pagado), fecha(i.creado_en),
      ]);
    },
  },
  meses: {
    titulo: 'Recaudación por mes',
    encabezados: ['Mes', 'Pagos acreditados', 'Instituciones que pagaron', 'Recaudado (Gs.)'],
    async filas() {
      return (await servicio.porMes(36)).map((m) => [
        m.mes, Number(m.pagos), Number(m.instituciones), Number(m.recaudado),
      ]);
    },
  },
};

export const REPORTES_DISPONIBLES = Object.keys(REPORTES);
export const tituloDe = (clave) => REPORTES[clave]?.titulo ?? clave;

async function datos(clave) {
  const reporte = REPORTES[clave];
  return { titulo: reporte.titulo, encabezados: reporte.encabezados, filas: await reporte.filas() };
}

// una celda que arranca con = o + la abre Excel como formula: se neutraliza
function escapar(valor) {
  let texto = String(valor ?? '');
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

export async function generarCsv(clave) {
  const { encabezados, filas } = await datos(clave);
  const lineas = [encabezados.map(escapar).join(';')];
  for (const fila of filas) lineas.push(fila.map(escapar).join(';'));
  return '﻿' + lineas.join('\r\n');
}

export async function generarXlsx(clave) {
  const { titulo, encabezados, filas } = await datos(clave);
  const libro = new ExcelJS.Workbook();
  libro.creator = PLATAFORMA.NOMBRE;
  const hoja = libro.addWorksheet(titulo);

  const cabecera = hoja.addRow(encabezados);
  cabecera.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cabecera.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2430' } };
  for (const fila of filas) hoja.addRow(fila);

  hoja.columns.forEach((columna, i) => {
    let largo = String(encabezados[i] ?? '').length;
    for (const fila of filas) largo = Math.max(largo, String(fila[i] ?? '').length);
    columna.width = Math.min(Math.max(largo + 2, 12), 44);
  });
  return Buffer.from(await libro.xlsx.writeBuffer());
}

export async function generarPdf(clave) {
  const { titulo, encabezados, filas } = await datos(clave);
  return new Promise((resolver, rechazar) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
    const trozos = [];
    doc.on('data', (t) => trozos.push(t));
    doc.on('end', () => resolver(Buffer.concat(trozos)));
    doc.on('error', rechazar);

    doc.fontSize(15).font('Helvetica-Bold').fillColor('#1f2430').text(`${PLATAFORMA.NOMBRE}: ${titulo}`);
    doc.moveDown(0.2).fontSize(8).font('Helvetica').fillColor('#666').text(
      `Generado el ${new Date().toLocaleString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}, `
      + `${filas.length} fila(s). Cifras de todas las instituciones.`
    );
    doc.moveDown(0.6).fillColor('#000');

    const izq = doc.page.margins.left;
    const ancho = doc.page.width - izq - doc.page.margins.right;
    const anchoCol = ancho / encabezados.length;
    const alto = 16;

    const encabezar = (y) => {
      doc.rect(izq, y, ancho, alto).fill('#1f2430');
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff');
      encabezados.forEach((h, i) =>
        doc.text(String(h), izq + i * anchoCol + 3, y + 4, { width: anchoCol - 6, ellipsis: true, lineBreak: false }));
      doc.fillColor('#000');
      return y + alto;
    };

    let y = encabezar(doc.y);
    const limite = doc.page.height - doc.page.margins.bottom - alto;
    filas.forEach((fila, indice) => {
      if (y > limite) { doc.addPage(); y = encabezar(doc.page.margins.top); }
      if (indice % 2 === 1) { doc.rect(izq, y, ancho, alto).fill('#f2f2f2'); doc.fillColor('#000'); }
      doc.font('Helvetica').fontSize(8).fillColor('#000');
      fila.forEach((celda, i) =>
        doc.text(String(celda ?? ''), izq + i * anchoCol + 3, y + 4, { width: anchoCol - 6, ellipsis: true, lineBreak: false }));
      y += alto;
    });
    doc.end();
  });
}
