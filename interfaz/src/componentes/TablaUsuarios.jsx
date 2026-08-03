import { Button, Select, Table } from 'antd';
import { fecha, legible } from '../servicios/formato.js';

export default function TablaUsuarios({ usuarios, miId, roles, alEditar, alCambiarRol, alCambiarActivo, alRestablecer }) {
  const columnas = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (valor, usuario) => (
        <>{valor} {usuario.id === miId && <span className="etiqueta">vos</span>}</>
      ),
    },
    { title: 'Correo', dataIndex: 'correo', key: 'correo' },
    { title: 'Celular', dataIndex: 'telefono', key: 'telefono', render: (valor) => valor || '—' },
    {
      title: 'Rol',
      dataIndex: 'rol',
      key: 'rol',
      render: (valor, usuario) => (usuario.id === miId ? legible(valor) : (
        <Select
          size="small"
          value={valor}
          style={{ width: 150 }}
          aria-label={`Rol de ${usuario.nombre}`}
          options={roles.map((rol) => ({ value: rol, label: legible(rol) }))}
          onChange={(rol) => alCambiarRol(usuario, rol)}
        />
      )),
    },
    {
      title: 'Verificación',
      dataIndex: 'activado_2fa',
      key: 'activado_2fa',
      render: (valor) => (valor ? 'Configurada' : 'Pendiente'),
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      render: (valor) => <span className={`estado estado-${valor ? 'exitoso' : 'rechazado'}`}>{valor ? 'Activo' : 'Inactivo'}</span>,
    },
    { title: 'Alta', dataIndex: 'creado_en', key: 'creado_en', render: (valor) => fecha(valor) },
    { title: 'Último cambio', dataIndex: 'actualizado_en', key: 'actualizado_en', render: (valor) => fecha(valor) },
    {
      title: <span className="oculto-visual">Acciones</span>,
      key: 'acciones',
      render: (_, usuario) => (
        <div className="acciones">
          <Button size="small" onClick={() => alEditar(usuario)}>Editar</Button>
          <Button size="small" onClick={() => alRestablecer(usuario)}>Restablecer clave</Button>
          {usuario.id !== miId && (
            <Button size="small" danger={usuario.activo} onClick={() => alCambiarActivo(usuario)}>
              {usuario.activo ? 'Desactivar' : 'Activar'}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="tabla-envoltura">
      <Table columns={columnas} dataSource={usuarios} rowKey="id" size="small" pagination={false} />
    </div>
  );
}
