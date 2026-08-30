import { useState } from 'react';
import { Button, Input, Select } from 'antd';
import Modal from './Modal.jsx';
import { llamarApi } from '../servicios/api.js';
import { avisarError, toast } from '../servicios/avisos.js';
import { fechaHora } from '../servicios/formato.js';
import { ESTADOS_SOLICITUD } from '../servicios/solicitudes.js';

const MOTIVOS = {
  demostracion: 'Quiere una demostración',
  plan: 'Quiere contratar un plan',
  consulta: 'Tiene una consulta',
};

const dato = (etiqueta, valor) => (
  <div><dt>{etiqueta}</dt><dd>{valor || '—'}</dd></div>
);

export default function DetalleSolicitud({ solicitud, alCerrar, alGuardar }) {
  const [estado, setEstado] = useState(solicitud.estado);
  const [nota, setNota] = useState(solicitud.nota ?? '');
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    try {
      await llamarApi(`/api/solicitudes/${solicitud.id}`, { metodo: 'PUT', cuerpo: { estado, nota } });
      toast('Solicitud actualizada.');
      alGuardar();
    } catch (excepcion) {
      avisarError(excepcion.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal abierto titulo={`Solicitud de ${solicitud.nombre}`} alCerrar={alCerrar} ancho={720}>
      <dl className="datos-perfil">
        {dato('Recibida', fechaHora(solicitud.creado_en))}
        {dato('Institución', solicitud.institucion)}
        {dato('Correo', solicitud.correo)}
        {dato('Teléfono', solicitud.telefono)}
        {dato('Ciudad', solicitud.ciudad)}
        {dato('Motivo', MOTIVOS[solicitud.motivo] ?? solicitud.motivo)}
        {dato('Plan de interés', solicitud.plan_titulo)}
        {dato('Mensaje', solicitud.mensaje)}
        {solicitud.atendida_en && dato('Atendida', `${fechaHora(solicitud.atendida_en)} por ${solicitud.atendida_por_nombre ?? 'el proveedor'}`)}
      </dl>

      <div className="fila-campos">
        <label>
          <span>Estado</span>
          <Select value={estado} onChange={setEstado} style={{ width: '100%' }}
            options={ESTADOS_SOLICITUD.map((e) => ({ value: e.valor, label: e.texto }))} />
        </label>
      </div>
      <label>
        <span>Nota interna</span>
        <Input.TextArea rows={3} value={nota} onChange={(e) => setNota(e.target.value)} maxLength={500} showCount />
      </label>

      <div className="acciones">
        <Button type="primary" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button onClick={alCerrar}>Cerrar</Button>
      </div>
    </Modal>
  );
}
