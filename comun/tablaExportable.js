import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

// un solo generador para todas las descargas del sistema: las de la institución
// y las del proveedor. sin adornos a propósito: encabezado en negrita y la
// tabla, que es lo que después se pega en una planilla o se imprime.

// una celda que arranca con = o + la abre Excel como fórmula: se neutraliza
function escapar(valor) {
  let texto = String(valor ?? '');
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

export function aCsv({ encabezados, filas }) {
  const lineas = [encabezados.map(escapar).join(';')];
  for (const fila of filas) lineas.push(fila.map(escapar).join(';'));
  return '\uFEFF' + lineas.join('\r\n');
}

export async function aXlsx({ titulo, autor, encabezados, filas }) {
  const libro = new ExcelJS.Workbook();
  libro.creator = autor;
  const hoja = libro.addWorksheet(titulo);

  hoja.addRow(encabezados).font = { bold: true };
  for (const fila of filas) hoja.addRow(fila);

  hoja.columns.forEach((columna, i) => {
    let largo = String(encabezados[i] ?? '').length;
    for (const fila of filas) largo = Math.max(largo, String(fila[i] ?? '').length);
    columna.width = Math.min(Math.max(largo + 2, 12), 48);
  });
  return Buffer.from(await libro.xlsx.writeBuffer());
}

const momento = () => new Date().toLocaleString('es-PY', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function aPdf({ titulo, encabezados, filas }) {
  return new Promise((resolver, rechazar) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
    const trozos = [];
    doc.on('data', (t) => trozos.push(t));
    doc.on('end', () => resolver(Buffer.concat(trozos)));
    doc.on('error', rechazar);

    doc.fillColor('#000').fontSize(14).font('Helvetica-Bold').text(titulo);
    doc.moveDown(0.2).fontSize(8).font('Helvetica')
      .text(`Generado el ${momento()}, ${filas.length} fila(s)`);
    doc.moveDown(0.6);

    const izq = doc.page.margins.left;
    const ancho = doc.page.width - izq - doc.page.margins.right;
    const anchoCol = ancho / encabezados.length;
    const alto = 15;

    const escribir = (celdas, y) => celdas.forEach((celda, i) =>
      doc.text(String(celda ?? ''), izq + i * anchoCol + 2, y + 4, { width: anchoCol - 4, ellipsis: true, lineBreak: false }));

    const encabezar = (y) => {
      doc.font('Helvetica-Bold').fontSize(8);
      escribir(encabezados, y);
      doc.moveTo(izq, y + alto).lineTo(izq + ancho, y + alto).lineWidth(0.5).stroke();
      doc.font('Helvetica');
      return y + alto + 2;
    };

    let y = encabezar(doc.y);
    const limite = doc.page.height - doc.page.margins.bottom - alto;
    for (const fila of filas) {
      if (y > limite) { doc.addPage(); y = encabezar(doc.page.margins.top); }
      escribir(fila, y);
      y += alto;
    }
    doc.end();
  });
}
