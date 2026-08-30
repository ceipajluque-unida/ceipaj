import { Button, Input, Select } from 'antd';
import { legible } from '../servicios/formato.js';
import AvisoPrivacidad from './AvisoPrivacidad.jsx';

export default function FormularioUsuario({ formulario, alCambiar, roles, editando, cargando, error, alEnviar, alCerrar }) {
  const campo = (clave) => (evento) => alCambiar({ ...formulario, [clave]: evento.target.value });

  return (
    <form onSubmit={alEnviar}>
      <label><span>Nombre</span><Input value={formulario.nombre} onChange={campo('nombre')} required /></label>
      <label><span>Correo</span><Input type="email" value={formulario.correo} onChange={campo('correo')} required /></label>
      <div className="fila-campos">
        <label><span>Celular</span><Input value={formulario.telefono} onChange={campo('telefono')} /></label>
        <label><span>Dirección</span><Input value={formulario.direccion} onChange={campo('direccion')} /></label>
      </div>

      {roles.length > 0 && (
        <label><span>Rol</span>
          <Select
            value={formulario.rol}
            options={roles.map((rol) => ({ value: rol.clave, label: rol.titulo }))}
            onChange={(valor) => alCambiar({ ...formulario, rol: valor })}
          />
        </label>
      )}
      <AvisoPrivacidad />
      {error && <p className="error">{error}</p>}
      <div className="acciones">
        <Button type="primary" htmlType="submit" disabled={cargando}>
          {cargando ? 'Guardando…' : (editando ? 'Guardar cambios' : 'Crear usuario')}
        </Button>
        <Button onClick={alCerrar}>Cancelar</Button>
      </div>
    </form>
  );
}
