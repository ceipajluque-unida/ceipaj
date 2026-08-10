import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Table } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { confirmar, avisarError, toast } from '../servicios/avisos.js';
import { fechaHora, legible } from '../servicios/formato.js';
import BajaLead from '../componentes/BajaLead.jsx';
import FormularioLead from '../componentes/FormularioLead.jsx';
import InteraccionLead from '../componentes/InteraccionLead.jsx';

const TEXTO_PASO = {
  interesado: 'Marcar como interesado',
  matriculado: 'Marcar como matriculado',
  perdido: 'Marcar como perdido',
  nuevo: 'Volver a nuevo',
};

const COLUMNAS_INTERACCIONES = [
  { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', render: (valor) => <span className="sin-cortar">{fechaHora(valor)}</span> },
  { title: 'Tipo', dataIndex: 'tipo', key: 'tipo', render: (valor) => legible(valor) },
  { title: 'Detalle', dataIndex: 'detalle', key: 'detalle', render: (valor) => valor ?? '—' },
  { title: 'Registró', dataIndex: 'usuario', key: 'usuario' },
];

export default function LeadDetalle() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [lead, setLead] = useState(null);
  const [opciones, setOpciones] = useState(null);
  const [pestana, setPestana] = useState('datos');
  const [modalDatos, setModalDatos] = useState(false);
  const [modalInteraccion, setModalInteraccion] = useState(false);

  async function cargar() {
    setLead(await llamarApi(`/api/leads/${id}`));
  }

  useEffect(() => {
    llamarApi('/api/leads/opciones').then(setOpciones).catch((e) => avisarError(e.message));
    cargar().catch((e) => avisarError(e.message));
  }, [id]);

  async function cambiarEstado(estado) {
    const fuerte = estado === 'perdido' || estado === 'matriculado';
    const ok = await confirmar({
      titulo: `Pasarlo a ${legible(estado)}?`,
      texto: estado === 'matriculado'
        ? 'Matriculado es el último estado, después no se puede volver atrás.'
        : estado === 'perdido'
          ? 'Queda como perdido, pero más adelante lo podés reactivar como interesado.'
          : 'El cambio queda registrado con tu usuario.',
      confirmar: 'Sí, cambiar',
      peligro: fuerte,
    });
    if (!ok) return;
    try {
      await llamarApi(`/api/leads/${id}/estado`, { metodo: 'PUT', cuerpo: { estado } });
      await cargar();
      toast(`Ahora figura como ${legible(estado)}.`);
    } catch (excepcion) {
      avisarError(excepcion.message);
    }
  }

  if (!lead || !opciones) return <p className="mensaje-centrado">Cargando…</p>;
  const primerNombre = lead.nombre.split(' ')[0];

  return (
    <>
      <header className="encabezado-pagina">
        <div>
          <h2>
            {lead.nombre} <span className={`estado estado-${lead.estado}`}>{legible(lead.estado)}</span>
            {!lead.activo && <span className="etiqueta">dado de baja</span>}
          </h2>
          <p className="nota">Cédula {lead.cedula} — llegó por {legible(lead.canal)}</p>
        </div>
        <div className="acciones">
          <Button onClick={() => navegar('/leads')}>Volver al listado</Button>
          <Button type="primary" className="boton-crear" onClick={() => setModalInteraccion(true)}>+ Registrar interacción</Button>
        </div>
      </header>

      <nav className="pestanas">
        <Button type="text" className={pestana === 'datos' ? 'activa' : ''} onClick={() => setPestana('datos')}>Datos y estado</Button>
        <Button type="text" className={pestana === 'contactos' ? 'activa' : ''} onClick={() => setPestana('contactos')}>
          Contactos ({lead.interacciones.length})
        </Button>
      </nav>

      {pestana === 'datos' && (
        <>
          <section className="panel">
            <h3>Datos de contacto</h3>
            <dl className="datos-perfil">
              <div><dt>Cédula</dt><dd>{lead.cedula}</dd></div>
              <div><dt>Teléfono</dt><dd>{lead.telefono || '—'}</dd></div>
              <div><dt>Correo</dt><dd>{lead.correo || '—'}</dd></div>
              <div><dt>Canal</dt><dd>{legible(lead.canal)}</dd></div>
              <div><dt>Aliado que lo trajo</dt><dd>{lead.aliado ?? '—'}</dd></div>
              <div><dt>Registrado</dt><dd>{fechaHora(lead.creado_en)}</dd></div>
            </dl>
            <div className="acciones separado"><Button type="primary" onClick={() => setModalDatos(true)}>Editar datos</Button></div>
          </section>

          <section className="panel">
            <h3>Estado</h3>
            {lead.fecha_conversion && <p className="nota">Se matriculó el {fechaHora(lead.fecha_conversion)}.</p>}
            {lead.transiciones.length === 0 ? (
              <p className="nota">Ya está matriculado.</p>
            ) : (
              <div className="acciones">
                {lead.transiciones.map((estado) => (
                  <Button key={estado} type={estado === 'perdido' ? 'default' : 'primary'} danger={estado === 'perdido'} onClick={() => cambiarEstado(estado)}>
                    {TEXTO_PASO[estado] ?? `Pasar a ${legible(estado)}`}
                  </Button>
                ))}
              </div>
            )}
          </section>

          <BajaLead lead={lead} alActualizar={cargar} />
        </>
      )}

      {pestana === 'contactos' && (
        <section className="panel">
          <h3>Historial de contactos</h3>
          {lead.interacciones.length === 0 ? (
            <div className="vacio">
              <p>Todavía no hay ningún contacto anotado con {primerNombre}.</p>
              <Button type="primary" className="boton-crear" onClick={() => setModalInteraccion(true)}>+ Registrar interacción</Button>
            </div>
          ) : (
            <div className="tabla-envoltura">
              <Table columns={COLUMNAS_INTERACCIONES} dataSource={lead.interacciones} rowKey="id" size="small" pagination={false} />
            </div>
          )}
        </section>
      )}

      <FormularioLead
        abierto={modalDatos}
        lead={lead}
        canales={opciones.canales}
        aliados={opciones.aliados ?? []}
        alCerrar={() => setModalDatos(false)}
        alGuardar={cargar}
      />
      <InteraccionLead
        abierto={modalInteraccion}
        lead={lead}
        tipos={opciones.tiposInteraccion}
        alCerrar={() => setModalInteraccion(false)}
        alGuardar={cargar}
      />
    </>
  );
}
