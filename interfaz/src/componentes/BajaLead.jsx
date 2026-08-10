import { useState } from 'react';
import { Button, Input } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { confirmar, avisarError, toast } from '../servicios/avisos.js';
import { fechaHora } from '../servicios/formato.js';
import Modal from './Modal.jsx';

export default function BajaLead({ lead, alActualizar }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  function abrirBaja() {
    setMotivo('');
    setError(null);
    setAbierto(true);
  }

  async function darDeBaja(evento) {
    evento.preventDefault();
    setError(null);

    if (!motivo.trim()) return setError('Escribí el motivo de la baja.');
    setGuardando(true);
    try {
      await llamarApi(`/api/leads/${lead.id}/baja`, { metodo: 'PUT', cuerpo: { motivo } });
      setAbierto(false);
      await alActualizar();
      toast('Interesado dado de baja.');
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setGuardando(false);
    }
  }

  async function reactivar() {
    const ok = await confirmar({
      titulo: 'Reactivar al interesado?',
      texto: `${lead.nombre} vuelve al listado y a las alertas de seguimiento.`,
      confirmar: 'Sí, reactivar',
    });
    if (!ok) return;
    try {
      await llamarApi(`/api/leads/${lead.id}/reactivar`, { metodo: 'PUT' });
      await alActualizar();
      toast('Interesado reactivado.');
    } catch (excepcion) {
      avisarError(excepcion.message);
    }
  }

  async function revocar() {
    const ok = await confirmar({
      titulo: 'Revocar el consentimiento?',
      texto: `Es un derecho del titular (Ley 7593). ${lead.nombre} deja de poder ser contactado y queda dado de baja; sus datos se conservan solo como registro.`,
      confirmar: 'Sí, revocar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await llamarApi(`/api/leads/${lead.id}/revocar-consentimiento`, { metodo: 'PUT' });
      await alActualizar();
      toast('Consentimiento revocado.');
    } catch (excepcion) {
      avisarError(excepcion.message);
    }
  }

  return (
    <section className="panel">
      <h3>Consentimiento y baja</h3>
      <dl className="datos-perfil">
        <div>
          <dt>Consentimiento</dt>
          <dd>
            <span className={`estado estado-${lead.consentimiento_datos ? 'matriculado' : 'perdido'}`}>
              {lead.consentimiento_datos ? 'Otorgado' : 'Revocado'}
            </span>
          </dd>
        </div>
        <div><dt>Lo dio el</dt><dd>{lead.consentimiento_fecha ? fechaHora(lead.consentimiento_fecha) : '—'}</dd></div>
        <div><dt>Versión del texto</dt><dd>{lead.consentimiento_version || '—'}</dd></div>
        {lead.consentimiento_revocado_en && (
          <div><dt>Lo revocó el</dt><dd>{fechaHora(lead.consentimiento_revocado_en)}</dd></div>
        )}
        <div>
          <dt>Situación</dt>
          <dd>{lead.activo ? 'Activo' : `Dado de baja — ${lead.motivo_baja || 'sin motivo anotado'}`}</dd>
        </div>
      </dl>

      <div className="acciones separado">
        {lead.activo
          ? <Button danger onClick={abrirBaja}>Dar de baja</Button>
          : <Button type="primary" onClick={reactivar}>Reactivar</Button>}
        {Boolean(lead.consentimiento_datos) && <Button danger onClick={revocar}>Revocar consentimiento</Button>}
      </div>
      <p className="nota">Los interesados no se borran: la baja los saca del seguimiento pero conserva su historial.</p>

      <Modal abierto={abierto} titulo={`Dar de baja a ${lead.nombre}`} alCerrar={() => setAbierto(false)} ancho={460}>
        <form onSubmit={darDeBaja}>
          <label>Motivo de la baja
            <Input.TextArea
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
              placeholder="Por qué se lo saca del seguimiento"
            />
          </label>
          <p className="nota">Queda registrado con tu usuario y lo podés reactivar más adelante.</p>
          {error && <p className="error">{error}</p>}
          <div className="acciones">
            <Button type="primary" danger htmlType="submit" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Dar de baja'}
            </Button>
            <Button onClick={() => setAbierto(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
