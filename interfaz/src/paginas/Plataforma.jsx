import { useEffect, useState } from 'react';
import { Table, Tag } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { avisarError } from '../servicios/avisos.js';
import { contar, fecha, guaranies, legible } from '../servicios/formato.js';

const cifra = (etiqueta, valor, detalle) => (
  <div className="tarjeta-cifra" key={etiqueta}>
    <strong>{valor}</strong>
    <span>{etiqueta}</span>
    {detalle && <small>{detalle}</small>}
  </div>
);

export default function Plataforma() {
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    llamarApi('/api/plataforma').then(setDatos).catch((e) => avisarError(e.message));
  }, []);

  if (!datos) return <p className="mensaje-centrado">Cargando…</p>;
  const { resumen, planes, instituciones, meses } = datos;

  const columnasPlan = [
    { title: 'Plan', dataIndex: 'titulo' },
    { title: 'Precio', dataIndex: 'precio', render: guaranies, align: 'right', width: 130 },
    { title: 'Instituciones con el plan', dataIndex: 'institucionesVigentes', align: 'right', width: 190 },
    { title: 'Períodos contratados', dataIndex: 'periodosContratados', align: 'right', width: 170 },
    { title: 'Recaudado', dataIndex: 'recaudado', render: guaranies, align: 'right', width: 140 },
  ];

  const columnasInstitucion = [
    { title: 'Institución', dataIndex: 'nombre' },
    { title: 'Ciudad', dataIndex: 'ciudad', render: (v) => v || '—', width: 120 },
    {
      title: 'Plan vigente',
      dataIndex: 'planVigente',
      width: 150,
      render: (valor, fila) => (valor
        ? <span>{legible(valor)}<br /><small className="nota">hasta el {fecha(fila.venceEl)}</small></span>
        : <span className="nota">Sin plan vigente</span>),
    },
    { title: 'Usuarios', dataIndex: 'usuarios', align: 'right', width: 90 },
    { title: 'Aliados', dataIndex: 'aliados', align: 'right', width: 90 },
    { title: 'Interesados', dataIndex: 'interesados', align: 'right', width: 110 },
    { title: 'Pagado', dataIndex: 'pagado', render: guaranies, align: 'right', width: 130 },
    {
      title: 'Estado',
      dataIndex: 'activo',
      width: 110,
      render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Activa' : 'Suspendida'}</Tag>,
    },
  ];

  const columnasMes = [
    { title: 'Mes', dataIndex: 'mes', width: 120 },
    { title: 'Pagos acreditados', dataIndex: 'pagos', align: 'right', width: 160 },
    { title: 'Recaudado', dataIndex: 'recaudado', render: guaranies, align: 'right' },
  ];

  return (
    <>
      <section className="panel">
        <header className="cabecera-panel">
          <h2>Estadísticas de la plataforma</h2>
          <p className="nota">Las cifras salen de todas las instituciones juntas.</p>
        </header>
        <div className="cifras">
          {cifra('Instituciones', resumen.instituciones, contar(resumen.activas, 'activa', 'activas'))}
          {cifra('Usuarios internos', resumen.usuarios, contar(resumen.aliados, 'aliado', 'aliados'))}
          {cifra('Con plan vigente', resumen.conPlanVigente, 'de ' + contar(resumen.instituciones, 'institución', 'instituciones'))}
          {cifra('Recaudado', guaranies(resumen.recaudado), contar(resumen.pagos, 'pago acreditado', 'pagos acreditados'))}
          {cifra('Cobros pendientes', resumen.pagosPendientes)}
          {cifra('Solicitudes sin atender', resumen.solicitudesNuevas)}
        </div>
      </section>

      <section className="panel">
        <h3>Qué aporta cada plan</h3>
        <Table rowKey="clave" columns={columnasPlan} dataSource={planes} size="small" pagination={false} />
      </section>

      <section className="panel">
        <h3>Instituciones</h3>
        <Table rowKey="id" columns={columnasInstitucion} dataSource={instituciones} size="small" pagination={{ pageSize: 15 }} />
      </section>

      <section className="panel">
        <h3>Recaudación por mes</h3>
        {meses.length === 0
          ? <p className="nota">Todavía no hay pagos acreditados con fecha.</p>
          : <Table rowKey="mes" columns={columnasMes} dataSource={meses} size="small" pagination={false} />}
      </section>
    </>
  );
}
