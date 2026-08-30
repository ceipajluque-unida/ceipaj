import { useEffect, useState } from 'react';
import { Table } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { legible, nombreModulo, contar } from '../servicios/formato.js';

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
    { title: 'Rol', dataIndex: 'rol', key: 'rol', width: 240, render: (rol) => <strong>{legible(rol)}</strong> },
    {
      title: 'Usuarios', key: 'usuarios', width: 160,
      render: (_, fila) => (fila.usuarios === 0
        ? <span className="nota">Sin usuarios</span>
        : `${contar(fila.activos, 'activo', 'activos')} de ${fila.usuarios}`),
    },
    {
      title: 'Módulos a los que entra',
      key: 'modulos',
      render: (_, fila) => (fila.modulos.length === 0
        ? <span className="nota">Ninguno</span>
        : <span>{fila.modulos.map((modulo) => nombreModulo(modulo)).join(', ')}</span>),
    },
  ];

  const { cupo } = detalle;
  const tope = (usados, maximo, singular, plural) => (maximo === null
    ? `${contar(usados, singular, plural)}, sin tope`
    : `${usados} de ${maximo} ${plural}`);

  return (
    <>
      {cupo && (
        <p className="nota">
          Con el plan {cupo.plan} puede tener{' '}
          {tope(cupo.usuarios, cupo.maxUsuarios, 'usuario interno', 'usuarios internos')} y{' '}
          {tope(cupo.aliados, cupo.maxAliados, 'aliado', 'aliados')}.
          {' '}Abajo, qué ve cada rol dentro de esta institución.
        </p>
      )}
      <Table
        className="tabla-roles"
        columns={columnas}
        dataSource={detalle.roles}
        rowKey="rol"
        size="small"
        pagination={false}
      />
    </>
  );
}
