// alta y administración de las instituciones cliente. es la pantalla del proveedor del
// servicio: cada alta abre un colegio nuevo con sus propios datos y su administrador.
import { useEffect, useState } from 'react';
import { Button, Table } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { confirmar, avisarError, toast, mostrarClave } from '../servicios/avisos.js';
import { fecha, contar, legible } from '../servicios/formato.js';
import FormularioInstitucion from '../componentes/FormularioInstitucion.jsx';
import AltaAdministrador from '../componentes/AltaAdministrador.jsx';

const FORMULARIO_VACIO = { nombre: '', ciudad: '', correoContacto: '', telefono: '', direccion: '' };

export default function Instituciones() {
  const [instituciones, setInstituciones] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [administrando, setAdministrando] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  async function cargar() {
    try { setInstituciones(await llamarApi('/api/instituciones')); } catch (e) { avisarError(e.message); }
  }
  useEffect(() => { cargar(); }, []);

  function abrirAlta() {
    setError(null);
    setEditando(null);
    setFormulario(FORMULARIO_VACIO);
    setAbierto(true);
  }

  function abrirEdicion(institucion) {
    setError(null);
    setEditando(institucion);
    setFormulario({
      nombre: institucion.nombre,
      ciudad: institucion.ciudad ?? '',
      correoContacto: institucion.correo_contacto ?? '',
      telefono: institucion.telefono ?? '',
      direccion: institucion.direccion ?? '',
    });
    setAbierto(true);
  }

  async function guardar(evento) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      if (editando) await llamarApi(`/api/instituciones/${editando.id}`, { metodo: 'PUT', cuerpo: formulario });
      else await llamarApi('/api/instituciones', { metodo: 'POST', cuerpo: formulario });
      setAbierto(false);
      await cargar();
      toast(editando ? 'Institución actualizada.' : 'Institución creada. Ahora cargale su administrador.');
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setCargando(false);
    }
  }

  async function cambiarActivo(institucion) {
    const desactivar = institucion.activo;
    const ok = await confirmar({
      titulo: desactivar ? '¿Suspender la institución?' : '¿Reactivar la institución?',
      texto: desactivar
        ? `Nadie de ${institucion.nombre} va a poder ingresar hasta reactivarla. Sus datos quedan intactos.`
        : `${institucion.nombre} vuelve a tener acceso al sistema.`,
      confirmar: desactivar ? 'Sí, suspender' : 'Sí, reactivar',
      peligro: desactivar,
    });
    if (!ok) return;
    try {
      await llamarApi(`/api/instituciones/${institucion.id}/activo`, { metodo: 'PUT', cuerpo: { activo: !institucion.activo } });
      await cargar();
      toast(desactivar ? 'Institución suspendida.' : 'Institución reactivada.');
    } catch (excepcion) { avisarError(excepcion.message); }
  }

  async function crearAdministrador(datos) {
    const respuesta = await llamarApi(`/api/instituciones/${administrando.id}/administrador`, {
      metodo: 'POST', cuerpo: datos,
    });
    setAdministrando(null);
    await cargar();
    if (respuesta.claveTemporal) {
      mostrarClave(respuesta.claveTemporal, `Administrador de <strong>${administrando.nombre}</strong> creado. El correo no está configurado, así que anotá su clave temporal:`);
    } else {
      toast('Administrador creado. Sus credenciales se enviaron por correo.');
    }
  }

  const columnas = [
    { title: 'Institución', dataIndex: 'nombre', key: 'nombre' },
    { title: 'Ciudad', dataIndex: 'ciudad', key: 'ciudad', render: (valor) => valor || '—' },
    { title: 'Contacto', dataIndex: 'correo_contacto', key: 'correo_contacto', render: (valor) => valor || '—' },
    {
      title: 'Plan vigente', dataIndex: 'plan_vigente', key: 'plan_vigente',
      render: (valor) => (valor ? legible(valor) : <span className="nota">Sin suscripción</span>),
    },
    { title: 'Usuarios', dataIndex: 'usuarios', key: 'usuarios' },
    { title: 'Interesados', dataIndex: 'interesados', key: 'interesados' },
    {
      title: 'Estado', dataIndex: 'activo', key: 'activo',
      render: (valor) => <span className={`estado estado-${valor ? 'exitoso' : 'rechazado'}`}>{valor ? 'Activa' : 'Suspendida'}</span>,
    },
    { title: 'Alta', dataIndex: 'creado_en', key: 'creado_en', render: (valor) => fecha(valor) },
    {
      title: <span className="oculto-visual">Acciones</span>,
      key: 'acciones',
      render: (_, institucion) => (
        <div className="acciones">
          <Button size="small" onClick={() => abrirEdicion(institucion)}>Editar</Button>
          <Button size="small" onClick={() => setAdministrando(institucion)}>+ Administrador</Button>
          <Button size="small" danger={institucion.activo} onClick={() => cambiarActivo(institucion)}>
            {institucion.activo ? 'Suspender' : 'Reactivar'}
          </Button>
        </div>
      ),
    },
  ];

  const activas = instituciones.filter((i) => i.activo).length;

  return (
    <>
      <header className="encabezado-pagina">
        <h2>Instituciones</h2>
        <Button type="primary" className="boton-crear" onClick={abrirAlta}>+ Nueva institución</Button>
      </header>

      <section className="panel">
        {instituciones.length > 0 ? (
          <>
            <p className="nota">
              {contar(instituciones.length, 'institución', 'instituciones')}, {contar(activas, 'activa', 'activas')}.
              Cada una tiene sus propios usuarios, interesados y suscripción, y no ve los datos de las demás.
            </p>
            <div className="tabla-envoltura">
              <Table columns={columnas} dataSource={instituciones} rowKey="id" size="small" pagination={false} />
            </div>
          </>
        ) : (
          <div className="vacio">
            <p>Todavía no hay instituciones cargadas.</p>
            <Button type="primary" className="boton-crear" onClick={abrirAlta}>+ Nueva institución</Button>
          </div>
        )}
      </section>

      <FormularioInstitucion
        abierto={abierto} editando={editando} formulario={formulario} error={error} cargando={cargando}
        alCambiar={setFormulario} alEnviar={guardar} alCerrar={() => setAbierto(false)}
      />
      <AltaAdministrador
        institucion={administrando} alEnviar={crearAdministrador} alCerrar={() => setAdministrando(null)}
      />
    </>
  );
}
