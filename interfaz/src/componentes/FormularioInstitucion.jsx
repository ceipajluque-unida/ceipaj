// alta y edición de una institución cliente
import { Button, Input } from 'antd';
import Modal from './Modal.jsx';

export default function FormularioInstitucion({ abierto, editando, formulario, error, cargando, alCambiar, alEnviar, alCerrar }) {
  const campo = (clave) => (evento) => alCambiar({ ...formulario, [clave]: evento.target.value });

  return (
    <Modal abierto={abierto} titulo={editando ? `Editar ${editando.nombre}` : 'Nueva institución'} alCerrar={alCerrar} ancho={520}>
      <form onSubmit={alEnviar}>
        <label><span>Nombre de la institución</span><Input value={formulario.nombre} onChange={campo('nombre')} required /></label>
        <div className="fila-campos">
          <label><span>Ciudad</span><Input value={formulario.ciudad} onChange={campo('ciudad')} /></label>
          <label><span>Teléfono</span><Input value={formulario.telefono} onChange={campo('telefono')} /></label>
        </div>
        <label><span>Correo de contacto</span><Input type="email" value={formulario.correoContacto} onChange={campo('correoContacto')} /></label>
        <label><span>Dirección</span><Input value={formulario.direccion} onChange={campo('direccion')} /></label>
        {error && <p className="error">{error}</p>}
        <div className="acciones">
          <Button type="primary" htmlType="submit" disabled={cargando}>{cargando ? 'Guardando…' : 'Guardar'}</Button>
          <Button onClick={alCerrar}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
}
