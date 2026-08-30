import { Button, Checkbox, Input, InputNumber, Switch } from 'antd';
import { conMiles, sinMiles, nombreModulo } from '../servicios/formato.js';
import Modal from './Modal.jsx';

export default function FormularioPlan({ abierto, editando, modulos = [], formulario, error, cargando, alCambiar, alEnviar, alCerrar }) {
  const campo = (clave) => (evento) => alCambiar({ ...formulario, [clave]: evento.target.value });

  return (
    <Modal abierto={abierto} titulo={editando ? `Editar ${editando.texto}` : 'Nuevo plan'} alCerrar={alCerrar} ancho={560}>
      <form onSubmit={alEnviar}>
        <label><span>Título</span><Input value={formulario.titulo} onChange={campo('titulo')} required /></label>
        <label><span>Descripción</span><Input value={formulario.descripcion} onChange={campo('descripcion')} /></label>
        <div className="fila-campos">
          <label><span>Precio</span>

            <InputNumber value={formulario.precio} min={1} step={50000} style={{ width: '100%' }}
              formatter={conMiles} parser={sinMiles} prefix="Gs."
              onChange={(valor) => alCambiar({ ...formulario, precio: valor })} />
          </label>
          <label><span>Meses que dura</span>
            <InputNumber value={formulario.meses} min={1} max={36} style={{ width: '100%' }}
              onChange={(valor) => alCambiar({ ...formulario, meses: valor })} />
          </label>
        </div>

        <div className="fila-campos">
          <label><span>Usuarios internos (vacío = sin tope)</span>
            <InputNumber value={formulario.maxUsuarios} min={1} style={{ width: '100%' }}
              onChange={(valor) => alCambiar({ ...formulario, maxUsuarios: valor })} />
          </label>
          <label><span>Aliados (vacío = sin tope)</span>
            <InputNumber value={formulario.maxAliados} min={1} style={{ width: '100%' }}
              onChange={(valor) => alCambiar({ ...formulario, maxAliados: valor })} />
          </label>
        </div>

        <fieldset className="grupo-casillas">
          <legend>Secciones que habilita este plan (ninguna marcada = todas)</legend>
          <div className="casillas">
            {modulos.map((modulo) => (
              <Checkbox
                key={modulo}
                checked={formulario.modulos.includes(modulo)}
                onChange={(evento) => alCambiar({
                  ...formulario,
                  modulos: evento.target.checked
                    ? [...formulario.modulos, modulo]
                    : formulario.modulos.filter((m) => m !== modulo),
                })}
              >
                {nombreModulo(modulo)}
              </Checkbox>
            ))}
          </div>
        </fieldset>
        <label><span>Detalle de lo que incluye (uno por línea)</span>
          <Input.TextArea value={formulario.incluye} onChange={campo('incluye')} rows={4} />
        </label>
        <label><span>Ofrecer</span>
          <span className="casilla">
            <Switch checked={formulario.activo} aria-label="Ofrecer"
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
