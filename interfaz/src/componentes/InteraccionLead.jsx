// alta de un contacto con el interesado: llamada, mensaje o visita
import { useEffect, useState } from 'react';
import { Button, Input, Select } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { toast } from '../servicios/avisos.js';
import { legible } from '../servicios/formato.js';
import Modal from './Modal.jsx';

const INTERACCION_VACIA = { tipo: '', detalle: '' };

export default function InteraccionLead({ abierto, lead, tipos, alCerrar, alGuardar }) {
  const [interaccion, setInteraccion] = useState(INTERACCION_VACIA);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // cada vez que se abre arranca en blanco, no con lo que quedó de la vez anterior
  useEffect(() => {
    if (!abierto) return;
    setInteraccion(INTERACCION_VACIA);
    setError(null);
  }, [abierto]);

  const campo = (clave) => (evento) => setInteraccion({ ...interaccion, [clave]: evento.target.value });
  const opcionesTipo = [
    { value: '', label: 'Elegí el tipo' },
    ...tipos.map((tipo) => ({ value: tipo, label: legible(tipo) })),
  ];

  async function registrarInteraccion(evento) {
    evento.preventDefault();
    setError(null);
    if (!interaccion.tipo) return setError('Elegí el tipo de contacto.');
    setGuardando(true);
    try {
      await llamarApi(`/api/leads/${lead.id}/interacciones`, { metodo: 'POST', cuerpo: interaccion });
      alCerrar();
      setInteraccion(INTERACCION_VACIA);
      await alGuardar();
      toast('Interacción registrada.');
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal abierto={abierto} titulo={`Registrar interacción con ${lead.nombre.split(' ')[0]}`} alCerrar={alCerrar} ancho={520}>
      <form onSubmit={registrarInteraccion}>
        <label>Tipo de contacto
          <Select
            value={interaccion.tipo}
            options={opcionesTipo}
            onChange={(valor) => setInteraccion({ ...interaccion, tipo: valor })}
          />
        </label>
        <label>Detalle
          <Input.TextArea placeholder="Qué se conversó y qué quedó pendiente" value={interaccion.detalle} onChange={campo('detalle')} />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="acciones">
          <Button type="primary" htmlType="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Registrar'}</Button>
          <Button onClick={alCerrar}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
}
