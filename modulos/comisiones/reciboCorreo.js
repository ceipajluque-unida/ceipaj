import { armarMensajeDeRecibo } from '../../comun/mensajeRecibo.js';
import { correoConfigurado } from '../../servidor/correo.js';
import { despacharRecibo } from '../pagos/reciboCorreo.js';
import { enGuaranies, fechaCorta } from '../pagos/recibo.js';
import { buscarComisionPagada, generarReciboComision, numeroDeReciboComision, marcarReciboEmitido } from './recibo.js';

// el recibo de la comisión va al aliado, que es quien cobra
export async function enviarReciboDeComision(id, usuarioId, ip) {
  try {
    if (!correoConfigurado()) return { enviado: false };
    const comision = await buscarComisionPagada(id);
    if (!comision.aliado_correo) return { enviado: false };

    const ahora = new Date();
    const primera = !comision.recibo_emitido_en;
    const numero = numeroDeReciboComision(comision);
    const pdf = await generarReciboComision(comision, {
      ahora,
      estado: primera ? 'Emitido' : 'Reimpreso',
      emitidoEn: comision.recibo_emitido_en ?? ahora,
    });
    const mensaje = armarMensajeDeRecibo({
      numero,
      asunto: `Recibo ${numero}: pago de comisión`,
      saludo: `Hola ${comision.aliado}`,
      lineas: [
        ['Concepto', `Comisión por la matrícula de ${comision.interesado}`],
        ['Monto', enGuaranies(comision.monto)],
        ['Pagada el', fechaCorta(comision.actualizado_en ?? ahora)],
      ],
      firma: comision.colegio,
    });

    const { enviado } = await despacharRecibo({
      para: comision.aliado_correo,
      mensaje,
      pdf,
      auditoria: {
        usuarioId,
        accion: 'recibo_comision_enviado',
        detalle: `${numero} a ${comision.aliado_correo}`,
        ip,
      },
    });
    if (enviado && primera) await marcarReciboEmitido(comision.id, ahora);
    return { enviado };
  } catch (error) {
    console.error('recibo de la comisión por correo:', error.message);
    return { enviado: false };
  }
}
