import { Button, Input, Select } from 'antd';
import { legible } from '../servicios/formato.js';
import Modal from './Modal.jsx';
import AvisoPrivacidad from './AvisoPrivacidad.jsx';

export default function FormularioAliado({ abierto, formulario, alCambiar, cargos, editando, cargando, error, alEnviar, alCerrar }) {
  const campo = (clave) => (evento) => alCambiar({ ...formulario, [clave]: evento.target.value });

  return (
    <Modal abierto={abierto} titulo={editando ? `Editar a ${editando.nombre}` : 'Nuevo aliado'} alCerrar={alCerrar} ancho={520}>
      <form onSubmit={alEnviar}>
        <div className="fila-formulario">
          <label>Nombre y apellido<Input value={formulario.nombre} onChange={campo('nombre')} required /></label>
          <label>Correo<Input type="email" value={formulario.correo} onChange={campo('correo')} required /></label>
        </div>
        <div className="fila-formulario">
          <label>Institución<Input value={formulario.institucion} onChange={campo('institucion')} required /></label>
          <label>Cargo
            <Select
              value={formulario.cargo || undefined}
              placeholder="Opcional"
              allowClear
              options={cargos.map((cargo) => ({ value: cargo, label: legible(cargo) }))}
              onChange={(valor) => alCambiar({ ...formulario, cargo: valor ?? '' })}
            />
          </label>
        </div>
        <div className="fila-formulario">
          <label>Teléfono<Input value={formulario.telefono} onChange={campo('telefono')} placeholder="Opcional" /></label>
        </div>
        <AvisoPrivacidad />
        {error && <p className="error">{error}</p>}
        <div className="acciones">
          <Button type="primary" htmlType="submit" disabled={cargando}>
            {cargando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear aliado'}
          </Button>
          <Button onClick={alCerrar}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
}
