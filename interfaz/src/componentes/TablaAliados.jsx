// padrón de aliados con sus totales y las acciones de editar, reenviar acceso y activar
import { Button, Table } from 'antd';
import { legible } from '../servicios/formato.js';

// total viene aparte de la lista visible para distinguir "no hay nada" de "el filtro no encontró"
export default function TablaAliados({ aliados, total, soloLectura, alEditar, alReenviarAcceso, alCambiarActivo }) {
  const columnas = [
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    { title: 'Institución', dataIndex: 'institucion', key: 'institucion' },
    { title: 'Cargo', dataIndex: 'cargo', key: 'cargo', render: (valor) => legible(valor) },
    {
      title: 'Contacto',
      dataIndex: 'correo',
      key: 'correo',
      render: (valor, aliado) => (
        <>
          {valor}
          {aliado.telefono && <><br /><span className="nota">{aliado.telefono}</span></>}
        </>
      ),
    },
    { title: 'Recomendados', dataIndex: 'total_leads', key: 'total_leads' },
    { title: 'Matriculados', dataIndex: 'convertidos', key: 'convertidos' },
    { title: 'Puntos', dataIndex: 'puntos', key: 'puntos' },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      render: (valor) => <span className={`estado estado-${valor ? 'exitoso' : 'rechazado'}`}>{valor ? 'Activo' : 'Inactivo'}</span>,
    },
  ];

  if (!soloLectura) {
    columnas.push({
      title: <span className="oculto-visual">Acciones</span>,
      key: 'acciones',
      render: (_, aliado) => (
        <div className="acciones">
          <Button size="small" aria-label={`Editar a ${aliado.nombre}`} onClick={() => alEditar(aliado)}>Editar</Button>
          <Button size="small" aria-label={`Reenviar el acceso a ${aliado.nombre}`} onClick={() => alReenviarAcceso(aliado)}>Reenviar acceso</Button>
          <Button
            size="small"
            danger={Boolean(aliado.activo)}
            aria-label={`${aliado.activo ? 'Desactivar' : 'Activar'} a ${aliado.nombre}`}
            onClick={() => alCambiarActivo(aliado)}
          >
            {aliado.activo ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      ),
    });
  }

  if (total === 0) {
    return (
      <p className="nota">
        {soloLectura ? 'Todavía no hay aliados cargados.' : 'Todavía no hay aliados. Creá el primero con el botón de arriba.'}
      </p>
    );
  }
  if (aliados.length === 0) return <p className="nota">Ningún aliado coincide con lo que buscaste.</p>;

  return (
    <div className="tabla-envoltura">
      <Table columns={columnas} dataSource={aliados} rowKey="id" size="small" pagination={false} />
    </div>
  );
}
