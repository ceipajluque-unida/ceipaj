import { guaranies, contar } from '../servicios/formato.js';

// cada recuadro tiene que decir por si solo de que habla: un numero suelto con
// una etiqueta de una palabra no se entiende.
function cifra(etiqueta, valor, detalle) {
  return (
    <div className="tarjeta-cifra" key={etiqueta}>
      <strong>{valor}</strong>
      <span>{etiqueta}</span>
      {detalle && <small>{detalle}</small>}
    </div>
  );
}

export default function CifrasPlataforma({ resumen }) {
  const r = resumen;
  return (
    <>
      <div className="cifras">
        {cifra('Instituciones registradas', r.instituciones,
          `${contar(r.activas, 'activa', 'activas')}, ${contar(r.suspendidas, 'suspendida', 'suspendidas')}`)}

        {cifra('Con plan pago vigente', `${r.conPlanVigente} de ${r.instituciones}`,
          r.sinPlanPago > 0
            ? `${contar(r.sinPlanPago, 'institución sigue', 'instituciones siguen')} en el plan Free`
            : 'todas están al día')}

        {cifra('Ingreso mensual aproximado', guaranies(r.ingresoMensual),
          'cálculo en base a planes activos')}

        {cifra('Cobrado en total', guaranies(r.recaudado),
          r.pagos === 0
            ? 'todavía no se acreditó ningún pago'
            : contar(r.pagos, 'pago acreditado', 'pagos acreditados'))}

        {cifra('Cobros sin acreditar', guaranies(r.montoPendiente),
          r.pagosPendientes === 0
            ? 'no hay cobros pendientes'
            : `${contar(r.pagosPendientes, 'pedido de pago', 'pedidos de pago')} que todavía nadie pagó`)}

        {cifra('Solicitudes sin atender', r.solicitudesNuevas,
          r.solicitudesNuevas === 0
            ? 'no hay pedidos nuevos desde la página pública'
            : 'instituciones con solicitud de contrato desde la página web')}
      </div>

      <p className="nota">
        En total, las instituciones tienen cargados {contar(r.usuarios, 'usuario interno', 'usuarios internos')},
        {' '}{contar(r.aliados, 'aliado institucional', 'aliados institucionales')} y
        {' '}{contar(r.interesados, 'interesado', 'interesados')}.
      </p>
    </>
  );
}
