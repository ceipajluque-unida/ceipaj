// listado de interesados con su estado y su última interacción
import { Link, useNavigate } from 'react-router-dom';
import { Button, Table } from 'antd';
import { fecha, legible } from '../servicios/formato.js';

// la fila apagada evita confundir un dado de baja con uno que sigue en seguimiento
const FILA_DE_BAJA = { opacity: 0.55 };

export default function TablaLeads({ leads }) {
  const navegar = useNavigate();

  const columnas = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (valor, lead) => <Link to={`/leads/${lead.id}`}>{valor}</Link>,
    },
    { title: 'Cédula', dataIndex: 'cedula', key: 'cedula' },
    { title: 'Canal', dataIndex: 'canal', key: 'canal', render: (valor) => legible(valor) },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (valor, lead) => (
        <>
          <span className={`estado estado-${valor}`}>{legible(valor)}</span>
          {!lead.activo && <p className="nota">Baja: {lead.motivo_baja || 'sin motivo anotado'}</p>}
        </>
      ),
    },
    { title: 'Aliado', dataIndex: 'aliado', key: 'aliado', render: (valor) => valor ?? '—' },
    {
      title: 'Última interacción',
      dataIndex: 'ultima_interaccion',
      key: 'ultima_interaccion',
      render: (valor) => <span className="sin-cortar">{valor ? fecha(valor) : 'Sin contacto'}</span>,
    },
    {
      title: <span className="oculto-visual">Acciones</span>,
      key: 'acciones',
      render: (_, lead) => <Button size="small" onClick={() => navegar(`/leads/${lead.id}`)}>Ver ficha</Button>,
    },
  ];

  return (
    <div className="tabla-envoltura">
      <Table
        columns={columnas}
        dataSource={leads}
        rowKey="id"
        size="small"
        pagination={false}
        onRow={(lead) => (lead.activo ? {} : { style: FILA_DE_BAJA })}
      />
    </div>
  );
}
