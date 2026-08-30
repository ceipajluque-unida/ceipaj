import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { obtenerDatos } from './exportaciones.js';
import { INSTITUCION } from '../../configuracion/ajustes.js';
import * as ajustes from '../../servidor/ajustesSistema.js';

const TITULOS = {
  leads: 'Interesados', interacciones: 'Interacciones', comisiones: 'Comisiones', suscripciones: 'Suscripciones',
  pagos: 'Pagos', auditoria: 'Auditoría',
};

export async function generarXlsx(tabla) {
  const { encabezados, filas } = await obtenerDatos(tabla);
  const libro = new ExcelJS.Workbook();
  libro.creator = ajustes.leer('INSTITUCION_NOMBRE', INSTITUCION.NOMBRE);
  const hoja = libro.addWorksheet(TITULOS[tabla] ?? tabla);

  const cabecera = hoja.addRow(encabezados);
  cabecera.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cabecera.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2430' } };

  const columnasMonto = encabezados.map((h, i) => (/monto/i.test(h) ? i : -1)).filter((i) => i >= 0);
  for (const fila of filas) {
    hoja.addRow(fila.map((valor, i) =>
      columnasMonto.includes(i) && valor != null && valor !== '' && !Number.isNaN(Number(valor)) ? Number(valor) : valor));
  }

  hoja.columns.forEach((columna, i) => {
    let largo = String(encabezados[i] ?? '').length;
    for (const fila of filas) largo = Math.max(largo, String(fila[i] ?? '').length);
    columna.width = Math.min(Math.max(largo + 2, 12), 48);
  });
  return Buffer.from(await libro.xlsx.writeBuffer());
}

export async function generarPdf(tabla) {
  const { encabezados, filas } = await obtenerDatos(tabla);
  const titulo = TITULOS[tabla] ?? tabla;

  return new Promise((resolver, rechazar) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
    const trozos = [];
    doc.on('data', (t) => trozos.push(t));
    doc.on('end', () => resolver(Buffer.concat(trozos)));
    doc.on('error', rechazar);

    doc.fontSize(15).font('Helvetica-Bold').fillColor('#1f2430')
      .text(`${ajustes.leer('INSTITUCION_NOMBRE', INSTITUCION.NOMBRE)}: ${titulo}`);
    doc.moveDown(0.2).fontSize(8).font('Helvetica').fillColor('#666')
      .text(`Generado el ${new Date().toLocaleString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}, ${filas.length} registro(s)`);
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
