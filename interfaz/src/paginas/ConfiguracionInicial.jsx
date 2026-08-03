// primer arranque del sistema, crea el administrador y activa su 2fa
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input } from 'antd';
import { guardarSesion, llamarApi } from '../servicios/api.js';
import { useInstitucion } from '../contextos/institucion.jsx';

export default function ConfiguracionInicial() {
  const institucion = useInstitucion();
  const navegar = useNavigate();
  const [paso, setPaso] = useState(1);
  const [datos, setDatos] = useState({ nombre: '', correo: '', clave: '', repetir: '' });
  const [qr, setQr] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [requisitos, setRequisitos] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  // los requisitos de la contraseña son configurables, así que se piden al servidor
  useEffect(() => {
    llamarApi('/api/autenticacion/politica').then((p) => setRequisitos(p.texto)).catch(() => {});
  }, []);

  function cambiar(evento) {
    setDatos({ ...datos, [evento.target.name]: evento.target.value });
  }

  async function crearAdministrador(evento) {
    evento.preventDefault();
    setError(null);
    if (datos.clave !== datos.repetir) return setError('Las contraseñas no coinciden.');
    setCargando(true);
    try {
      const respuesta = await llamarApi('/api/autenticacion/primer-administrador', {
        metodo: 'POST',
        cuerpo: { nombre: datos.nombre, correo: datos.correo, clave: datos.clave },
      });
      setQr(respuesta.qr);
      setPaso(2);
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setCargando(false);
    }
  }

  async function confirmarCodigo(evento) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      // se reutiliza el flujo normal de ingreso...clave, código y sesión
      const paso1 = await llamarApi('/api/autenticacion/ingresar', {
        metodo: 'POST',
        cuerpo: { correo: datos.correo, clave: datos.clave },
      });
      const paso2 = await llamarApi('/api/autenticacion/verificar-codigo', {
        metodo: 'POST',
        cuerpo: { tokenPre2fa: paso1.tokenPre2fa, codigo },
      });
      guardarSesion(paso2.token, paso2.usuario);
      navegar('/');
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="pantalla-auth">
      <section className="tarjeta-auth">
        <h1>{institucion.nombre}</h1>
        <h2>Configuración inicial</h2>

        {paso === 1 && (
          <form onSubmit={crearAdministrador}>
            <label>Nombre completo
              <Input name="nombre" value={datos.nombre} onChange={cambiar} required />
            </label>
            <label>Correo
              <Input name="correo" type="email" value={datos.correo} onChange={cambiar} required />
            </label>
            <label>Contraseña
              <Input.Password name="clave" value={datos.clave} onChange={cambiar} required />
            </label>
            <label>Repetir la contraseña
              <Input.Password name="repetir" value={datos.repetir} onChange={cambiar} required />
            </label>
            {requisitos && <p className="ayuda">{requisitos}</p>}
            {error && <p className="error">{error}</p>}
            <Button type="primary" htmlType="submit" disabled={cargando}>{cargando ? 'Creando…' : 'Crear administrador'}</Button>
          </form>
        )}

        {paso === 2 && (
          <form onSubmit={confirmarCodigo}>
            <p className="ayuda">Escaneá el código con tu app de autenticación.</p>
            <img className="qr" src={qr} alt="Código QR para la app de autenticación" />
            <label>Código de 6 dígitos
              <Input
                value={codigo}
                onChange={(evento) => setCodigo(evento.target.value)}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                autoFocus
                required
              />
            </label>
            {error && <p className="error">{error}</p>}
            <Button type="primary" htmlType="submit" disabled={cargando}>{cargando ? 'Verificando…' : 'Activar y entrar'}</Button>
          </form>
        )}
        <p className="ayuda pie-auth">
          <Link to="/privacidad">Política de privacidad</Link>
        </p>
      </section>
    </main>
  );
}
