import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Checkbox, Input } from 'antd';
import { guardarSesion, llamarApi, tokenDispositivo, guardarDispositivo, olvidarDispositivo, motivoDeSalida } from '../servicios/api.js';
import Captcha from '../componentes/Captcha.jsx';
import Legales from '../componentes/Legales.jsx';
import { useInstitucion } from '../contextos/institucion.jsx';
import { comoHtml } from '../servicios/textoLegal.jsx';

const VELO = 'linear-gradient(rgba(20, 38, 58, 0.86), rgba(20, 38, 58, 0.86))';

const soloNumeros = (texto) => texto.replace(/\D/g, '');

export default function Ingreso() {
  const institucion = useInstitucion();
  const navegar = useNavigate();
  const [paso, setPaso] = useState(1);
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [codigo, setCodigo] = useState('');
  const [tokenPre2fa, setTokenPre2fa] = useState(null);
  const [dos, setDos] = useState({});
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [recordar, setRecordar] = useState(false);
  const [confiarEquipo, setConfiarEquipo] = useState(false);
  const [verAlternativas, setVerAlternativas] = useState(false);
  const [captcha, setCaptcha] = useState({ activo: false, claveSitio: '' });
  const [captchaRespuesta, setCaptchaRespuesta] = useState('');
  const [presentacion, setPresentacion] = useState('');
  const [fondo, setFondo] = useState('');
  const [mostrarTextos, setMostrarTextos] = useState(true);

  const [salida] = useState(motivoDeSalida);

  useEffect(() => {
    llamarApi('/api/autenticacion/estado')
      .then((estado) => setCaptcha(estado.captcha ?? { activo: false, claveSitio: '' }))
      .catch(() => {});
    llamarApi('/api/configuracion/legales')
      .then((t) => {
        setPresentacion(t.presentacion ?? '');
        setFondo(t.fondo ?? '');
        setMostrarTextos(t.mostrarTextos !== false);
      })
      .catch(() => {});
  }, []);

  async function enviarClave(evento) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const r = await llamarApi('/api/autenticacion/ingresar', {
        metodo: 'POST',
        cuerpo: { correo, clave, recordar, tokenDispositivo: tokenDispositivo(), captchaRespuesta },
      });

      if (!r.requiereCodigo) {
        guardarSesion(r.token, r.usuario, r.recordar);
        return navegar(r.requiereCambioClave ? '/cambiar-clave' : '/panel');
      }
      setTokenPre2fa(r.tokenPre2fa);
      setDos({ metodo: r.metodo, qr: r.qr ?? null, destino: r.destino, configurado: r.configurado, enviado: r.enviado, alternativas: r.alternativas ?? [] });
      setVerAlternativas(false);
      setPaso(2);
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setCargando(false);
    }
  }

  async function enviarCodigo(evento) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const r = await llamarApi('/api/autenticacion/verificar-codigo', {
        metodo: 'POST',
        cuerpo: { tokenPre2fa, codigo, confiarEquipo },
      });
      guardarSesion(r.token, r.usuario, r.recordar);

      if (r.tokenDispositivo) guardarDispositivo(r.tokenDispositivo);
      else if (!confiarEquipo && tokenDispositivo()) olvidarDispositivo();

      navegar(r.requiereCambioClave ? '/cambiar-clave' : '/panel');
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setCargando(false);
    }
  }

  function volverAlPaso1() {
    setPaso(1);
    setCodigo('');
    setClave('');
    setTokenPre2fa(null);
    setDos({});
    setError(null);
    setVerAlternativas(false);
  }

  async function pedirAlternativo(metodo) {
    setError(null);
    setCodigo('');
    if (metodo === 'app') {
      setDos((previo) => ({ ...previo, metodo: 'app', qr: null, enviado: false }));
      setVerAlternativas(false);
      return;
    }
    try {
      const r = await llamarApi('/api/autenticacion/codigo-alternativo', { metodo: 'POST', cuerpo: { tokenPre2fa, metodo } });
      setDos((previo) => ({ ...previo, metodo: r.metodo, qr: null, destino: r.destino, configurado: r.configurado, enviado: r.enviado }));
      setVerAlternativas(false);
    } catch (excepcion) {
      setError(excepcion.message);
    }
  }

  const conPanel = mostrarTextos || Boolean(fondo);

  const fondoPanel = fondo
    ? { backgroundImage: `${mostrarTextos ? `${VELO}, ` : ''}url(${fondo})` }
    : undefined;

  return (
    <main className={`pantalla-auth ${conPanel ? 'con-marca' : ''}`}>
      {conPanel && (
        <aside className={`marca-auth ${mostrarTextos ? '' : 'solo-imagen'}`} style={fondoPanel}>
          {mostrarTextos && <h1>{institucion.plataforma}</h1>}
          {mostrarTextos && presentacion && <div className="presentacion">{comoHtml(presentacion)}</div>}
        </aside>
      )}

      <div className="caja-auth">
      <section className="tarjeta-auth">
        <h1>{institucion.plataforma}</h1>
        <h2>Ingreso al sistema</h2>

        {paso === 1 && (
          <form onSubmit={enviarClave}>
            <label>Correo<Input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required /></label>
            <label>Contraseña<Input.Password value={clave} onChange={(e) => setClave(e.target.value)} required /></label>
            <Checkbox checked={recordar} onChange={(e) => setRecordar(e.target.checked)}>
              Mantener la sesión abierta varios días en este equipo
            </Checkbox>
            {captcha.activo && <Captcha claveSitio={captcha.claveSitio} alResolver={setCaptchaRespuesta} />}
            {!error && salida && <p className="aviso-sesion">{salida}</p>}
            {error && <p className="error">{error}</p>}
            <Button type="primary" htmlType="submit" disabled={cargando || (captcha.activo && !captchaRespuesta)}>
              {cargando ? 'Verificando…' : 'Continuar'}
            </Button>
            <p className="ayuda"><Link to="/recuperar">¿Olvidaste tu contraseña?</Link></p>
          </form>
        )}

        {paso === 2 && (
          <form onSubmit={enviarCodigo}>
            {dos.metodo === 'app' && dos.qr && (
              <>
                <p className="ayuda">Escaneá el código con tu app de autenticación.</p>
                <img className="qr" src={dos.qr} alt="Código QR para la app de autenticación" />
              </>
            )}
            {dos.metodo !== 'app' && dos.enviado && (
              <p className="ayuda">Te mandamos un código a {dos.destino}.</p>
            )}
            {dos.metodo !== 'app' && !dos.enviado && !dos.configurado && (
              <p className="error">
                El envío de códigos por {dos.metodo === 'sms' ? 'SMS' : 'correo'} todavía no está configurado, así que no te pudimos mandar el código.
                Si tenés la aplicación de autenticación, pedí el código por ahí; si no, avisale al administrador de tu institución.
              </p>
            )}
            {dos.metodo !== 'app' && !dos.enviado && dos.configurado && (
              <p className="error">No pudimos mandarte el código por {dos.metodo === 'sms' ? 'SMS' : 'correo'}. Probá de nuevo en unos minutos o pedilo por otro medio.</p>
            )}
            {dos.alternativas?.filter((m) => m !== dos.metodo).length > 0 && (
              <div className="alternativas-2fa">
                {!verAlternativas ? (
                  <Button type="link" onClick={() => setVerAlternativas(true)}>
                    {dos.metodo === 'app' ? '¿No tenés acceso a tu app?' : '¿No te llegó el código?'}
                  </Button>
                ) : (
                  <div className="acciones">
                    {dos.alternativas.filter((m) => m !== dos.metodo).map((m) => (
                      <Button key={m} size="small" onClick={() => pedirAlternativo(m)}>
                        {m === 'app' ? 'Usar el código de mi app' : m === 'sms' ? 'Enviar por SMS' : 'Enviar por correo'}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <label htmlFor="codigo-2fa">Código de 6 dígitos</label>

            <Input.OTP id="codigo-2fa" length={6} value={codigo} onChange={setCodigo} formatter={soloNumeros} autoFocus />
            <Checkbox checked={confiarEquipo} onChange={(e) => setConfiarEquipo(e.target.checked)}>
              No volver a pedirme el código en este equipo
            </Checkbox>
            {error && <p className="error">{error}</p>}
            <div className="acciones">
              <Button type="primary" htmlType="submit" disabled={cargando}>{cargando ? 'Entrando…' : 'Entrar'}</Button>
              <Button onClick={volverAlPaso1}>Volver</Button>
            </div>
          </form>
        )}
        <Legales />
      </section>
      </div>
    </main>
  );
}
