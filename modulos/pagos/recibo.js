import { bd } from '../../servidor/bd/conexion.js';
import { RECIBO, PLATAFORMA, nombreDePasarela } from '../../configuracion/ajustes.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { guaraniesEnLetras } from '../../comun/numeroALetras.js';
import { dibujarRecibo } from './reciboPdf.js';

const OPCIONES_FORMA = ['Efectivo', 'Transferencia bancaria', 'Tarjeta de crédito/débito', 'Depósito bancario', 'Billetera electrónica', 'Otro medio de pago'];

const FORMA_POR_MEDIO = {
  tarjeta: 'Tarjeta de crédito/débito',
  transferencia: 'Transferencia bancaria',
  deposito: 'Depósito bancario',
  billetera: 'Billetera electrónica',
};

export function numeroDeRecibo(pago) {
  const serie = ajustes.leer('RECIBO_SERIE', RECIBO.SERIE);
  return `${serie}-${pago.id}`;
}

export function enGuaranies(monto) {
  return `Gs. ${Number(monto).toLocaleString('es-PY')}`;
}

export function fechaCorta(valor) {
  return new Date(valor).toLocaleDateString('es-PY', { timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fechaYHora(valor) {
  const fecha = new Date(valor);
  return `${fecha.toLocaleDateString('es-PY', { timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit', year: 'numeric' })} ${fecha.toLocaleTimeString('es-PY', { timeZone: 'America/Asuncion', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })}`;
}

export function nombreDelEmisor() {
  return ajustes.leer('RECIBO_EMISOR_NOMBRE', RECIBO.EMISOR_NOMBRE) || ajustes.leer('PLATAFORMA_NOMBRE', PLATAFORMA.NOMBRE);
}

export async function marcarReciboEmitido(id, cuando) {
  await bd.query('UPDATE pagos SET recibo_emitido_en = ? WHERE id = ? AND recibo_emitido_en IS NULL', [cuando, id]);
}

function emisor() {
  return {
    nombre: nombreDelEmisor(),
    direccion: ajustes.leer('RECIBO_EMISOR_DIRECCION', RECIBO.EMISOR_DIRECCION),
    telefono: ajustes.leer('RECIBO_EMISOR_TELEFONO', RECIBO.EMISOR_TELEFONO),
    correo: ajustes.leer('RECIBO_EMISOR_CORREO', RECIBO.EMISOR_CORREO),
  };
}

export function leyendasDelRecibo() {
  return [
    `Este recibo electrónico acredita únicamente la recepción del importe indicado y ha sido generado por el ${ajustes.leer('PLATAFORMA_NOMBRE', PLATAFORMA.NOMBRE)}. ${ajustes.leer('RECIBO_LEYENDA', RECIBO.LEYENDA)}`,
  ];
}

export async function generarRecibo(pago, emision) {
  const quien = emisor();
  const [[institucion]] = await bd.query(
    'SELECT nombre, ciudad, correo_contacto, telefono, direccion FROM instituciones WHERE id = ?',
    [pago.institucion_id]
  );
  const [[periodo]] = await bd.query(
    'SELECT fecha_inicio, fecha_fin FROM suscripciones WHERE pago_id = ?',
    [pago.id]
  );

  const concepto = [
    ['Concepto del pago', pago.concepto],
    ['Referencia', pago.referencia],
  ];
  if (periodo) concepto.push(['Período', `${fechaCorta(periodo.fecha_inicio)} a ${fechaCorta(periodo.fecha_fin)}`]);

  const nombreProveedor = nombreDePasarela(pago.proveedor);
  const trazabilidad = [
    ['Pago registrado el', fechaYHora(pago.creado_en)],
    ['Acreditado el', pago.fecha_pago ? fechaYHora(pago.fecha_pago) : '—'],
    ['Procesado por', nombreProveedor],
  ];
  if (pago.comprobante_externo) trazabilidad.push(['Comprobante de la pasarela', pago.comprobante_externo]);
  if (emision.estado === 'Reimpreso') trazabilidad.push(['Emitido originalmente el', fechaYHora(emision.emitidoEn)]);

  const marcada = FORMA_POR_MEDIO[pago.medio_pago] ?? 'Otro medio de pago';
  const externa = pago.forma_pago_externa;
  const detalleForma = externa && externa !== marcada && externa !== nombreProveedor
    ? `Informado por ${nombreProveedor}: ${externa}`
    : null;

  return dibujarRecibo({
    titulo: 'RECIBO ELECTRÓNICO DE DINERO',
    subtitulo: 'Documento no tributario, no válido como factura',
    numero: numeroDeRecibo(pago),
    emision: {
      fecha: fechaCorta(emision.ahora),
      hora: emision.ahora.toLocaleTimeString('es-PY', { timeZone: 'America/Asuncion', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }),
      estado: emision.estado,
    },
    parIzquierdo: {
      titulo: 'EMISOR',
      lineas: [
        ['Nombre', quien.nombre],
        ['Dirección', quien.direccion],
        ['Teléfono', quien.telefono],
        ['Correo', quien.correo],
      ],
    },
    parDerecho: {
      titulo: 'PAGADOR',
      lineas: [
        ['Institución', institucion?.nombre],
        ['Documento del pagador', pago.pagador_documento],
        ['Pagado por', pago.pagador_nombre],
        ['Correo', institucion?.correo_contacto],
        ['Ciudad', institucion?.ciudad],
      ],
    },
    concepto: { titulo: 'DETALLE DEL CONCEPTO', lineas: concepto },
    monto: {
      items: [{ descripcion: pago.concepto, importe: enGuaranies(pago.monto) }],
      total: enGuaranies(pago.monto),
      moneda: 'Guaraníes',
      enLetras: guaraniesEnLetras(pago.monto),
    },
    formaPago: { opciones: OPCIONES_FORMA, marcada, detalle: detalleForma },
    trazabilidad,
    leyendas: leyendasDelRecibo(),
  });
}
