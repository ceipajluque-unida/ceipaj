import { Button } from 'antd';
import { fecha, fechaHora, guaranies, legible } from '../servicios/formato.js';
import Modal from './Modal.jsx';

// la institución tiene derecho a saber por qué le cortaron el plan: quién lo
// hizo, cuándo y con qué motivo escrito.
export default function MotivoBaja({ suscripcion, alCerrar }) {
  const dato = (etiqueta, valor) => (
    <div>
      <dt>{etiqueta}</dt>
      <dd>{valor ?? <span className="nota">—</span>}</dd>
    </div>
  );

  return (
    <Modal abierto titulo={`Baja del plan ${legible(suscripcion.plan)}`} alCerrar={alCerrar} ancho={560}>
      <dl className="datos-perfil">
        {dato('Período contratado', `${fecha(suscripcion.fecha_inicio)} al ${fecha(suscripcion.fecha_fin)}`)}
        {dato('Monto del período', guaranies(suscripcion.monto))}
        {dato('Dada de baja el', fechaHora(suscripcion.baja_en))}
        {dato('Dada de baja por', suscripcion.baja_por_nombre)}
      </dl>

      <p>
        <strong>Motivo</strong><br />
        {suscripcion.motivo_baja || 'No quedó registrado: la baja es anterior a que el sistema guardara el motivo.'}
      </p>

      <div className="acciones">
        <Button onClick={alCerrar}>Cerrar</Button>
      </div>
    </Modal>
  );
}
