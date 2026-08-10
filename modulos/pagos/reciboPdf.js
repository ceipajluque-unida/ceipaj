import PDFDocument from 'pdfkit';

const BORDE = '#2f3640';
const BARRA = '#edf0f4';
const ACENTO = '#35597e';
const GRIS = '#555555';

function alturaDeLineas(lineas) {
  return 20 + lineas.length * 13 + 6;
}

function cajaConTitulo(doc, x, y, ancho, alto, titulo) {
  doc.rect(x, y, ancho, alto).lineWidth(0.8).strokeColor(BORDE).stroke();
  doc.rect(x, y, ancho, 16).fillColor(BARRA).fill();
  doc.font('Helvetica-Bold').fontSize(8).fillColor(BORDE).text(titulo, x + 8, y + 4.5);
}

function lineasEnCaja(doc, x, y, ancho, lineas) {
  let cursor = y + 21;
  for (const [etiqueta, valor] of lineas) {
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GRIS)
      .text(`${etiqueta}: `, x + 8, cursor, { width: ancho - 16, continued: true });
    doc.font('Helvetica').fillColor('#000').text(String(valor ?? '—'));
    cursor = Math.max(cursor + 13, doc.y);
  }
}

function encabezado(doc, datos, izq, ancho) {
  const anchoCaja = 200;
  const xCaja = izq + ancho - anchoCaja;
  doc.font('Helvetica-Bold').fontSize(15).fillColor(BORDE).text(datos.titulo, izq, 42, { width: ancho - anchoCaja - 10 });
  doc.font('Helvetica').fontSize(8.5).fillColor(GRIS).text(datos.subtitulo, izq, doc.y + 2, { width: ancho - anchoCaja - 10 });

  doc.rect(xCaja, 40, anchoCaja, 62).lineWidth(0.8).strokeColor(BORDE).stroke();
  doc.font('Helvetica-Bold').fontSize(9).fillColor(GRIS).text('N.º de recibo: ', xCaja + 8, 47, { continued: true });
  doc.fillColor(ACENTO).text(datos.numero);
  doc.font('Helvetica').fontSize(8.5).fillColor('#000')
    .text(`Fecha de emisión: ${datos.emision.fecha}`, xCaja + 8, doc.y + 3)
    .text(`Hora de emisión: ${datos.emision.hora}`, xCaja + 8, doc.y + 2);
  doc.font('Helvetica-Bold').text(`Estado: ${datos.emision.estado}`, xCaja + 8, doc.y + 2);
  return 40 + 62 + 14;
}

function parDeCajas(doc, y, izq, ancho, parIzq, parDer) {
  const anchoCaja = (ancho - 10) / 2;
  const alto = Math.max(alturaDeLineas(parIzq.lineas), alturaDeLineas(parDer.lineas));
  cajaConTitulo(doc, izq, y, anchoCaja, alto, parIzq.titulo);
  lineasEnCaja(doc, izq, y, anchoCaja, parIzq.lineas);
  cajaConTitulo(doc, izq + anchoCaja + 10, y, anchoCaja, alto, parDer.titulo);
  lineasEnCaja(doc, izq + anchoCaja + 10, y, anchoCaja, parDer.lineas);
  return y + alto + 10;
}

function cajaSimple(doc, y, izq, ancho, titulo, lineas) {
  const alto = alturaDeLineas(lineas);
  cajaConTitulo(doc, izq, y, ancho, alto, titulo);
  lineasEnCaja(doc, izq, y, ancho, lineas);
  return y + alto + 10;
}

function cajaDeMonto(doc, y, izq, ancho, monto) {
  const alto = 20 + 18 + monto.items.length * 16 + 30 + 30;
  cajaConTitulo(doc, izq, y, ancho, alto, 'INFORMACIÓN DEL MONTO');
  let cursor = y + 21;
  doc.rect(izq + 8, cursor, ancho - 16, 16).fillColor('#f7f8fa').fill()
    .rect(izq + 8, cursor, ancho - 16, 16).lineWidth(0.5).strokeColor('#c9cdd4').stroke();
  doc.font('Helvetica-Bold').fontSize(8).fillColor(GRIS)
    .text('Descripción', izq + 14, cursor + 4).text('Importe', izq + 8, cursor + 4, { width: ancho - 22, align: 'right' });
  cursor += 18;
  for (const item of monto.items) {
    doc.font('Helvetica').fontSize(8.5).fillColor('#000')
      .text(item.descripcion, izq + 14, cursor, { width: ancho - 160 })
      .text(item.importe, izq + 8, cursor, { width: ancho - 22, align: 'right' });
    cursor += 16;
  }
  const anchoTotal = 210;
  doc.rect(izq + ancho - 8 - anchoTotal, cursor, anchoTotal, 22).fillColor(BARRA).fill()
    .rect(izq + ancho - 8 - anchoTotal, cursor, anchoTotal, 22).lineWidth(0.8).strokeColor(BORDE).stroke();
  doc.font('Helvetica-Bold').fontSize(10).fillColor(BORDE)
    .text(`TOTAL RECIBIDO: ${monto.total}`, izq + ancho - 8 - anchoTotal, cursor + 6, { width: anchoTotal, align: 'center' });
  cursor += 28;
  doc.font('Helvetica').fontSize(8.5).fillColor('#000').text(`Moneda: ${monto.moneda}`, izq + 8, cursor);
  doc.font('Helvetica-Bold').text('Importe en letras: ', izq + 8, doc.y + 2, { width: ancho - 16, continued: true });
  doc.font('Helvetica').text(monto.enLetras);
  return y + alto + 10;
}

function cajaDeFormaDePago(doc, y, izq, ancho, formaPago) {
  doc.fontSize(8.5);
  const disponible = ancho - 20;
  const filas = [[]];
  let usado = 0;
  for (const opcion of formaPago.opciones) {
    const marcada = opcion === formaPago.marcada;
    const texto = `${marcada ? '[X]' : '[  ]'} ${opcion}`;
    doc.font(marcada ? 'Helvetica-Bold' : 'Helvetica');
    const anchoTexto = doc.widthOfString(texto) + 16;
    if (usado + anchoTexto > disponible && filas.at(-1).length > 0) {
      filas.push([]);
      usado = 0;
    }
    filas.at(-1).push({ texto, marcada });
    usado += anchoTexto;
  }

  const alto = 20 + filas.length * 15 + (formaPago.detalle ? 15 : 0) + 8;
  cajaConTitulo(doc, izq, y, ancho, alto, 'FORMA DE PAGO');
  let cursor = y + 23;
  for (const fila of filas) {
    let x = izq + 10;
    for (const { texto, marcada } of fila) {
      doc.font(marcada ? 'Helvetica-Bold' : 'Helvetica').fillColor(marcada ? BORDE : GRIS)
        .text(texto, x, cursor, { lineBreak: false });
      x += doc.widthOfString(texto) + 16;
    }
    cursor += 15;
  }
  if (formaPago.detalle) {
    doc.font('Helvetica').fontSize(8.5).fillColor(GRIS)
      .text(`Detalle informado por la pasarela: ${formaPago.detalle}`, izq + 10, cursor + 2, { lineBreak: false });
  }
  return y + alto + 10;
}

function leyendas(doc, izq, ancho, textos) {
  let y = doc.page.height - doc.page.margins.bottom - 16 - textos.length * 20;
  doc.moveTo(izq, y).lineTo(izq + ancho, y).lineWidth(0.5).strokeColor('#bbbbbb').stroke();
  y += 6;
  for (const texto of textos) {
    doc.font('Helvetica').fontSize(7).fillColor('#666666').text(texto, izq, y, { width: ancho, align: 'justify' });
    y = doc.y + 4;
  }
}

export function dibujarRecibo(datos) {
  return new Promise((resolver, rechazar) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const trozos = [];
    doc.on('data', (t) => trozos.push(t));
    doc.on('end', () => resolver(Buffer.concat(trozos)));
    doc.on('error', rechazar);

    const izq = doc.page.margins.left;
    const ancho = doc.page.width - izq - doc.page.margins.right;

    let y = encabezado(doc, datos, izq, ancho);
    y = parDeCajas(doc, y, izq, ancho, datos.parIzquierdo, datos.parDerecho);
    y = cajaSimple(doc, y, izq, ancho, datos.concepto.titulo, datos.concepto.lineas);
    y = cajaDeMonto(doc, y, izq, ancho, datos.monto);
    if (datos.formaPago) y = cajaDeFormaDePago(doc, y, izq, ancho, datos.formaPago);
    cajaSimple(doc, y, izq, ancho, 'INFORMACIÓN DE TRAZABILIDAD', datos.trazabilidad);
    leyendas(doc, izq, ancho, datos.leyendas);
    doc.end();
  });
}
