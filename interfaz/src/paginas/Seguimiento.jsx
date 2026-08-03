// seguimiento de estudiantes activos, riesgo de deserción y acompañamiento
import { useEffect, useState } from 'react';
import { Button, Input, Select, Table } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { avisarError, toast } from '../servicios/avisos.js';
import { fecha, contar, legible } from '../servicios/formato.js';
import Modal from '../componentes/Modal.jsx';

const ACCION_VACIA = { tipo: '', detalle: '' };
const FILTROS_VACIOS = { buscar: '', ver: 'todos' };

// sin fecha de matrícula ni acciones no hay días que contar
function dias(cantidad) {
  return cantidad === null || cantidad === undefined ? '—' : contar(cantidad, 'día', 'días');
}

export default function Seguimiento() {
  const [opciones, setOpciones] = useState(null);
  const [estudiantes, setEstudiantes] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [elegido, setElegido] = useState(null); // estudiante abierto en la ventana
  const [acciones, setAcciones] = useState([]);
  const [formulario, setFormulario] = useState(ACCION_VACIA);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  async function cargarEstudiantes() {
    try { setEstudiantes(await llamarApi('/api/seguimiento/estudiantes')); } catch (e) { avisarError(e.message); }
  }

  useEffect(() => {
    llamarApi('/api/seguimiento/opciones').then(setOpciones).catch((e) => avisarError(e.message));
    cargarEstudiantes();
  }, []);

  async function acompanar(estudiante) {
    setError(null);
    setFormulario(ACCION_VACIA);
    setElegido(estudiante);
    try {
      setAcciones(await llamarApi(`/api/seguimiento/acciones/${estudiante.id}`));
    } catch (excepcion) {
      setAcciones([]);
      avisarError(excepcion.message);
    }
  }

  async function registrarAccion(evento) {
    evento.preventDefault();
    setError(null);
    if (!formulario.tipo) return setError('Elegí el tipo de acción.');
    setGuardando(true);
    try {
      await llamarApi('/api/seguimiento/acciones', { metodo: 'POST', cuerpo: { leadId: elegido.id, ...formulario } });
      setFormulario(ACCION_VACIA);
      setAcciones(await llamarApi(`/api/seguimiento/acciones/${elegido.id}`));
      await cargarEstudiantes(); // los días sin acción del listado cambian
      toast('Acción registrada.');
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setGuardando(false);
    }
  }

  if (!opciones) return <p className="mensaje-centrado">Cargando…</p>;

  const enRiesgo = estudiantes.filter((estudiante) => estudiante.en_riesgo).length;
  const busqueda = filtros.buscar.trim().toLowerCase();
  const visibles = estudiantes.filter((estudiante) => {
    if (filtros.ver === 'riesgo' && !estudiante.en_riesgo) return false;
    if (!busqueda) return true;
    return estudiante.nombre.toLowerCase().includes(busqueda) || String(estudiante.cedula).includes(busqueda);
  });
  const hayFiltros = filtros.buscar !== '' || filtros.ver !== 'todos';

  const columnas = [
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    { title: 'Cédula', dataIndex: 'cedula', key: 'cedula' },
    {
      title: 'Teléfono',
      dataIndex: 'telefono',
      key: 'telefono',
      render: (valor) => <span className="sin-cortar">{valor ?? '—'}</span>,
    },
    {
      title: 'Matriculado el',
      dataIndex: 'fecha_conversion',
      key: 'fecha_conversion',
      render: (valor) => <span className="sin-cortar">{fecha(valor)}</span>,
    },
    {
      title: 'Última acción',
      dataIndex: 'ultima_accion',
      key: 'ultima_accion',
      render: (valor) => <span className="sin-cortar">{fecha(valor)}</span>,
    },
    {
      title: 'Sin acompañar',
      dataIndex: 'dias_sin_accion',
      key: 'dias_sin_accion',
      render: (valor) => <span className="sin-cortar">{dias(valor)}</span>,
    },
    {
      title: 'Situación',
      dataIndex: 'en_riesgo',
      key: 'en_riesgo',
      render: (valor) => (valor
        ? <span className="estado estado-riesgo">En riesgo</span>
        : <span className="estado estado-matriculado">Al día</span>),
    },
    {
      title: <span className="oculto-visual">Acciones</span>,
      key: 'acciones',
      render: (_, estudiante) => <Button size="small" onClick={() => acompanar(estudiante)}>Acompañar</Button>,
    },
  ];

  const columnasAcciones = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      render: (valor) => <span className="sin-cortar">{fecha(valor)}</span>,
    },
    { title: 'Tipo', dataIndex: 'tipo', key: 'tipo', render: (valor) => legible(valor) },
    { title: 'Detalle', dataIndex: 'detalle', key: 'detalle', render: (valor) => valor ?? '—' },
    { title: 'Registró', dataIndex: 'usuario', key: 'usuario' },
  ];

  return (
    <>
      <header className="encabezado-pagina"><h2>Seguimiento de estudiantes</h2></header>

      <section className="cuadricula">
        <article className="indicador">
          <h3>Estudiantes activos</h3><p className="cifra">{estudiantes.length}</p>
        </article>
        <article className="indicador">
          <h3>En riesgo</h3><p className="cifra">{enRiesgo}</p>
          <p className="nota">Más de {dias(opciones.diasRiesgo)} sin acompañamiento</p>
        </article>
      </section>

      <section className="panel">
        <div className="barra-filtros">
          <label className="ancho">Buscar
            <Input placeholder="Nombre o cédula" value={filtros.buscar} onChange={(evento) => setFiltros({ ...filtros, buscar: evento.target.value })} />
          </label>
          <label>Mostrar
            <Select
              value={filtros.ver}
              options={[
                { value: 'todos', label: 'Todos los estudiantes' },
                { value: 'riesgo', label: 'Solo los que están en riesgo' },
              ]}
              onChange={(valor) => setFiltros({ ...filtros, ver: valor })}
            />
          </label>
          {hayFiltros && <Button onClick={() => setFiltros(FILTROS_VACIOS)}>Limpiar filtros</Button>}
        </div>

        {visibles.length > 0 && (
          <div className="tabla-envoltura">
            <Table columns={columnas} dataSource={visibles} rowKey="id" size="small" pagination={false} />
          </div>
        )}

        {visibles.length === 0 && (
          <div className="vacio">
            {estudiantes.length === 0 ? (
              <p>Todavía no hay estudiantes matriculados.</p>
            ) : (
              <>
                <p>Ningún estudiante coincide con el filtro.</p>
                <Button onClick={() => setFiltros(FILTROS_VACIOS)}>Limpiar filtros</Button>
              </>
            )}
          </div>
        )}
      </section>

      <Modal abierto={!!elegido} titulo={elegido ? `Acompañar a ${elegido.nombre}` : ''} alCerrar={() => setElegido(null)} ancho={560}>
        {elegido && (
          <>
            <p className="nota">
              Cédula {elegido.cedula} · teléfono {elegido.telefono || 'sin cargar'} · {dias(elegido.dias_sin_accion)} sin acompañamiento
            </p>
            <form onSubmit={registrarAccion}>
              <div className="fila-formulario">
                <label>Tipo de acción
                  <Select
                    value={formulario.tipo}
                    options={[
                      { value: '', label: 'Elegí el tipo' },
                      ...opciones.tiposAccion.map((tipo) => ({ value: tipo, label: legible(tipo) })),
                    ]}
                    onChange={(valor) => setFormulario({ ...formulario, tipo: valor })}
                  />
                </label>
                <label>Detalle
                  <Input placeholder="Qué se hizo o qué se acordó" value={formulario.detalle} onChange={(evento) => setFormulario({ ...formulario, detalle: evento.target.value })} />
                </label>
              </div>
              {error && <p className="error">{error}</p>}
              <div className="acciones">
                <Button type="primary" htmlType="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Registrar acción'}</Button>
                <Button onClick={() => setElegido(null)}>Cerrar</Button>
              </div>
            </form>

            <h3 className="separado">Acompañamientos anteriores</h3>
            {acciones.length === 0 && <p className="nota">Sin acompañamientos anteriores.</p>}
            {acciones.length > 0 && (
              <div className="tabla-envoltura">
                <Table columns={columnasAcciones} dataSource={acciones} rowKey="id" size="small" pagination={false} />
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
