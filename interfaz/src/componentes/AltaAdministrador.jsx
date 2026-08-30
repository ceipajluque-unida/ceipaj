import { useState } from 'react';
import { Button, Input, Select } from 'antd';
import Modal from './Modal.jsx';
import AvisoPrivacidad from './AvisoPrivacidad.jsx';

const VACIO = { nombre: '', correo: '', telefono: '', direccion: '', metodo2fa: 'app' };

const METODOS = [
  { value: 'app', label: 'Aplicación de autenticación' },
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
        <AvisoPrivacidad />
        {error && <p className="error">{error}</p>}
        <div className="acciones">
          <Button type="primary" htmlType="submit" disabled={cargando}>{cargando ? 'Creando…' : 'Crear usuario'}</Button>
          <Button onClick={alCerrar}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
}
