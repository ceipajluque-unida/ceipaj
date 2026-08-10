import { useEffect, useState } from 'react';
import { Table } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { avisarError } from '../servicios/avisos.js';
import { fecha, guaranies } from '../servicios/formato.js';

export default function PortalComisiones() {
  const [comisiones, setComisiones] = useState(null);

  useEffect(() => {
    llamarApi('/api/portal/comisiones').then(setComisiones).catch((e) => avisarError(e.message));
  }, []);

  if (!comisiones) return <p className="mensaje-centrado">Cargando…</p>;

  const pendiente = comisiones.filter((c) => c.estado === 'pendiente').reduce((suma, c) => suma + Number(c.monto), 0);
  const pagada = comisiones.filter((c) => c.estado === 'pagada').reduce((suma, c) => suma + Number(c.monto), 0);

  const columnas = [
    { title: 'Interesado', dataIndex: 'interesado', key: 'interesado' },
    { title: 'Monto', dataIndex: 'monto', key: 'monto', render: (valor) => guaranies(valor) },
    {
      title: 'Estado', dataIndex: 'estado', key: 'estado',
      render: (valor) => (
        <span className={`estado estado-${valor}`}>{valor === 'pagada' ? 'Pagada' : 'Pendiente de pago'}</span>
      ),
    },
    {
      title: 'Generada el', dataIndex: 'creado_en', key: 'creado_en',
      render: (valor) => <span className="sin-cortar">{fecha(valor)}</span>,
    },
  ];

  return (
    <>
      <header className="encabezado-pagina"><h2>Mis comisiones</h2></header>

      <section className="cuadricula sep-abajo">
        <article className="indicador">
          <h3>Pendiente de pago</h3>
          <p className="cifra">{guaranies(pendiente)}</p>
        </article>
        <article className="indicador">
          <h3>Cobrado</h3>
          <p className="cifra">{guaranies(pagada)}</p>
        </article>
      </section>

      <section className="panel">
        {comisiones.length === 0 && <p className="nota">Todavía no hay comisiones.</p>}
        {comisiones.length > 0 && (
          <div className="tabla-envoltura">
            <Table columns={columnas} dataSource={comisiones} rowKey="id" size="small" pagination={false} />
          </div>
        )}
      </section>
    </>
  );
}
