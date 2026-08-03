// el checkout de la pasarela de prueba. sirve los datos del pedido y, al confirmar,
// emite el MISMO aviso firmado que mandaría la pasarela real, así el pago se acredita
// por el camino de producción y no por un atajo.
import { bd } from '../../servidor/bd/conexion.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { esSimulada } from './proveedor.js';
import { avisoDePago } from './pasarelas/simulada.js';
import { procesarNotificacion } from './acreditacion.js';

// si la pasarela activa es la real, esto no existe
function exigirSimulada() {
  if (!esSimulada()) throw new ErrorVisible('El checkout de prueba está desactivado.', 403);
}

async function buscarPedido(hash) {
  const [[pago]] = await bd.query(
    `SELECT p.referencia, p.concepto, p.monto, p.moneda, p.medio_pago, p.estado, i.nombre AS institucion
       FROM pagos p LEFT JOIN instituciones i ON i.id = p.institucion_id
      WHERE p.identificador_externo = ?`,
    [hash]
  );
  if (!pago) throw new ErrorVisible('El pedido no existe o ya venció.', 404);
  return pago;
}

export async function verPedido(req, res) {
  exigirSimulada();
  const pago = await buscarPedido(req.params.hash);
  res.json({
    referencia: pago.referencia,
    concepto: pago.concepto,
    monto: Number(pago.monto),
    moneda: pago.moneda,
    medio: pago.medio_pago,
    estado: pago.estado,
    institucion: pago.institucion,
  });
}

export async function pagar(req, res) {
  exigirSimulada();
  const pago = await buscarPedido(req.params.hash);
  if (pago.estado === 'exitoso') return res.json({ referencia: pago.referencia, estado: 'exitoso' });
  // se arma el aviso firmado y se lo hace pasar por el mismo control que el de la pasarela
  const aviso = avisoDePago({ hash: req.params.hash, monto: Number(pago.monto), medio: pago.medio_pago });
  const resultado = await procesarNotificacion(aviso, req.ip);
  res.json(resultado);
}
