import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Button } from 'antd';
import { llamarApi, usuarioActual } from '../servicios/api.js';
import { confirmar, avisarError, toast, mostrarClave } from '../servicios/avisos.js';
import { contar } from '../servicios/formato.js';
import { nombreDeRolEn } from '../servicios/nombresRol.js';
import { rolesAsignables } from '../servicios/roles.js';
import Modal from '../componentes/Modal.jsx';
import FormularioUsuario from '../componentes/FormularioUsuario.jsx';
import RolesInstitucion from '../componentes/RolesInstitucion.jsx';
import TablaUsuarios from '../componentes/TablaUsuarios.jsx';

const FORMULARIO_VACIO = { nombre: '', correo: '', telefono: '', direccion: '', rol: 'comercial' };

export default function Usuarios() {
  const yo = usuarioActual();
  const { correoActivo } = useOutletContext() ?? {};
  const [usuarios, setUsuarios] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [roles, setRoles] = useState([]);
  // un rol creado por el proveedor no está en los textos fijos de la interfaz
  const nombreDeRol = (clave) => nombreDeRolEn(roles, clave);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const [version, setVersion] = useState(0);

  async function cargar() {
    try {
      setUsuarios(await llamarApi('/api/usuarios'));
      setVersion((anterior) => anterior + 1);
    } catch (e) { avisarError(e.message); }
  }
  useEffect(() => { cargar(); }, []);
  useEffect(() => { rolesAsignables().then(setRoles).catch(() => setRoles([])); }, []);

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
        // el rol se cambia aparte: tiene sus propias guardas y queda auditado
        if (formulario.rol && formulario.rol !== editando.rol) {
          await llamarApi(`/api/usuarios/${editando.id}/rol`, { metodo: 'PUT', cuerpo: { rol: formulario.rol } });
        }
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
          toast(`Usuario creado. Credenciales enviadas a ${respuesta.usuario.correo}.`);
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
      titulo: '¿Cambiar el rol?',
      texto: `${usuario.nombre} pasa a ${nombreDeRol(rol)}. Si está trabajando en el sistema, va a tener que volver a entrar.`,
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
      titulo: desactivar ? '¿Desactivar usuario?' : '¿Activar usuario?',
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
    const ok = await confirmar({
      titulo: correoActivo ? '¿Enviar la clave temporal por correo?' : '¿Restablecer la clave?',
      texto: correoActivo
        ? `Se genera una clave temporal para ${usuario.nombre} y se envía a ${usuario.correo}. La anterior deja de servir.`
        : `Se genera una clave temporal para ${usuario.nombre} y se muestra en pantalla, porque no hay correo configurado. La anterior deja de servir.`,
      confirmar: correoActivo ? 'Sí, enviar' : 'Sí, restablecer',
    });
    if (!ok) return;
    try {
      const respuesta = await llamarApi(`/api/usuarios/${usuario.id}/restablecer-clave`, { metodo: 'PUT' });
      if (respuesta.claveTemporal) {
        mostrarClave(respuesta.claveTemporal, correoActivo ? 'No pudimos enviarle el correo a' : 'Clave restablecida de', usuario.correo);
      } else {
        toast(`Clave temporal enviada a ${usuario.correo}.`);
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
              roles={roles}
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

      <Modal abierto={abierto} titulo={editando ? `Editar ${editando.nombre}` : 'Nuevo usuario'} alCerrar={() => setAbierto(false)} ancho={900}>
        <section className="panel">
          <h3>Roles y accesos del plan</h3>
          <div className="tabla-envoltura">
            <RolesInstitucion ruta="/api/usuarios/roles" refresco={version} />
          </div>
        </section>

        <FormularioUsuario
          formulario={formulario}
          alCambiar={setFormulario}
          roles={roles}
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
