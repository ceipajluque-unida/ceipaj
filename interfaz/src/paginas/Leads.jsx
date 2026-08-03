// listado de interesados con sus alertas, filtros y alta con consentimiento
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Checkbox, Input, Select } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { avisarError, toast } from '../servicios/avisos.js';
import { contar, legible } from '../servicios/formato.js';
import Modal from '../componentes/Modal.jsx';
import TablaLeads from '../componentes/TablaLeads.jsx';

const FORMULARIO_VACIO = { nombre: '', cedula: '', telefono: '', correo: '', canal: '', aliadoId: '', consentimiento: false };
const FILTROS_VACIOS = { estado: '', canal: '', buscar: '', incluirBajas: '' };

export default function Leads() {
  const [opciones, setOpciones] = useState(null);
  const [leads, setLeads] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [abierto, setAbierto] = useState(false);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  // descarta respuestas viejas del buscador
  const ultimaBusqueda = useRef(0);

  async function cargarLeads(filtrosActuales = filtros) {
    const consulta = new URLSearchParams(Object.entries(filtrosActuales).filter(([, valor]) => valor)).toString();
    const miTurno = ++ultimaBusqueda.current;
    const resultado = await llamarApi(`/api/leads${consulta ? `?${consulta}` : ''}`);
    if (miTurno === ultimaBusqueda.current) setLeads(resultado);
  }

  useEffect(() => {
    llamarApi('/api/leads/opciones').then(setOpciones).catch((e) => avisarError(e.message));
    llamarApi('/api/leads/alertas').then(setAlertas).catch(() => setAlertas([]));
    cargarLeads().catch((e) => avisarError(e.message));
  }, []);

  function cambiarFiltro(campo, valor) {
    const nuevos = { ...filtros, [campo]: valor };
    setFiltros(nuevos);
    cargarLeads(nuevos).catch((e) => avisarError(e.message));
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_VACIOS);
    cargarLeads(FILTROS_VACIOS).catch((e) => avisarError(e.message));
  }

  function abrirAlta() {
    setError(null);
    setAbierto(true);
  }

  const campo = (clave) => (evento) => setFormulario({ ...formulario, [clave]: evento.target.value });

  async function crearLead(evento) {
    evento.preventDefault();
    setError(null);
    if (!formulario.canal) return setError('Elegí por dónde llegó el interesado.');
    if (!formulario.consentimiento) return setError('Marcá la casilla del consentimiento antes de registrar.');
    setGuardando(true);
    try {
      await llamarApi('/api/leads', { metodo: 'POST', cuerpo: formulario });
      setAbierto(false);
      setFormulario(FORMULARIO_VACIO);
      await cargarLeads();
      toast('Interesado registrado.');
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setGuardando(false);
    }
  }

  if (!opciones) return <p className="mensaje-centrado">Cargando…</p>;
  const hayFiltros = Object.values(filtros).some((valor) => valor !== '');
  const canales = opciones.canales.map((canal) => ({ value: canal, label: legible(canal) }));

  return (
    <>
      <header className="encabezado-pagina">
        <h2>Interesados</h2>
        <Button type="primary" className="boton-crear" onClick={abrirAlta}>+ Registrar interesado</Button>
      </header>

      {alertas.length > 0 && (
        <section className="panel">
          <h3>Sin contacto hace más de {contar(opciones.diasAlerta, 'día', 'días')}</h3>
          <ul className="lista-alertas">
            {alertas.slice(0, 6).map((alerta) => (
              <li key={alerta.id}>
                <Link to={`/leads/${alerta.id}`}>{alerta.nombre}</Link>
                <span className="etiqueta">{contar(alerta.dias_sin_contacto, 'día', 'días')} sin contacto</span>
              </li>
            ))}
            {alertas.length > 6 && <li className="nota">y {alertas.length - 6} más en la lista de abajo</li>}
          </ul>
        </section>
      )}

      <section className="panel">
        <div className="barra-filtros">
          <label>Estado
            <Select
              value={filtros.estado}
              options={[{ value: '', label: 'Todos' }, ...opciones.estados.map((estado) => ({ value: estado, label: legible(estado) }))]}
              onChange={(valor) => cambiarFiltro('estado', valor)}
            />
          </label>
          <label>Canal
            <Select
              value={filtros.canal}
              options={[{ value: '', label: 'Todos' }, ...canales]}
              onChange={(valor) => cambiarFiltro('canal', valor)}
            />
          </label>
          <label className="ancho">Buscar
            <Input placeholder="Nombre o cédula" value={filtros.buscar} onChange={(evento) => cambiarFiltro('buscar', evento.target.value)} />
          </label>
          <Checkbox
            checked={filtros.incluirBajas === '1'}
            onChange={(evento) => cambiarFiltro('incluirBajas', evento.target.checked ? '1' : '')}
          >
            Ver también los dados de baja
          </Checkbox>
          {hayFiltros && <Button onClick={limpiarFiltros}>Limpiar filtros</Button>}
        </div>

        {leads.length > 0 && (
          <>
            <p className="nota">
              {contar(leads.length, 'interesado', 'interesados')}
              {leads.length === 200 && ' (se muestran los más recientes)'}
            </p>
            <TablaLeads leads={leads} />
          </>
        )}

        {leads.length === 0 && (
          <div className="vacio">
            {hayFiltros ? (
              <>
                <p>Ningún interesado coincide con lo que buscaste.</p>
                <Button onClick={limpiarFiltros}>Limpiar filtros</Button>
              </>
            ) : (
              <>
                <p>Todavía no registraste interesados.</p>
                <Button type="primary" className="boton-crear" onClick={abrirAlta}>+ Registrar interesado</Button>
              </>
            )}
          </div>
        )}
      </section>

      <Modal abierto={abierto} titulo="Registrar interesado" alCerrar={() => setAbierto(false)} ancho={520}>
        <form onSubmit={crearLead}>
          <div className="fila-formulario">
            <label>Nombre y apellido<Input value={formulario.nombre} onChange={campo('nombre')} required /></label>
            <label>Cédula<Input value={formulario.cedula} onChange={campo('cedula')} inputMode="numeric" required /></label>
          </div>
          <div className="fila-formulario">
            <label>Teléfono<Input value={formulario.telefono} onChange={campo('telefono')} placeholder="09XX XXXXXX" /></label>
            <label>Correo<Input type="email" value={formulario.correo} onChange={campo('correo')} /></label>
          </div>
          <label>¿Por dónde llegó?
            <Select
              value={formulario.canal}
              options={[{ value: '', label: 'Elegí un canal' }, ...canales]}
              onChange={(valor) => setFormulario({ ...formulario, canal: valor })}
            />
          </label>
          {/* sin esto, un interesado que recomienda un aliado por teléfono y carga la
              secretaria no le generaba ni comisión ni puntos, y no había forma de
              corregirlo después */}
          {opciones.aliados?.length > 0 && (
            <label>¿Lo recomendó un aliado?
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Ninguno"
                value={formulario.aliadoId || undefined}
                options={opciones.aliados.map((a) => ({ value: a.id, label: a.nombre }))}
                onChange={(valor) => setFormulario({ ...formulario, aliadoId: valor ?? '' })}
              />
              <span className="nota">Le suma sus puntos y, si se matricula, su comisión.</span>
            </label>
          )}
          <Checkbox
            className="consentimiento"
            checked={formulario.consentimiento}
            onChange={(evento) => setFormulario({ ...formulario, consentimiento: evento.target.checked })}
          >
            El interesado autorizó que guardemos sus datos para contactarlo.
          </Checkbox>
          <p className="ayuda">
            {opciones.avisoConsentimiento} <a href="/privacidad" target="_blank" rel="noreferrer">Ver la política de privacidad</a>
          </p>
          {error && <p className="error">{error}</p>}
          <div className="acciones">
            <Button type="primary" htmlType="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Registrar'}</Button>
            <Button onClick={() => setAbierto(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
