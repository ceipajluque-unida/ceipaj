import { useEffect, useState } from 'react';
import { Button, Table, Tabs } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { confirmar, avisarError, toast, mostrarClave } from '../servicios/avisos.js';
import { fecha, legible } from '../servicios/formato.js';
import FormularioInstitucion from '../componentes/FormularioInstitucion.jsx';
import AltaAdministrador from '../componentes/AltaAdministrador.jsx';
import RolesInstitucion from '../componentes/RolesInstitucion.jsx';
import UsuariosInstitucion from '../componentes/UsuariosInstitucion.jsx';
import AliadosInstitucion from '../componentes/AliadosInstitucion.jsx';
import SuscripcionInstitucion from '../componentes/SuscripcionInstitucion.jsx';

const FORMULARIO_VACIO = { nombre: '', ciudad: '', correoContacto: '', telefono: '', direccion: '' };

export default function Instituciones() {
  const [instituciones, setInstituciones] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [administrando, setAdministrando] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // sube con cada alta o edición de usuarios: el panel de roles cuenta activos por rol
  // y el cupo del plan, así que sin esto queda mostrando lo de cuando se abrió la fila
  const [version, setVersion] = useState(0);

  async function cargar() {
    try {
      setInstituciones(await llamarApi('/api/instituciones'));
      setVersion((anterior) => anterior + 1);
    } catch (e) { avisarError(e.message); }
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
      titulo: desactivar ? `Suspender ${institucion.nombre}?` : `Reactivar ${institucion.nombre}?`,
      texto: desactivar
        ? 'Sus usuarios no van a poder entrar hasta que la reactives. No se borra nada: toda su información queda donde está.'
        : 'Sus usuarios vuelven a poder ingresar.',
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
      mostrarClave(respuesta.claveTemporal, 'Administrador creado en', administrando.nombre);
    } else {
      toast('Administrador creado. Sus credenciales se enviaron por correo.');
    }
  }

  const columnas = [
    {
      title: 'Institución', dataIndex: 'nombre', key: 'nombre', width: 240,
      render: (nombre, institucion) => (
        <>
          <strong>{nombre}</strong>
          <span className="nota bajo-titulo">
            {[institucion.ciudad, institucion.correo_contacto].filter(Boolean).join(', ') || 'Sin datos de contacto'}
          </span>
        </>
      ),
    },
    {
      title: 'Plan vigente', dataIndex: 'plan_vigente', key: 'plan_vigente',
      render: (valor) => (valor ? legible(valor) : <span className="nota">Sin suscripción</span>),
    },
    { title: 'Usuarios', dataIndex: 'usuarios', key: 'usuarios', align: 'center' },
    { title: 'Interesados', dataIndex: 'interesados', key: 'interesados', align: 'center' },
    {
      title: 'Estado', dataIndex: 'activo', key: 'activo',
      render: (valor) => <span className={`estado estado-${valor ? 'exitoso' : 'rechazado'}`}>{valor ? 'Activa' : 'Suspendida'}</span>,
    },
    { title: 'Alta', dataIndex: 'creado_en', key: 'creado_en', render: (valor) => fecha(valor) },
    {
      title: <span className="oculto-visual">Acciones</span>,
      key: 'acciones',
      fixed: 'right',
      width: 240,
      render: (_, institucion) => (
        <div className="acciones">
          <Button size="small" onClick={() => abrirEdicion(institucion)}>Editar</Button>
          {Number(institucion.administradores) === 0 && (
            <Button size="small" onClick={() => setAdministrando(institucion)}>Crear usuario</Button>
          )}
          <Button size="small" danger={institucion.activo} onClick={() => cambiarActivo(institucion)}>
            {institucion.activo ? 'Suspender' : 'Reactivar'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <header className="encabezado-pagina">
        <h2>Instituciones</h2>
        {instituciones.length === 0 && (
          <Button type="primary" className="boton-crear" onClick={abrirAlta}>+ Nueva institución</Button>
        )}
      </header>

      <section className="panel">
        {instituciones.length > 0 ? (
          <div className="tabla-envoltura">
            <Table
              columns={columnas}
              dataSource={instituciones}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
              expandable={{
                expandedRowRender: (institucion) => (
                  <div className="detalle-institucion">
                    <Tabs
                      size="small"
                      destroyOnHidden={false}
                      items={[
                        {
                          key: 'roles',
                          label: 'Roles y accesos',
                          children: <RolesInstitucion institucionId={institucion.id} refresco={version} />,
                        },
                        {
                          key: 'usuarios',
                          label: 'Usuarios',
                          children: (
                            <UsuariosInstitucion
                              institucion={institucion}
                              alCambiar={() => setVersion((anterior) => anterior + 1)}
                            />
                          ),
                        },
                        {
                          key: 'aliados',
                          label: 'Aliados',
                          children: <AliadosInstitucion institucion={institucion} />,
                        },
                        {
                          key: 'suscripcion',
                          label: 'Suscripción',
                          children: <SuscripcionInstitucion institucionId={institucion.id} refresco={version} />,
                        },
                      ]}
                    />
                  </div>
                ),
                rowExpandable: () => true,
              }}
            />
          </div>
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
