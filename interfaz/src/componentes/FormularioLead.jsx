import { useEffect, useState } from 'react';
import { Button, Input, Select } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { toast } from '../servicios/avisos.js';
import { legible } from '../servicios/formato.js';
import Modal from './Modal.jsx';

const desdeLead = (lead) => ({
  nombre: lead.nombre,
  telefono: lead.telefono ?? '',
  correo: lead.correo ?? '',
  canal: lead.canal,
  aliadoId: lead.aliado_id ?? '',
});

export default function FormularioLead({ abierto, lead, canales, aliados = [], alCerrar, alGuardar }) {
  const [datos, setDatos] = useState(() => desdeLead(lead));
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setDatos(desdeLead(lead));
    setError(null);
  }, [abierto]);

  const campo = (clave) => (evento) => setDatos({ ...datos, [clave]: evento.target.value });
  const opcionesCanal = canales.map((canal) => ({ value: canal, label: legible(canal) }));

  async function guardarDatos(evento) {
    evento.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await llamarApi(`/api/leads/${lead.id}`, { metodo: 'PUT', cuerpo: datos });
      alCerrar();
      await alGuardar();
      toast('Datos actualizados.');
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal abierto={abierto} titulo="Editar datos" alCerrar={alCerrar} ancho={520}>
      <form onSubmit={guardarDatos}>
        <div className="fila-formulario">
          <label>Nombre y apellido<Input value={datos.nombre} onChange={campo('nombre')} required /></label>
          <label>Teléfono<Input value={datos.telefono} onChange={campo('telefono')} placeholder="09XX XXXXXX" /></label>
        </div>
        <div className="fila-formulario">
          <label>Correo<Input type="email" value={datos.correo} onChange={campo('correo')} /></label>
          <label>Canal
            <Select value={datos.canal} options={opcionesCanal} onChange={(valor) => setDatos({ ...datos, canal: valor })} />
          </label>
        </div>

        {aliados.length > 0 && (
          <label>Lo recomendó un aliado?
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Ninguno"
              value={datos.aliadoId || undefined}
              options={aliados.map((a) => ({ value: a.id, label: a.nombre }))}
              onChange={(valor) => setDatos({ ...datos, aliadoId: valor ?? '' })}
            />
            {lead.estado === 'matriculado' && (
              <span className="nota">Ya está matriculado: su comisión se generó y el aliado no se cambia.</span>
            )}
          </label>
        )}
        {error && <p className="error">{error}</p>}
        <div className="acciones">
          <Button type="primary" htmlType="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</Button>
          <Button onClick={alCerrar}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
}
