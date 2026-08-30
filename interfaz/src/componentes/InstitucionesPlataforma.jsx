import { useState } from 'react';
import { Segmented, Table } from 'antd';
import { fecha, guaranies, legible, contar } from '../servicios/formato.js';
import Estado from './Estado.jsx';

const FILTROS = [
  { value: 'todas', label: 'Todas' },
  { value: 'vigente', label: 'Al día' },
  { value: 'vencido', label: 'Vencidas' },
  { value: 'sin_plan', label: 'Sin plan pago' },
];

// el estado del plan es lo primero que el proveedor necesita ver: quien esta al
// dia, a quien se le vence pronto y hace cuanto que alguien esta vencido.
function situacion(fila) {
  if (fila.estadoPlan === 'vigente') {
    const dias = fila.diasParaVencer;
    const pronto = dias <= 15;
    return (
      <span>
        <Estado tono={pronto ? 'pendiente' : 'exitoso'}>{pronto ? 'Vence pronto' : 'Vigente'}</Estado>
        <br />
        <small className="nota">
          {dias <= 0 ? 'vence hoy' : `quedan ${contar(dias, 'día', 'días')}`}, hasta el {fecha(fila.venceEl)}
        </small>
      </span>
    );
  }
  if (fila.estadoPlan === 'vencido') {
    return (
      <span>
        <Estado tono="rechazado">Vencido</Estado>
        <br />
        <small className="nota">
          hace {contar(fila.diasVencido, 'día', 'días')}, el {fecha(fila.vencioEl)}
        </small>
      </span>
    );
  }
  return (
    <span>
      <Estado>Nunca contrató</Estado>
      <br />
      <small className="nota">sigue en el plan Básico</small>
    </span>
  );
}

export default function InstitucionesPlataforma({ instituciones }) {
  const [filtro, setFiltro] = useState('todas');
  const filas = filtro === 'todas' ? instituciones : instituciones.filter((i) => i.estadoPlan === filtro);

  const columnas = [
    {
      title: 'Institución',
      dataIndex: 'nombre',
      render: (nombre, fila) => (
        <span>
          <strong>{nombre}</strong>
          <br />
          <small className="nota">
            {fila.ciudad || 'sin ciudad'}, alta el {fecha(fila.creado_en)}
          </small>
        </span>
      ),
    },
    {
      title: 'Plan',
      dataIndex: 'planVigente',
      width: 130,
      render: (vigente, fila) => (vigente
        ? legible(vigente)
        : fila.ultimoPlan
          ? <span className="nota">{legible(fila.ultimoPlan)}</span>
          : <span className="nota">—</span>),
    },
    { title: 'Situación del plan', key: 'situacion', width: 190, render: (_, fila) => situacion(fila) },
    { title: 'Usuarios', dataIndex: 'usuarios', align: 'right', width: 95 },
    { title: 'Aliados', dataIndex: 'aliados', align: 'right', width: 90 },
    { title: 'Interesados', dataIndex: 'interesados', align: 'right', width: 110 },
    {
      title: 'Pagado en total',
      dataIndex: 'pagado',
      render: guaranies,
      align: 'right',
      width: 140,
    },
    {
      title: 'Acceso',
      dataIndex: 'activo',
      width: 115,
      render: (activo) => <Estado tono={activo ? 'exitoso' : 'rechazado'}>{activo ? 'Activa' : 'Suspendida'}</Estado>,
    },
  ];

  const cuenta = (estado) => instituciones.filter((i) => i.estadoPlan === estado).length;

  return (
    <>
      <div className="barra-filtros">
        <Segmented
          value={filtro}
          onChange={setFiltro}
          options={FILTROS.map((f) => ({
            ...f,
            label: f.value === 'todas' ? `Todas (${instituciones.length})` : `${f.label} (${cuenta(f.value)})`,
          }))}
        />
      </div>
      {filas.length === 0
        ? <p className="nota">No hay ninguna institución en esa situación.</p>
        : (
          <div className="tabla-envoltura">
            <Table rowKey="id" columns={columnas} dataSource={filas} size="small" pagination={{ pageSize: 15 }} />
          </div>
        )}
    </>
  );
}
