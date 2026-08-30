import { useEffect, useState } from 'react';
import { Table } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { nombreModulo, contar } from '../servicios/formato.js';
import { nombreDeRol } from '../servicios/nombresRol.js';

export default function RolesInstitucion({ institucionId, ruta, refresco }) {
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState(null);

  // refresco cambia cada vez que se dan de alta o se editan usuarios: sin esto
  // los conteos quedaban congelados en lo que había al abrir la pantalla
  useEffect(() => {
    llamarApi(ruta ?? `/api/instituciones/${institucionId}/roles`).then(setDetalle).catch((e) => setError(e.message));
  }, [institucionId, ruta, refresco]);

  if (error) return <p className="error">{error}</p>;
  if (!detalle) return <p className="nota">Cargando…</p>;

  const columnas = [
    { title: 'Rol', dataIndex: 'rol', key: 'rol', width: 240, render: (rol, fila) => <strong>{fila.titulo ?? nombreDeRol(rol)}</strong> },
    {
      title: 'Usuarios', key: 'usuarios', width: 160,
      render: (_, fila) => (fila.usuarios === 0
        ? <span className="nota">Sin usuarios</span>
        : `${contar(fila.activos, 'activo', 'activos')} de ${fila.usuarios}`),
    },
    {
      title: 'Módulos habilitados',
      key: 'modulos',
      render: (_, fila) => (fila.modulos.length === 0
        ? <span className="nota">Ninguno</span>
        : <span>{fila.modulos.map((modulo) => nombreModulo(modulo)).join(', ')}</span>),
    },
  ];

  const { cupo } = detalle;
  // dos frases cortas se entienden; encadenar dos "sin tope" con una y, no
  const cuenta = (usados, maximo) => (maximo === null ? `${usados}, sin tope` : `${usados} de ${maximo}`);

  return (
    <>
      {cupo && (
        <p className="nota">
          Plan {cupo.plan}. Usuarios internos: {cuenta(cupo.usuarios, cupo.maxUsuarios)}.
          {' '}Aliados: {cuenta(cupo.aliados, cupo.maxAliados)}.
        </p>
      )}
      <div className="tabla-envoltura">
        <Table columns={columnas} dataSource={detalle.roles} rowKey="rol" size="small" pagination={false} />
      </div>
    </>
  );
}
