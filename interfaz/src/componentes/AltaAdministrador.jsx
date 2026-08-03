// alta del administrador de una institución recién creada. sin él, el colegio no puede
// entrar al sistema, así que se ofrece apenas se da de alta la institución.
import { useState } from 'react';
import { Button, Input, Select } from 'antd';
import Modal from './Modal.jsx';
import AvisoPrivacidad from './AvisoPrivacidad.jsx';

const VACIO = { nombre: '', correo: '', telefono: '', direccion: '', metodo2fa: 'app' };

// el mismo catálogo del backend; acá se muestra en criollo
const METODOS = [
  { value: 'app', label: 'Aplicación de autenticación (Google Authenticator)' },
  { value: 'email', label: 'Código por correo electrónico' },
  { value: 'sms', label: 'Código por SMS' },
];

export default function AltaAdministrador({ institucion, alEnviar, alCerrar }) {
  const [datos, setDatos] = useState(VACIO);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const campo = (clave) => (evento) => setDatos({ ...datos, [clave]: evento.target.value });

  async function enviar(evento) {
    evento.preventDefault();
    setError(null);
    // el Select de antd no admite required, así que la validación va acá
    if (!datos.metodo2fa) return setError('Elegí cómo va a verificar su identidad.');
    if (datos.metodo2fa === 'sms' && !datos.telefono.trim()) {
      return setError('Para verificar por SMS hace falta cargar el celular.');
    }
    setCargando(true);
    try {
      await alEnviar(datos);
      setDatos(VACIO);
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <Modal abierto={Boolean(institucion)} titulo={`Administrador de ${institucion?.nombre ?? ''}`} alCerrar={alCerrar} ancho={560}>
      <form onSubmit={enviar}>
        <p className="nota">
          Es quien va a manejar el sistema en la institución: contrata la suscripción, da
          de alta al resto del personal y configura las reglas de su colegio. Recibe sus
          credenciales por correo y, al entrar, tiene que cambiar la contraseña temporal.
        </p>
        <label><span>Nombre completo</span>
          <Input value={datos.nombre} onChange={campo('nombre')} required />
        </label>
        <div className="fila-campos">
          <label><span>Correo</span>
            <Input type="email" value={datos.correo} onChange={campo('correo')} required />
          </label>
          <label><span>Celular</span>
            <Input value={datos.telefono} onChange={campo('telefono')} placeholder="0981 123 456" />
          </label>
        </div>
        <label><span>Dirección</span>
          <Input value={datos.direccion} onChange={campo('direccion')} />
        </label>
        <label><span>Cómo verifica su identidad al entrar</span>
          <Select value={datos.metodo2fa} onChange={(v) => setDatos({ ...datos, metodo2fa: v })}
            options={METODOS} style={{ width: '100%' }} />
        </label>
        <p className="nota">
          Con la aplicación no hace falta tener el correo ni los SMS configurados, así que
          es la opción segura para el primer ingreso.
        </p>
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
