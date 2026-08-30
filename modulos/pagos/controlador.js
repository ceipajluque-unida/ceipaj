import * as servicio from './servicio.js';
import * as acreditacion from './acreditacion.js';
import { generarRecibo, numeroDeRecibo, marcarReciboEmitido } from './recibo.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { ESTADOS_PAGO, CHECKOUT } from '../../configuracion/ajustes.js';
import { buscarPlan, calcularCambio } from '../suscripciones/servicio.js';
import { esIncrustable } from './proveedor.js';

export async function medios(req, res) {
  res.json(await servicio.listarMedios());
}

async function validarMedio(medio, monto) {
  const habilitados = await servicio.listarMedios();
  const elegido = habilitados.find((opcion) => opcion.valor === medio);
  if (!elegido) throw new ErrorVisible('Ese medio de pago no está habilitado en la pasarela.');

  if (elegido.montoMinimo && monto < elegido.montoMinimo) {
    throw new ErrorVisible(`El mínimo para ${elegido.texto} es Gs. ${elegido.montoMinimo.toLocaleString('es-PY')}.`);
  }
}

function ajustesDeCheckout() {
  return {
    incrustado: CHECKOUT.INCRUSTADO && esIncrustable(),
    altoCheckout: CHECKOUT.ALTO_PIXELES,
    segundosConsulta: CHECKOUT.SEGUNDOS_CONSULTA,
    minutosEspera: CHECKOUT.MINUTOS_MAXIMO_ESPERA,
  };
}

export async function crear(req, res) {
  const { concepto, monto, medio } = req.body ?? {};
  const montoNumero = Number(monto);
  if (!concepto?.trim()) throw new ErrorVisible('El concepto es obligatorio.');
  if (!Number.isInteger(montoNumero) || montoNumero <= 0) {
    throw new ErrorVisible('El monto debe ser un entero positivo en guaraníes.');
  }
  await validarMedio(medio, montoNumero);
  const cobro = await servicio.crearCobro({ concepto: concepto.trim(), monto: montoNumero, medio }, req.usuario, req.ip);
  res.status(201).json({ ...cobro, ...ajustesDeCheckout() });
}

export async function pagarPlan(req, res) {
  const { plan, medio } = req.body ?? {};
  const elegido = await buscarPlan(plan);
  if (!elegido) throw new ErrorVisible('Elegí un plan válido.');

  const cambio = await calcularCambio(elegido.valor);
  if (cambio.tipo === 'no_permitido') throw new ErrorVisible(cambio.motivo, 409);
  if (cambio.aPagar <= 0) {
    throw new ErrorVisible('Ese cambio no lleva pago: usá el botón de bajar de plan.', 409);
  }
  await validarMedio(medio, cambio.aPagar);
  const detalle = cambio.tipo === 'mejora'
    ? `Cambio a plan ${elegido.texto} (diferencia)`
    : `Suscripción plan ${elegido.texto}`;
  const cobro = await servicio.crearCobro(
    { concepto: detalle, monto: cambio.aPagar, medio, plan: elegido.valor },
    req.usuario,
    req.ip
  );
  res.status(201).json({ ...cobro, ...ajustesDeCheckout(), cambio });
}

export async function listar(req, res) {
  res.json(await servicio.listarPagos());
}

export async function estado(req, res) {
  res.json(await servicio.estadoDePago(req.params.referencia));
}

export async function notificacion(req, res) {
  await acreditacion.procesarNotificacion(req.body, req.ip, req);

  res.json(req.body?.resultado ?? []);
}

export async function descartar(req, res) {
  res.json(await servicio.descartarPago(req.params.referencia, req.usuario, req.ip));
}

export async function conciliar(req, res) {
  res.json(await acreditacion.conciliarPendientes(req.ip));
}

export async function recibo(req, res) {
  const pago = await servicio.buscarPago(req.params.referencia);
  if (pago.estado !== ESTADOS_PAGO.EXITOSO) {
    throw new ErrorVisible('El recibo se emite recién cuando el pago está acreditado.', 409);
  }
  const ahora = new Date();
  const primera = !pago.recibo_emitido_en;
  if (primera) await marcarReciboEmitido(pago.id, ahora);
  const pdf = await generarRecibo(pago, {
    ahora,
    estado: primera ? 'Emitido' : 'Reimpreso',
    emitidoEn: pago.recibo_emitido_en ?? ahora,
  });
  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: primera ? 'recibo_emitido' : 'recibo_reimpreso',
    detalle: `${pago.referencia}, recibo ${numeroDeRecibo(pago)}`,
    ip: req.ip,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="recibo-${numeroDeRecibo(pago)}.pdf"`);
  res.send(pdf);
}
