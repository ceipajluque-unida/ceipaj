// olvido de contraseña, paso 2. con el token del enlace se elige la clave nueva
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { toast } from '../servicios/avisos.js';
import { useInstitucion } from '../contextos/institucion.jsx';

export default function RestablecerClave() {
  const institucion = useInstitucion();
  const [parametros] = useSearchParams();
  const token = parametros.get('token') ?? '';
  const navegar = useNavigate();
  const [clave, setClave] = useState('');
  const [repetir, setRepetir] = useState('');
  const [requisitos, setRequisitos] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    llamarApi('/api/autenticacion/politica').then((p) => setRequisitos(p.texto)).catch(() => {});
  }, []);

  async function enviar(evento) {
    evento.preventDefault();
    setError(null);
    if (clave !== repetir) return setError('Las contraseñas no coinciden.');
    setCargando(true);
    try {
      await llamarApi('/api/autenticacion/restablecer', { metodo: 'POST', cuerpo: { token, claveNueva: clave } });
      toast('Contraseña actualizada. Ya podés ingresar.');
      navegar('/ingreso');
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="pantalla-auth">
      <section className="tarjeta-auth">
        <h1>{institucion.plataforma}</h1>
        <h2>Nueva contraseña</h2>
        {!token && (
          <>
            <p className="error">Este enlace no es válido o está incompleto.</p>
            <p className="ayuda"><Link to="/recuperar">Pedí uno nuevo</Link></p>
          </>
        )}
        {token && (
          <form onSubmit={enviar}>
            <label>Contraseña nueva<Input.Password value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="new-password" autoFocus required /></label>
            <label>Repetir la contraseña<Input.Password value={repetir} onChange={(e) => setRepetir(e.target.value)} autoComplete="new-password" required /></label>
            {requisitos && <p className="ayuda">{requisitos}</p>}
            {error && <p className="error">{error}</p>}
            <Button type="primary" htmlType="submit" disabled={cargando}>{cargando ? 'Guardando…' : 'Guardar contraseña'}</Button>
          </form>
        )}
        <p className="ayuda pie-auth"><Link to="/ingreso">Volver al ingreso</Link></p>
      </section>
    </main>
  );
}
