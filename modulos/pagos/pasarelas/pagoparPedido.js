import { PAGOPAR, RECIBO, INSTITUCION } from '../../../configuracion/ajustes.js';
import * as ajustes from '../../../servidor/ajustesSistema.js';

const FORMAS_PAGO = { tarjeta: 9, transferencia: 11, billetera: 12, deposito: 11 };

function fechaMaximaPago() {
  const fecha = new Date(Date.now() + PAGOPAR.DIAS_PARA_PAGAR * 86400000);
  const dos = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())} `
    + `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}`;
}

export function formaDePago(medio) {
  return FORMAS_PAGO[medio] ?? FORMAS_PAGO.tarjeta;
}

// en modo físico la "entrega" es el retiro en el local del emisor del recibo
function lugarDeEntrega() {
  return {
    direccion: ajustes.leer('RECIBO_EMISOR_DIRECCION', RECIBO.EMISOR_DIRECCION),
    telefono: ajustes.leer('RECIBO_EMISOR_TELEFONO', RECIBO.EMISOR_TELEFONO),
  };
}

export function armarPedido({ referencia, concepto, monto, medio, comprador, publico, token, tipo = PAGOPAR.TIPO_PEDIDO }) {
  const fisico = tipo === 'fisico';
  const entrega = fisico ? lugarDeEntrega() : { direccion: '', telefono: '' };
  return {
    token,
    public_key: publico,
    monto_total: monto,
    tipo_pedido: 'VENTA-COMERCIO',
    id_pedido_comercio: referencia,
    fecha_maxima_pago: fechaMaximaPago(),
    forma_pago: formaDePago(medio),
    descripcion_resumen: concepto,
    compras_items: [{
      nombre: concepto,
      descripcion: concepto,
      id_producto: 1,
      cantidad: 1,
      precio_total: monto,
      categoria: fisico ? PAGOPAR.CATEGORIA_FISICO : PAGOPAR.CATEGORIA_SERVICIO,
      ciudad: '1',
      public_key: publico,
      url_imagen: '',
      vendedor_telefono: entrega.telefono,
      vendedor_direccion: entrega.direccion,
      vendedor_direccion_referencia: '',
      vendedor_direccion_coordenadas: '',
      ...(fisico && { producto_fisico: true, ...PAGOPAR.MEDIDAS_FISICO }),
    }],
    comprador: {
      nombre: comprador?.nombre || INSTITUCION.NOMBRE,
      email: comprador?.correo || '',

      documento: String(comprador?.documento || '0000000').replace(/\D/g, ''),
      tipo_documento: 'CI',
      telefono: comprador?.telefono || '',
      ciudad: '1',
      direccion: entrega.direccion,
      ruc: '',
      coordenadas: '',
      razon_social: '',
      direccion_referencia: '',
    },
  };
}
