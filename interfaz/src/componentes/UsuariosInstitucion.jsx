import { useEffect, useState } from 'react';
import { Button, Table } from 'antd';
import Modal from './Modal.jsx';
import FormularioUsuario from './FormularioUsuario.jsx';
import { llamarApi } from '../servicios/api.js';
import { confirmar, avisarError, toast, mostrarClave } from '../servicios/avisos.js';
import { nombreDeRolEn } from '../servicios/nombresRol.js';
import { rolesAsignables } from '../servicios/roles.js';

const VACIO = { nombre: '', correo: '', telefono: '', direccion: '', rol: '' };

export default function UsuariosInstitucion({ institucion, alCambiar }) {
  const correoActivo = Boolean(institucion.correoActivo);
  const [usuarios, setUsuarios] = useState(null);
  const [roles, setRoles] = useState([]);
  // un rol creado por el proveedor no esta en los textos fijos de la interfaz
  const nombreDeRol = (clave) => nombreDeRolEn(roles, clave);
  const [editando, setEditando] = useState(null);
  const [formulario, setFormulario] = useState(VACIO);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const base = `/api/instituciones/${institucion.id}/usuarios`;

  async function cargar() {
    try { setUsuarios(await llamarApi(base)); } catch (excepcion) { avisarError(excepcion.message); }
  }
  useEffect(() => { cargar(); }, [institucion.id]);
  useEffect(() => { rolesAsignables().then(setRoles).catch(() => setRoles([])); }, []);

  function abrirEdicion(usuario) {
    setError(null);
    setEditando(usuario);
    setFormulario({
      nombre: usuario.nombre,
      correo: usuario.correo,
      telefono: usuario.telefono ?? '',
      direccion: usuario.direccion ?? '',
      rol: usuario.rol,
    });
  }

  async function guardar(evento) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await llamarApi(`${base}/${editando.id}`, { metodo: 'PUT', cuerpo: formulario });
      // el rol se cambia aparte: tiene sus propias guardas y queda auditado
      if (formulario.rol && formulario.rol !== editando.rol) {
        await llamarApi(`${base}/${editando.id}/rol`, { metodo: 'PUT', cuerpo: { rol: formulario.rol } });
      }
      setEditando(null);
      await cargar();
      alCambiar?.();
      toast('Usuario actualizado.');
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setCargando(false);
    }
  }

  async function restablecer(usuario) {
    const ok = await confirmar({
      titulo: correoActivo ? '¿Enviar la clave temporal por correo?' : '¿Restablecer la clave?',
      texto: correoActivo
        ? `Se genera una clave temporal para ${usuario.nombre} y se envía a ${usuario.correo}. La anterior deja de servir.`
        : `Se genera una clave temporal para ${usuario.nombre} y se muestra en pantalla, porque no hay correo configurado. La anterior deja de servir.`,
      confirmar: correoActivo ? 'Sí, enviar' : 'Sí, restablecer',
      peligro: true,
    });
    if (!ok) return;
    try {
      const respuesta = await llamarApi(`${base}/${usuario.id}/restablecer`, { metodo: 'POST' });
      if (respuesta.claveTemporal) {
        mostrarClave(respuesta.claveTemporal, correoActivo ? 'No pudimos enviarle el correo a' : 'Clave restablecida de', usuario.correo);
      } else {
        toast(`Clave temporal enviada a ${usuario.correo}.`);
      }
    } catch (excepcion) { avisarError(excepcion.message); }
  }

  async function cambiarActivo(usuario) {
    const desactivar = Boolean(usuario.activo);
    const ok = await confirmar({
      titulo: desactivar ? `¿Desactivar a ${usuario.nombre}?` : `¿Reactivar a ${usuario.nombre}?`,
      texto: desactivar
        ? `${usuario.nombre} no va a poder entrar al sistema hasta que lo reactives. Su cuenta y su trabajo quedan como están.`
        : `${usuario.nombre} vuelve a poder entrar al sistema.`,
      confirmar: desactivar ? 'Sí, desactivar' : 'Sí, reactivar',
      peligro: desactivar,
    });
    if (!ok) return;
    try {
      await llamarApi(`${base}/${usuario.id}/activo`, { metodo: 'PUT', cuerpo: { activo: !usuario.activo } });
      await cargar();
      alCambiar?.();
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
    { title: 'Rol', dataIndex: 'rol', key: 'rol', render: (valor) => nombreDeRol(valor) },
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
      {usuarios.length === 0 ? (
        <p className="nota">Todavía no tiene usuarios.</p>
      ) : (
        <div className="tabla-envoltura">
          <Table columns={columnas} dataSource={usuarios} rowKey="id" size="small" pagination={false} />
        </div>
      )}
      <Modal abierto={Boolean(editando)} titulo={`Editar a ${editando?.nombre ?? ''}`} alCerrar={() => setEditando(null)}>
        <FormularioUsuario
          formulario={formulario} alCambiar={setFormulario} roles={roles} editando
          cargando={cargando} error={error} alEnviar={guardar} alCerrar={() => setEditando(null)}
        />
      </Modal>
    </>
  );
}
