// edición de los datos de contacto del interesado. la cédula no está a propósito: es la
// que cruza con el sistema académico para detectar la matriculación, así que no se toca.
import { useEffect, useState } from 'react';
import { Button, Input, Select } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { toast } from '../servicios/avisos.js';
import { legible } from '../servicios/formato.js';
import Modal from './Modal.jsx';

// copia editable de los datos de contacto
const desdeLead = (lead) => ({
  nombre: lead.nombre,
  telefono: lead.telefono ?? '',
  correo: lead.correo ?? '',
  canal: lead.canal,
});

export default function FormularioLead({ abierto, lead, canales, alCerrar, alGuardar }) {
  const [datos, setDatos] = useState(() => desdeLead(lead));
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // al abrir se vuelve a copiar del lead, para no arrastrar una edición cancelada
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
        {error && <p className="error">{error}</p>}
        <div className="acciones">
          <Button type="primary" htmlType="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</Button>
          <Button onClick={alCerrar}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
}
