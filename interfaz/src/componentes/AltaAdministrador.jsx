// alta del administrador de una institución recién creada. sin él, el colegio no puede
// entrar al sistema, así que se ofrece apenas se da de alta la institución.
import { useState } from 'react';
import { Button, Input } from 'antd';
import Modal from './Modal.jsx';
import AvisoPrivacidad from './AvisoPrivacidad.jsx';

export default function AltaAdministrador({ institucion, alEnviar, alCerrar }) {
  const [datos, setDatos] = useState({ nombre: '', correo: '' });
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await alEnviar(datos);
      setDatos({ nombre: '', correo: '' });
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <Modal abierto={Boolean(institucion)} titulo={`Administrador de ${institucion?.nombre ?? ''}`} alCerrar={alCerrar}>
      <form onSubmit={enviar}>
        <p className="nota">
          Recibe sus credenciales por correo y, al entrar, tiene que cambiar la contraseña
          temporal y activar la verificación en dos pasos.
        </p>
        <label><span>Nombre completo</span>
          <Input value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} required />
        </label>
        <label><span>Correo</span>
          <Input type="email" value={datos.correo} onChange={(e) => setDatos({ ...datos, correo: e.target.value })} required />
        </label>
        <AvisoPrivacidad />
        {error && <p className="error">{error}</p>}
        <div className="acciones">
          <Button type="primary" htmlType="submit" disabled={cargando}>{cargando ? 'Creando…' : 'Crear administrador'}</Button>
          <Button onClick={alCerrar}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
}
