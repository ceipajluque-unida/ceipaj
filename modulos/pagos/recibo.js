// recibo de dinero en pdf. la dnit no lo timbra, pero hay que aclarar que no da crédito fiscal
import PDFDocument from 'pdfkit';
import { RECIBO, INSTITUCION } from '../../configuracion/ajustes.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { guaraniesEnLetras } from '../../comun/numeroALetras.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];

// los datos del emisor se cargan desde configuración, no van quemados
function emisor() {
  return {
    nombre: ajustes.leer('RECIBO_EMISOR_NOMBRE', RECIBO.EMISOR_NOMBRE) || ajustes.leer('INSTITUCION_NOMBRE', INSTITUCION.NOMBRE),
    direccion: ajustes.leer('RECIBO_EMISOR_DIRECCION', RECIBO.EMISOR_DIRECCION),
    telefono: ajustes.leer('RECIBO_EMISOR_TELEFONO', RECIBO.EMISOR_TELEFONO),
    correo: ajustes.leer('RECIBO_EMISOR_CORREO', RECIBO.EMISOR_CORREO),
    ciudad: ajustes.leer('INSTITUCION_CIUDAD', INSTITUCION.CIUDAD),
  };
}

// numeración simple: unas letras y el número del pago. no es un timbrado, no lleva ese formato
export function numeroDeRecibo(pago) {
  const serie = ajustes.leer('RECIBO_SERIE', RECIBO.SERIE);
  return `${serie}-${pago.id}`;
}

function enGuaranies(monto) {
  return `Gs. ${Number(monto).toLocaleString('es-PY')}`;
}

function fechaLarga(valor) {
  const fecha = valor ? new Date(valor) : new Date();
  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`;
}

const anchoUtil = (doc) => doc.page.width - doc.page.margins.left - doc.page.margins.right;

// una línea de dato con su etiqueta en negrita. el ancho va explícito porque pdfkit hereda el anterior
function dato(doc, etiqueta, valor) {
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#444')
    .text(`${etiqueta}: `, doc.page.margins.left, doc.y, { width: anchoUtil(doc), continued: true });
  doc.font('Helvetica').fillColor('#000').text(valor || '—');
}

// las dos columnas van con coordenadas fijas, así ninguna arrastra a la otra
function encabezado(doc, datos, pago) {
  const izq = doc.page.margins.left;
  const ancho = anchoUtil(doc);
  const arriba = doc.page.margins.top;
  const anchoIzq = ancho * 0.56;
  const anchoDer = ancho * 0.40;
  const derecha = { width: anchoDer, align: 'right' };

  // a la izquierda, quién cobra
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#1f2430')
    .text(datos.nombre, izq, arriba, { width: anchoIzq });
  doc.font('Helvetica').fontSize(8.5).fillColor('#555');
  const lineas = [
    datos.direccion,
    [datos.telefono, datos.correo].filter(Boolean).join(' · '),
  ].filter(Boolean);
  lineas.forEach((linea) => doc.text(linea, izq, doc.y, { width: anchoIzq }));
  const finIzquierda = doc.y;

  // a la derecha, qué documento es
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#1f2430')
    .text('RECIBO DE DINERO', izq + ancho - anchoDer, arriba, derecha);
  doc.fontSize(11).fillColor('#35597e')
    .text(`N.º ${numeroDeRecibo(pago)}`, izq + ancho - anchoDer, doc.y, derecha);

  const y = Math.max(finIzquierda, doc.y) + 12;
  doc.moveTo(izq, y).lineTo(izq + ancho, y).lineWidth(1).strokeColor('#1f2430').stroke();
  doc.x = izq;
  doc.y = y + 14;
}

function cuerpo(doc, datos, pago) {
  const izq = doc.page.margins.left;
  const ancho = doc.page.width - izq - doc.page.margins.right;

  doc.font('Helvetica').fontSize(9).fillColor('#555')
    .text(`${datos.ciudad}, ${fechaLarga(pago.fecha_pago ?? pago.creado_en)}`, izq, doc.y, { width: ancho, align: 'right' });
  doc.moveDown(0.8).fillColor('#000');

  dato(doc, 'Recibí de', pago.pagador_nombre || datos.nombre);
  if (pago.pagador_documento) dato(doc, 'Documento', pago.pagador_documento);
  doc.moveDown(0.3);
  dato(doc, 'La suma de', guaraniesEnLetras(pago.monto));
  doc.moveDown(0.3);
  dato(doc, 'En concepto de', pago.concepto);
  doc.moveDown(0.8);

  // el importe en números va recuadrado para que se lea de un vistazo
  const alto = 30;
  const anchoCaja = 190;
  const x = izq + ancho - anchoCaja;
  doc.rect(x, doc.y, anchoCaja, alto).fillAndStroke('#f4f6f8', '#1f2430');
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#1f2430')
    .text(enGuaranies(pago.monto), x, doc.y + 9, { width: anchoCaja, align: 'center' });
  doc.y += alto + 16;
  doc.fillColor('#000');
}

function detalle(doc, pago) {
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#1f2430')
    .text('Detalle de la operación', doc.page.margins.left, doc.y, { width: anchoUtil(doc) });
  doc.moveDown(0.3);
  dato(doc, 'Forma de pago', pago.forma_pago_externa || pago.medio_pago);
  dato(doc, 'Referencia de la operación', pago.referencia);
  if (pago.comprobante_externo) dato(doc, 'Comprobante de la pasarela', pago.comprobante_externo);
  if (pago.proveedor) dato(doc, 'Procesador', pago.proveedor);
  if (pago.fecha_pago) dato(doc, 'Fecha de acreditación', new Date(pago.fecha_pago).toLocaleString('es-PY'));
}

function pie(doc) {
  const izq = doc.page.margins.left;
  const ancho = doc.page.width - izq - doc.page.margins.right;
  const y = doc.page.height - doc.page.margins.bottom - 58;

  doc.moveTo(izq, y).lineTo(izq + ancho, y).lineWidth(0.5).strokeColor('#bbb').stroke();
  doc.font('Helvetica').fontSize(7).fillColor('#666')
    .text(ajustes.leer('RECIBO_LEYENDA', RECIBO.LEYENDA), izq, y + 8, { width: ancho, align: 'justify' });
}

export function generarRecibo(pago) {
  const datos = emisor();
  return new Promise((resolver, rechazar) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const trozos = [];
    doc.on('data', (t) => trozos.push(t));
    doc.on('end', () => resolver(Buffer.concat(trozos)));
    doc.on('error', rechazar);

    encabezado(doc, datos, pago);
    cuerpo(doc, datos, pago);
    detalle(doc, pago);
    pie(doc);
    doc.end();
  });
}
