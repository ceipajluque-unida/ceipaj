import { bd } from '../../servidor/bd/conexion.js';
import { enviarCorreo, correoConfigurado } from '../../servidor/correo.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { armarMensajeDeRecibo } from '../../comun/mensajeRecibo.js';
import { generarRecibo, numeroDeRecibo, enGuaranies, fechaCorta, nombreDelEmisor, marcarReciboEmitido } from './recibo.js';

// el envío no puede voltear un cobro ya confirmado: si el correo falla queda en el log
// del servidor y el recibo se sigue descargando desde la pantalla
export async function despacharRecibo({ para, mensaje, pdf, auditoria }) {
  const { enviado, motivo } = await enviarCorreo({
    para,
    asunto: mensaje.asunto,
    texto: mensaje.texto,
    adjuntos: [{ filename: mensaje.archivo, content: pdf, contentType: 'application/pdf' }],
  });
  if (enviado) await registrarAuditoria(auditoria);
  else console.error(`recibo ${mensaje.archivo} sin enviar:`, motivo);
  return { enviado };
}

// va al correo de contacto de la institución, que es el que el propio recibo imprime como
// correo del pagador; si la institución no lo tiene cargado, al de quien inició el cobro
async function destinatario(pagoId) {
  const [[fila]] = await bd.query(
    `SELECT i.correo_contacto, u.correo FROM pagos p
       LEFT JOIN instituciones i ON i.id = p.institucion_id
       LEFT JOIN usuarios u ON u.id = p.creado_por
      WHERE p.id = ?`,
    [pagoId]
  );
  return fila?.correo_contacto || fila?.correo || null;
}

export async function enviarReciboDePago(pagoId, usuarioId, ip) {
  try {
    if (!correoConfigurado()) return { enviado: false };
    const [[pago]] = await bd.query('SELECT * FROM pagos WHERE id = ?', [pagoId]);
    if (!pago) return { enviado: false };
    const para = await destinatario(pagoId);
    if (!para) return { enviado: false };

    const ahora = new Date();
    const primera = !pago.recibo_emitido_en;
    const numero = numeroDeRecibo(pago);
    const pdf = await generarRecibo(pago, {
      ahora,
      estado: primera ? 'Emitido' : 'Reimpreso',
      emitidoEn: pago.recibo_emitido_en ?? ahora,
    });
    const mensaje = armarMensajeDeRecibo({
      numero,
      asunto: `Recibo ${numero}: ${pago.concepto}`,
      saludo: 'Estimados',
      lineas: [
        ['Concepto', pago.concepto],
        ['Monto', enGuaranies(pago.monto)],
        ['Acreditado el', fechaCorta(pago.fecha_pago ?? ahora)],
      ],
      firma: nombreDelEmisor(),
    });

    const { enviado } = await despacharRecibo({
      para,
      mensaje,
      pdf,
      auditoria: {
        usuarioId,
        accion: 'recibo_enviado',
        detalle: `${pago.referencia}, recibo ${numero} a ${para}`,
        ip,
      },
    });
    // recién con el correo despachado el recibo cuenta como emitido; si no salió,
    // la primera descarga sigue siendo la emisión original
    if (enviado && primera) await marcarReciboEmitido(pago.id, ahora);
    return { enviado };
  } catch (error) {
    console.error('recibo del pago por correo:', error.message);
    return { enviado: false };
  }
}
