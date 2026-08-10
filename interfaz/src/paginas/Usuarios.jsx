import { useEffect, useState } from 'react';
import { Button } from 'antd';
import { llamarApi, usuarioActual } from '../servicios/api.js';
import { confirmar, avisarError, toast, mostrarClave } from '../servicios/avisos.js';
import { contar, legible } from '../servicios/formato.js';
import Modal from '../componentes/Modal.jsx';
import FormularioUsuario from '../componentes/FormularioUsuario.jsx';
import RolesInstitucion from '../componentes/RolesInstitucion.jsx';
import TablaUsuarios from '../componentes/TablaUsuarios.jsx';

const ROLES_INTERNOS = ['administrador', 'comercial', 'direccion'];
const FORMULARIO_VACIO = { nombre: '', correo: '', telefono: '', direccion: '', rol: 'comercial' };

export default function Usuarios() {
  const yo = usuarioActual();
  const [usuarios, setUsuarios] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  async function cargar() {
    try { setUsuarios(await llamarApi('/api/usuarios')); } catch (e) { avisarError(e.message); }
  }
  useEffect(() => { cargar(); }, []);

  function abrirAlta() {
    setError(null);
    setEditando(null);
    setFormulario(FORMULARIO_VACIO);
    setAbierto(true);
  }

  function abrirEdicion(usuario) {
    setError(null);
    setEditando(usuario);
    setFormulario({
      nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol,
      telefono: usuario.telefono ?? '', direccion: usuario.direccion ?? '',
    });
    setAbierto(true);
  }

  async function guardar(evento) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      if (editando) {
        await llamarApi(`/api/usuarios/${editando.id}`, { metodo: 'PUT', cuerpo: formulario });
        setAbierto(false);
        await cargar();
        toast('Usuario actualizado.');
      } else {
        const respuesta = await llamarApi('/api/usuarios', { metodo: 'POST', cuerpo: formulario });
        setAbierto(false);
        await cargar();
        if (respuesta.claveTemporal) {
          mostrarClave(respuesta.claveTemporal, 'Usuario creado:', respuesta.usuario.correo);
        } else {
          toast('Usuario creado. Las credenciales se enviaron por correo.');
        }
      }
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setCargando(false);
    }
  }

  async function cambiarRol(usuario, rol) {
    const ok = await confirmar({
      titulo: 'Cambiar el rol?',
      texto: `${usuario.nombre} pasa a ${legible(rol)} y se le corta la sesión que tenga abierta.`,
      confirmar: 'Sí, cambiar',
    });
    if (!ok) return;
    try {
      await llamarApi(`/api/usuarios/${usuario.id}/rol`, { metodo: 'PUT', cuerpo: { rol } });
      await cargar();
      toast('Rol actualizado.');
    } catch (excepcion) { avisarError(excepcion.message); }
  }

  async function cambiarActivo(usuario) {
    const desactivar = usuario.activo;
    const ok = await confirmar({
      titulo: desactivar ? 'Desactivar usuario?' : 'Activar usuario?',
      texto: desactivar ? `${usuario.nombre} no podrá volver a ingresar hasta reactivarlo.` : `${usuario.nombre} podrá ingresar de nuevo.`,
      confirmar: desactivar ? 'Sí, desactivar' : 'Sí, activar',
      peligro: desactivar,
    });
    if (!ok) return;
    try {
      await llamarApi(`/api/usuarios/${usuario.id}/activo`, { metodo: 'PUT', cuerpo: { activo: !usuario.activo } });
      await cargar();
      toast(desactivar ? 'Usuario desactivado.' : 'Usuario activado.');
    } catch (excepcion) { avisarError(excepcion.message); }
  }

  async function restablecer(usuario) {
    const ok = await confirmar({ titulo: 'Restablecer la clave?', texto: `Se genera una clave temporal nueva para ${usuario.nombre}.`, confirmar: 'Sí, restablecer' });
    if (!ok) return;
    try {
      const respuesta = await llamarApi(`/api/usuarios/${usuario.id}/restablecer-clave`, { metodo: 'PUT' });
      if (respuesta.claveTemporal) {
        mostrarClave(respuesta.claveTemporal, 'Clave restablecida de', usuario.correo);
      } else {
        toast('Clave restablecida. Se envió por correo.');
      }
    } catch (excepcion) { avisarError(excepcion.message); }
  }

  const activos = usuarios.filter((usuario) => usuario.activo).length;

  return (
    <>
      <header className="encabezado-pagina">
        <h2>Usuarios internos</h2>
        <Button type="primary" className="boton-crear" onClick={abrirAlta}>+ Nuevo usuario</Button>
      </header>

      <section className="panel">
        {usuarios.length > 0 && (
          <>
            <p className="nota">
              {contar(usuarios.length, 'cuenta', 'cuentas')}, {contar(activos, 'activa', 'activas')}.
            </p>
            <TablaUsuarios
              usuarios={usuarios}
              miId={yo?.id}
              roles={ROLES_INTERNOS}
              alEditar={abrirEdicion}
              alCambiarRol={cambiarRol}
              alCambiarActivo={cambiarActivo}
              alRestablecer={restablecer}
            />
          </>
        )}

        {usuarios.length === 0 && (
          <div className="vacio">
            <p>Todavía no hay cuentas cargadas.</p>
            <Button type="primary" className="boton-crear" onClick={abrirAlta}>+ Nuevo usuario</Button>
          </div>
        )}
      </section>

      <Modal abierto={abierto} titulo={editando ? `Editar ${editando.nombre}` : 'Nuevo usuario'} alCerrar={() => setAbierto(false)} ancho={620}>
        <section className="panel">
        <h3>Roles y accesos del plan</h3>
        <div className="tabla-envoltura">
          <RolesInstitucion ruta="/api/usuarios/roles" />
        </div>
      </section>

      <FormularioUsuario
          formulario={formulario}
          alCambiar={setFormulario}
          roles={ROLES_INTERNOS}
          editando={editando}
          cargando={cargando}
          error={error}
          alEnviar={guardar}
          alCerrar={() => setAbierto(false)}
        />
      </Modal>
    </>
  );
}
