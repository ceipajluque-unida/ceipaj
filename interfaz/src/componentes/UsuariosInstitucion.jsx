import { useEffect, useState } from 'react';
import { Button, Table } from 'antd';
import Modal from './Modal.jsx';
import FormularioUsuario from './FormularioUsuario.jsx';
import { llamarApi } from '../servicios/api.js';
import { confirmar, avisarError, toast, mostrarClave } from '../servicios/avisos.js';
import { legible } from '../servicios/formato.js';

const VACIO = { nombre: '', correo: '', telefono: '', direccion: '' };

export default function UsuariosInstitucion({ institucion }) {
  const [usuarios, setUsuarios] = useState(null);
  const [editando, setEditando] = useState(null);
  const [formulario, setFormulario] = useState(VACIO);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const base = `/api/instituciones/${institucion.id}/usuarios`;

  async function cargar() {
    try { setUsuarios(await llamarApi(base)); } catch (excepcion) { avisarError(excepcion.message); }
  }
  useEffect(() => { cargar(); }, [institucion.id]);

  function abrirEdicion(usuario) {
    setError(null);
    setEditando(usuario);
    setFormulario({
      nombre: usuario.nombre,
      correo: usuario.correo,
      telefono: usuario.telefono ?? '',
      direccion: usuario.direccion ?? '',
    });
  }

  async function guardar(evento) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await llamarApi(`${base}/${editando.id}`, { metodo: 'PUT', cuerpo: formulario });
      setEditando(null);
      await cargar();
      toast('Usuario actualizado.');
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setCargando(false);
    }
  }

  async function restablecer(usuario) {
    const ok = await confirmar({
      titulo: `¿Restablecer la contraseña de ${usuario.nombre}?`,
      texto: 'La actual deja de servir en el momento.',
      confirmar: 'Sí, restablecer',
      peligro: true,
    });
    if (!ok) return;
    try {
      const respuesta = await llamarApi(`${base}/${usuario.id}/restablecer`, { metodo: 'POST' });
      if (respuesta.claveTemporal) mostrarClave(respuesta.claveTemporal, 'Contraseña temporal de', usuario.correo);
      else toast('Las credenciales se enviaron por correo.');
    } catch (excepcion) { avisarError(excepcion.message); }
  }

  async function cambiarActivo(usuario) {
    const desactivar = Boolean(usuario.activo);
    const ok = await confirmar({
      titulo: desactivar ? `¿Desactivar a ${usuario.nombre}?` : `¿Reactivar a ${usuario.nombre}?`,
      texto: desactivar ? 'No va a poder ingresar hasta reactivarlo.' : 'Vuelve a poder ingresar.',
      confirmar: desactivar ? 'Sí, desactivar' : 'Sí, reactivar',
      peligro: desactivar,
    });
    if (!ok) return;
    try {
      await llamarApi(`${base}/${usuario.id}/activo`, { metodo: 'PUT', cuerpo: { activo: !usuario.activo } });
      await cargar();
      toast(desactivar ? 'Usuario desactivado.' : 'Usuario reactivado.');
    } catch (excepcion) { avisarError(excepcion.message); }
  }

  if (!usuarios) return <p className="nota">Cargando…</p>;

  const columnas = [
    {
      title: 'Usuario', key: 'nombre', width: 260,
      render: (_, usuario) => (
        <>
          <strong>{usuario.nombre}</strong>
          <span className="nota bajo-titulo">{usuario.correo}</span>
        </>
      ),
    },
    { title: 'Rol', dataIndex: 'rol', key: 'rol', render: (valor) => legible(valor) },
    {
      title: 'Estado', dataIndex: 'activo', key: 'activo',
      render: (valor) => <span className={`estado estado-${valor ? 'exitoso' : 'rechazado'}`}>{valor ? 'Activo' : 'Inactivo'}</span>,
    },
    {
      title: <span className="oculto-visual">Acciones</span>, key: 'acciones',
      render: (_, usuario) => (
        <div className="acciones">
          <Button size="small" onClick={() => abrirEdicion(usuario)}>Editar</Button>
          <Button size="small" onClick={() => restablecer(usuario)}>Restablecer clave</Button>
          <Button size="small" danger={Boolean(usuario.activo)} onClick={() => cambiarActivo(usuario)}>
            {usuario.activo ? 'Desactivar' : 'Reactivar'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <h4>Usuarios registrados</h4>
      {usuarios.length === 0 ? (
        <p className="nota">Todavía no tiene usuarios. El botón «Administrador» crea el primero.</p>
      ) : (
        <Table className="tabla-roles" columns={columnas} dataSource={usuarios} rowKey="id" size="small" pagination={false} />
      )}
      <Modal abierto={Boolean(editando)} titulo={`Editar a ${editando?.nombre ?? ''}`} alCerrar={() => setEditando(null)}>
        <FormularioUsuario
          formulario={formulario} alCambiar={setFormulario} roles={[]} editando
          cargando={cargando} error={error} alEnviar={guardar} alCerrar={() => setEditando(null)}
        />
      </Modal>
    </>
  );
}
