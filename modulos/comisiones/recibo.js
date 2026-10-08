import { bd } from '../../servidor/bd/conexion.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { institucionActual } from '../../servidor/contexto.js';
import { guaraniesEnLetras } from '../../comun/numeroALetras.js';
import { dibujarRecibo } from '../pagos/reciboPdf.js';
import { enGuaranies, fechaYHora, fechaCorta, leyendasDelRecibo } from '../pagos/recibo.js';

export function numeroDeReciboComision(comision) {
  return `COM-${comision.id}`;
}

export async function buscarComisionPagada(id, { aliadoUsuarioId = null } = {}) {
  const [[comision]] = await bd.query(
    `SELECT c.id, c.monto, c.estado, c.creado_en, c.actualizado_en, c.recibo_emitido_en,
            a.usuario_id AS aliado_usuario_id, a.institucion AS aliado_institucion, a.cargo, a.telefono AS aliado_telefono,
            u.nombre AS aliado, u.correo AS aliado_correo,
            l.nombre AS interesado, l.cedula AS interesado_cedula,
            i.nombre AS colegio, i.ciudad, i.correo_contacto, i.telefono AS colegio_telefono, i.direccion
       FROM comisiones c
       JOIN aliados a ON a.id = c.aliado_id
       JOIN usuarios u ON u.id = a.usuario_id
       JOIN leads l ON l.id = c.lead_id
       JOIN instituciones i ON i.id = a.institucion_id
      WHERE c.id = ? AND a.institucion_id = ?`,
    [id, institucionActual()]
  );
  if (!comision) throw new ErrorVisible('Comisión no encontrada.', 404);
  if (aliadoUsuarioId !== null && comision.aliado_usuario_id !== aliadoUsuarioId) {
    throw new ErrorVisible('Comisión no encontrada.', 404);
  }
  if (comision.estado !== 'pagada') {
    throw new ErrorVisible('El recibo se emite recién cuando la comisión está pagada.', 409);
  }
  return comision;
}

export async function marcarReciboEmitido(id, cuando) {
  await bd.query('UPDATE comisiones SET recibo_emitido_en = ? WHERE id = ? AND recibo_emitido_en IS NULL', [cuando, id]);
}

export async function marcarEmision(comision) {
  const ahora = new Date();
  const primera = !comision.recibo_emitido_en;
  if (primera) await marcarReciboEmitido(comision.id, ahora);
  return { ahora, estado: primera ? 'Emitido' : 'Reimpreso', emitidoEn: comision.recibo_emitido_en ?? ahora };
}

export function generarReciboComision(comision, emision) {
  const trazabilidad = [
    ['Comisión generada el', fechaYHora(comision.creado_en)],
    ['Pagada el', fechaYHora(comision.actualizado_en)],
  ];
  if (emision.estado === 'Reimpreso') trazabilidad.push(['Emitido originalmente el', fechaYHora(emision.emitidoEn)]);

  return dibujarRecibo({
    titulo: 'RECIBO DE PAGO DE COMISIÓN',
    subtitulo: 'Documento no tributario, no válido como factura',
    numero: numeroDeReciboComision(comision),
    emision: {
      fecha: fechaCorta(emision.ahora),
      hora: emision.ahora.toLocaleTimeString('es-PY', { timeZone: 'America/Asuncion', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }),
      estado: emision.estado,
    },
    parIzquierdo: {
      titulo: 'EMISOR',
      lineas: [
        ['Institución', comision.colegio],
        ['Ciudad', comision.ciudad],
        ['Correo', comision.correo_contacto],
        ['Teléfono', comision.colegio_telefono],
      ],
    },
    parDerecho: {
      titulo: 'BENEFICIARIO',
      lineas: [
        ['Aliado', comision.aliado],
        ['Cargo', comision.cargo],
        ['Trabaja en', comision.aliado_institucion],
        ['Correo', comision.aliado_correo],
        ['Teléfono', comision.aliado_telefono],
      ],
    },
    concepto: {
      titulo: 'DETALLE DEL CONCEPTO',
      lineas: [
        ['Concepto del pago', 'Comisión por recomendación de un interesado matriculado'],
        ['Interesado matriculado', `${comision.interesado} (cédula ${comision.interesado_cedula})`],
        ['Referencia', numeroDeReciboComision(comision)],
      ],
    },
    monto: {
      items: [{ descripcion: `Comisión por la matrícula de ${comision.interesado}`, importe: enGuaranies(comision.monto) }],
      total: enGuaranies(comision.monto),
      moneda: 'Guaraníes',
      enLetras: guaraniesEnLetras(comision.monto),
    },
    formaPago: null,
    trazabilidad,
    leyendas: leyendasDelRecibo(),
  });
}
