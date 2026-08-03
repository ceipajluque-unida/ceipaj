import { useEffect, useState } from 'react';
import { Button, Checkbox, Input, Table } from 'antd';
import { llamarApi, usuarioActual } from '../servicios/api.js';
import { avisarError, toast } from '../servicios/avisos.js';
import { contar, fecha, legible } from '../servicios/formato.js';
import Modal from '../componentes/Modal.jsx';
import Legales from '../componentes/Legales.jsx';

const FORMULARIO_VACIO = { nombre: '', cedula: '', telefono: '', correo: '', consentimiento: false };

const TEXTO_ESTADO = {
  nuevo: 'Recibido',
  interesado: 'Contactado',
  matriculado: 'Matriculado',
  perdido: 'Cerrado',
};

export default function PortalAliado() {
  const usuario = usuarioActual();
  const [resumen, setResumen] = useState(null);
  const [leads, setLeads] = useState([]);
  const [avisoConsentimiento, setAvisoConsentimiento] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function cargar() {
    setResumen(await llamarApi('/api/portal/resumen'));
    setLeads(await llamarApi('/api/portal/leads'));
  }

  useEffect(() => {
    cargar().catch((excepcion) => avisarError(excepcion.message));

    llamarApi('/api/leads/opciones')
      .then((opciones) => setAvisoConsentimiento(opciones.avisoConsentimiento))
      .catch(() => setAvisoConsentimiento(''));
  }, []);

  const campo = (clave) => (evento) => setFormulario({ ...formulario, [clave]: evento.target.value });

  async function registrar(evento) {
    evento.preventDefault();
    if (enviando) return;
    setError(null);
    if (!formulario.consentimiento) return setError('Marcá la casilla del final: sin el permiso del interesado no podemos guardar sus datos.');
    setEnviando(true);
    try {
      await llamarApi('/api/portal/leads', { metodo: 'POST', cuerpo: formulario });
      setAbierto(false);
      setFormulario(FORMULARIO_VACIO);
      await cargar();
      toast('Listo, ya lo registramos. Nos ponemos en contacto con él.');
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setEnviando(false);
    }
  }

  if (!resumen) return <p className="mensaje-centrado">Cargando…</p>;

  const columnas = [
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    {
      title: 'Cómo va',
      dataIndex: 'estado',
      key: 'estado',
      render: (valor) => <span className={`estado estado-${valor}`}>{TEXTO_ESTADO[valor] ?? legible(valor)}</span>,
    },
    {
      title: 'Lo registraste el',
      dataIndex: 'creado_en',
      key: 'creado_en',
      render: (valor) => <span className="sin-cortar">{fecha(valor)}</span>,
    },
  ];

  return (
    <>
      <header className="encabezado-pagina">
        <h2>Hola, {usuario?.nombre}</h2>
        <Button type="primary" className="boton-crear" onClick={() => { setError(null); setAbierto(true); }}>+ Registrar interesado</Button>
      </header>

      <section className="cuadricula sep-abajo">
        <article className="indicador">
          <h3>Recomendados</h3>
          <p className="cifra">{resumen.totalLeads}</p>
          <p className="nota">Cada uno suma {contar(resumen.puntosPorLead, 'punto', 'puntos')}</p>
        </article>
        <article className="indicador">
          <h3>Matriculados</h3>
          <p className="cifra">{resumen.convertidos}</p>
          <p className="nota">Cada matrícula suma {contar(resumen.puntosPorConversion, 'punto más', 'puntos más')}</p>
        </article>
        <article className="indicador">
          <h3>Mis puntos</h3>
          <p className="cifra">{resumen.puntos}</p>
        </article>
      </section>

      <section className="panel">
        <h3>Mis interesados</h3>
        {leads.length === 0 && (
          <p className="nota">Todavía no recomendaste a nadie. Empezá con el botón de arriba.</p>
        )}
        {leads.length > 0 && (
          <div className="tabla-envoltura">
            <Table columns={columnas} dataSource={leads} rowKey="id" size="small" pagination={false} />
          </div>
        )}
      </section>

      <Modal abierto={abierto} titulo="Registrar interesado" alCerrar={() => setAbierto(false)} ancho={520}>
        <form onSubmit={registrar}>
          <div className="fila-formulario">
            <label>Nombre y apellido<Input value={formulario.nombre} onChange={campo('nombre')} required /></label>
            <label>Cédula<Input value={formulario.cedula} onChange={campo('cedula')} inputMode="numeric" required /></label>
          </div>
          <div className="fila-formulario">
            <label>Teléfono<Input value={formulario.telefono} onChange={campo('telefono')} placeholder="Opcional" /></label>
            <label>Correo<Input type="email" value={formulario.correo} onChange={campo('correo')} placeholder="Opcional" /></label>
          </div>
          <Checkbox
            className="consentimiento"
            checked={formulario.consentimiento}
            onChange={(evento) => setFormulario({ ...formulario, consentimiento: evento.target.checked })}
          >
            <span className="ayuda">
              {avisoConsentimiento} <Legales variante="enlace" texto="Ver la política de privacidad" />
            </span>
          </Checkbox>
          {error && <p className="error">{error}</p>}
          <div className="acciones">
            <Button type="primary" htmlType="submit" disabled={enviando}>{enviando ? 'Registrando…' : 'Registrar'}</Button>
            <Button onClick={() => setAbierto(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
