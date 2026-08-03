// alta de un cobro suelto, fuera de los planes de suscripción
import { Button, Input, Select } from 'antd';
import Modal from './Modal.jsx';

export default function FormularioCobro({ abierto, medios, formulario, error, enviando, alCambiar, alEnviar, alCerrar }) {
  const campo = (clave) => (evento) => alCambiar({ ...formulario, [clave]: evento.target.value });
  const opcionesMedio = [
    { value: '', label: 'Elegir…' },
    ...medios.map((medio) => ({ value: medio.valor, label: medio.texto })),
  ];

  return (
    <Modal abierto={abierto} titulo="Crear cobro" alCerrar={alCerrar}>
      <form onSubmit={alEnviar}>
        <label>Concepto
          <Input value={formulario.concepto} onChange={campo('concepto')} placeholder="Ej: Mensualidad plataforma julio" required />
        </label>
        <div className="fila-formulario">
          <label>Monto en guaraníes
            <Input value={formulario.monto} onChange={campo('monto')} inputMode="numeric" placeholder="250000" required />
          </label>
          <label>Medio de pago
            <Select
              value={formulario.medio}
              options={opcionesMedio}
              onChange={(valor) => alCambiar({ ...formulario, medio: valor })}
            />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="acciones">
          <Button type="primary" htmlType="submit" disabled={enviando}>{enviando ? 'Creando…' : 'Crear cobro'}</Button>
          <Button onClick={alCerrar}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
}
