import { useEffect, useState } from 'react';
import { Table } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { avisarError } from '../servicios/avisos.js';
import { fecha, legible } from '../servicios/formato.js';

export default function AliadosInstitucion({ institucion }) {
  const [aliados, setAliados] = useState(null);

  useEffect(() => {
    let vigente = true;
    llamarApi(`/api/instituciones/${institucion.id}/aliados`)
      .then((datos) => { if (vigente) setAliados(datos); })
      .catch((excepcion) => avisarError(excepcion.message));
    return () => { vigente = false; };
  }, [institucion.id]);

  if (!aliados) return <p className="nota">Cargando…</p>;

  const columnas = [
    {
      title: 'Aliado', key: 'nombre', width: 260,
      render: (_, aliado) => (
        <>
          <strong>{aliado.nombre}</strong>
          <span className="nota bajo-titulo">{aliado.correo}</span>
        </>
      ),
    },
    { title: 'Institución donde trabaja', dataIndex: 'institucion', key: 'institucion', render: (valor) => valor || '—' },
    { title: 'Cargo', dataIndex: 'cargo', key: 'cargo', render: (valor) => (valor ? legible(valor) : '—') },
    { title: 'Interesados', dataIndex: 'total_leads', key: 'total_leads' },
    { title: 'Matriculados', dataIndex: 'convertidos', key: 'convertidos' },
    { title: 'Puntos', dataIndex: 'puntos', key: 'puntos' },
    {
      title: 'Estado', dataIndex: 'activo', key: 'activo',
      render: (valor) => <span className={`estado estado-${valor ? 'exitoso' : 'rechazado'}`}>{valor ? 'Activo' : 'Inactivo'}</span>,
    },
    { title: 'Alta', dataIndex: 'creado_en', key: 'creado_en', render: (valor) => fecha(valor) },
  ];

  return (
    <>
      {aliados.length === 0 ? (
        <p className="nota">Todavía no tiene aliados.</p>
      ) : (
        <div className="tabla-envoltura">
          <Table columns={columnas} dataSource={aliados} rowKey="id" size="small" pagination={false} />
        </div>
      )}
    </>
  );
}
