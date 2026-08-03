// capa http del módulo de pagos: valida entradas, llama al servicio y responde json
import * as servicio from './servicio.js';
import * as acreditacion from './acreditacion.js';
import { generarRecibo, numeroDeRecibo } from './recibo.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { ESTADOS_PAGO, MEDIOS_PAGO, CHECKOUT } from '../../configuracion/ajustes.js';
import { buscarPlan } from '../suscripciones/servicio.js';

// medios de pago que ofrece la pasarela, para armar el desplegable del formulario
export async function medios(req, res) {
  res.json(await servicio.listarMedios());
}

// el medio tiene que ser uno del sistema y estar habilitado, con su monto mínimo respetado
async function validarMedio(medio, monto) {
  if (!MEDIOS_PAGO.some((opcion) => opcion.valor === medio)) {
    throw new ErrorVisible('Elegí un medio de pago válido.');
  }
  const habilitados = await servicio.listarMedios();
  const elegido = habilitados.find((opcion) => opcion.valor === medio);
  if (!elegido) throw new ErrorVisible('Ese medio de pago no está habilitado en la pasarela.');
  // así el rechazo sale acá y no después de haberle pedido el pedido a la pasarela
  if (elegido.montoMinimo && monto < elegido.montoMinimo) {
    throw new ErrorVisible(`El mínimo para ${elegido.texto} es Gs. ${elegido.montoMinimo.toLocaleString('es-PY')}.`);
  }
}

// lo que necesita la pantalla para mostrar el checkout y esperar la confirmación
function ajustesDeCheckout() {
  return {
    incrustado: CHECKOUT.INCRUSTADO,
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

// cobro de un plan de suscripción. el monto sale del plan, nunca del navegador
export async function pagarPlan(req, res) {
  const { plan, medio } = req.body ?? {};
  const elegido = await buscarPlan(plan);
  if (!elegido) throw new ErrorVisible('Elegí un plan válido.');
  await validarMedio(medio, elegido.precio);
  const cobro = await servicio.crearCobro(
    { concepto: `Suscripción plan ${elegido.texto}`, monto: elegido.precio, medio, plan: elegido.valor },
    req.usuario,
    req.ip
  );
  res.status(201).json({ ...cobro, ...ajustesDeCheckout() });
}

export async function listar(req, res) {
  res.json(await servicio.listarPagos());
}

// la pantalla de pago consulta esto cada pocos segundos mientras el usuario paga
export async function estado(req, res) {
  res.json(await servicio.estadoDePago(req.params.referencia));
}

// acá avisa la pasarela, va sin sesión: la defensa es la firma que valida el adaptador
export async function notificacion(req, res) {
  await acreditacion.procesarNotificacion(req.body, req.ip);
  // pagopar exige el eco del array "resultado", si no reintenta el aviso cada 10 minutos
  res.json(req.body?.resultado ?? []);
}

// consulta el estado real de los pagos que quedaron pendientes
export async function conciliar(req, res) {
  res.json(await acreditacion.conciliarPendientes(req.ip));
}

// recibo de dinero del pago, solo cuando está acreditado
export async function recibo(req, res) {
  const pago = await servicio.buscarPago(req.params.referencia);
  if (pago.estado !== ESTADOS_PAGO.EXITOSO) {
    throw new ErrorVisible('El recibo se emite recién cuando el pago está acreditado.', 409);
  }
  const pdf = await generarRecibo(pago);
  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'recibo_descargado',
    detalle: `${pago.referencia} · recibo ${numeroDeRecibo(pago)}`,
    ip: req.ip,
  });
  // los headers van después de generar, si falla el pdf el error sale como json
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="recibo-${numeroDeRecibo(pago)}.pdf"`);
  res.send(pdf);
}
