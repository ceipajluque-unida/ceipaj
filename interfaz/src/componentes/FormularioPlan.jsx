import { Button, Input, InputNumber, Select, Switch } from 'antd';
import { legible, conMiles, sinMiles } from '../servicios/formato.js';
import Modal from './Modal.jsx';

export default function FormularioPlan({ abierto, editando, modulos, formulario, error, cargando, alCambiar, alEnviar, alCerrar }) {
  const campo = (clave) => (evento) => alCambiar({ ...formulario, [clave]: evento.target.value });

  return (
    <Modal abierto={abierto} titulo={editando ? `Editar ${editando.texto}` : 'Nuevo plan'} alCerrar={alCerrar} ancho={560}>
      <form onSubmit={alEnviar}>
        <label><span>Título</span><Input value={formulario.titulo} onChange={campo('titulo')} required /></label>
        <label><span>Descripción</span><Input value={formulario.descripcion} onChange={campo('descripcion')} /></label>
        <div className="fila-campos">
          <label><span>Precio en guaraníes</span>

            <InputNumber value={formulario.precio} min={1} step={50000} style={{ width: '100%' }}
              formatter={conMiles} parser={sinMiles} prefix="Gs."
              onChange={(valor) => alCambiar({ ...formulario, precio: valor })} />
          </label>
          <label><span>Meses que dura</span>
            <InputNumber value={formulario.meses} min={1} max={36} style={{ width: '100%' }}
              onChange={(valor) => alCambiar({ ...formulario, meses: valor })} />
          </label>
        </div>

        <label><span>Tope de usuarios internos (vacío = sin tope)</span>
          <InputNumber value={formulario.maxUsuarios} min={1} style={{ width: '100%' }}
            onChange={(valor) => alCambiar({ ...formulario, maxUsuarios: valor })} />
        </label>

        <label><span>Módulos que habilita (vacío = todos)</span>
          <Select mode="multiple" value={formulario.modulos} style={{ width: '100%' }}
            options={modulos.map((clave) => ({ value: clave, label: legible(clave) }))}
            onChange={(valor) => alCambiar({ ...formulario, modulos: valor })} />
        </label>
        <label><span>Qué incluye, uno por línea</span>
          <Input.TextArea value={formulario.incluye} onChange={campo('incluye')} rows={4} />
        </label>
        <label><span>Se ofrece para contratar</span>
          <span className="casilla">
            <Switch checked={formulario.activo} aria-label="Se ofrece para contratar"
              onChange={(valor) => alCambiar({ ...formulario, activo: valor })} />
            <span className="nota">{formulario.activo ? 'Sí' : 'No'}</span>
          </span>
        </label>
        {error && <p className="error">{error}</p>}
        <div className="acciones">
          <Button type="primary" htmlType="submit" disabled={cargando}>{cargando ? 'Guardando…' : 'Guardar plan'}</Button>
          <Button onClick={alCerrar}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
}
