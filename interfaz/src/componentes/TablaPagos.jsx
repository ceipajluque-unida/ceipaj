import { Button, Table } from 'antd';
import { guaranies, legible, fechaHora } from '../servicios/formato.js';

const TEXTO_ESTADO = { pendiente: 'Pendiente', exitoso: 'Pagado', rechazado: 'Rechazado' };

export default function TablaPagos({ pagos, textoMedio, esAdministrador, bajando, alBajarRecibo, alRetomar }) {
  const columnas = [
    { title: 'Referencia', dataIndex: 'referencia', key: 'referencia' },
    { title: 'Concepto', dataIndex: 'concepto', key: 'concepto' },
    {
      title: 'Medio',
      dataIndex: 'forma_pago_externa',
      key: 'medio',

      render: (valor, pago) => valor ?? textoMedio(pago.medio_pago),
    },
    { title: 'Monto', dataIndex: 'monto', key: 'monto', render: (valor) => guaranies(valor) },
    {
      title: 'Creado el',
      dataIndex: 'creado_en',
      key: 'creado_en',
      render: (valor) => <span className="sin-cortar">{fechaHora(valor)}</span>,
    },
    {
      title: 'Pagado el',
      dataIndex: 'fecha_pago',
      key: 'fecha_pago',
      render: (valor) => (valor ? <span className="sin-cortar">{fechaHora(valor)}</span> : '—'),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (valor) => <span className={`estado estado-${valor}`}>{TEXTO_ESTADO[valor] ?? legible(valor)}</span>,
    },
    {
      title: <span className="oculto-visual">Acciones</span>,
      key: 'acciones',
      render: (_, pago) => (
        <div className="acciones">
          {pago.estado === 'exitoso' && (
            <Button
              size="small"
              disabled={bajando === pago.referencia}
              aria-label={`Descargar el recibo del cobro ${pago.referencia}`}
              onClick={() => alBajarRecibo(pago.referencia)}
            >
              {bajando === pago.referencia ? 'Descargando…' : 'Recibo'}
            </Button>
          )}
          {esAdministrador && pago.estado === 'pendiente' && pago.url_pago && (
            <Button size="small" aria-label={`Retomar el pago ${pago.referencia}`} onClick={() => alRetomar(pago)}>
              Retomar pago
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="tabla-envoltura">
      <Table columns={columnas} dataSource={pagos} rowKey="referencia" size="small" pagination={false} />
    </div>
  );
}
