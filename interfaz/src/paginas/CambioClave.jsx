// cambio de contraseña propio, obligatorio si entró con una clave temporal
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { toast } from '../servicios/avisos.js';

export default function CambioClave() {
  const navegar = useNavigate();
  const [claveActual, setClaveActual] = useState('');
  const [claveNueva, setClaveNueva] = useState('');
  const [claveRepetida, setClaveRepetida] = useState('');
  const [requisitos, setRequisitos] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    llamarApi('/api/autenticacion/politica').then((p) => setRequisitos(p.texto)).catch(() => {});
  }, []);

  async function enviar(evento) {
    evento.preventDefault();
    setError(null);
    // se chequea acá para no molestar al servidor con un error evitable
    if (claveNueva !== claveRepetida) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setCargando(true);
    try {
      await llamarApi('/api/autenticacion/cambiar-clave', {
        metodo: 'POST',
        cuerpo: { claveActual, claveNueva },
      });
      toast('Contraseña actualizada.');
      navegar('/');
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <div className="encabezado-pagina">
        <h2>Cambiar contraseña</h2>
      </div>

      <section className="panel panel-angosto">
        <form onSubmit={enviar}>
          <label>Contraseña actual
            <Input.Password value={claveActual} onChange={(evento) => setClaveActual(evento.target.value)} autoComplete="current-password" required />
          </label>
          <div className="fila-formulario">
            <label>Contraseña nueva
              <Input.Password value={claveNueva} onChange={(evento) => setClaveNueva(evento.target.value)} autoComplete="new-password" required />
            </label>
            <label>Repetir la nueva
              <Input.Password value={claveRepetida} onChange={(evento) => setClaveRepetida(evento.target.value)} autoComplete="new-password" required />
            </label>
          </div>
          {requisitos && <p className="ayuda">{requisitos}</p>}
          {error && <p className="error">{error}</p>}
          <div className="acciones">
            <Button type="primary" htmlType="submit" disabled={cargando}>{cargando ? 'Guardando…' : 'Guardar contraseña'}</Button>
          </div>
        </form>
      </section>
    </>
  );
}
