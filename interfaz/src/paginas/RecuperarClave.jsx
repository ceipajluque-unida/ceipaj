import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from 'antd';
import { llamarApi } from '../servicios/api.js';
import Captcha from '../componentes/Captcha.jsx';
import { useInstitucion } from '../contextos/institucion.jsx';

export default function RecuperarClave() {
  const institucion = useInstitucion();
  const [correo, setCorreo] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enlacePrueba, setEnlacePrueba] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [captcha, setCaptcha] = useState({ activo: false, claveSitio: '' });
  const [captchaRespuesta, setCaptchaRespuesta] = useState('');

  useEffect(() => {
    llamarApi('/api/autenticacion/estado')
      .then((estado) => setCaptcha(estado.captcha ?? { activo: false, claveSitio: '' }))
      .catch(() => {});
  }, []);

  async function enviar(evento) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const respuesta = await llamarApi('/api/autenticacion/recuperar', {
        metodo: 'POST',
        cuerpo: { correo, captchaRespuesta },
      });
      setEnlacePrueba(respuesta.enlacePrueba ?? null);
      setEnviado(true);
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
        <h2>Recuperar contraseña</h2>

        {!enviado && (
          <form onSubmit={enviar}>
            <label>Correo<Input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} autoFocus required /></label>
            {captcha.activo && <Captcha claveSitio={captcha.claveSitio} alResolver={setCaptchaRespuesta} />}
            {error && <p className="error">{error}</p>}
            <Button type="primary" htmlType="submit" disabled={cargando || (captcha.activo && !captchaRespuesta)}>
              {cargando ? 'Enviando…' : 'Enviar enlace'}
            </Button>
            <p className="ayuda pie-auth"><Link to="/ingreso">Volver al ingreso</Link></p>
          </form>
        )}

        {enviado && (
          <>
            <p className="exito">Si ese correo está registrado, ya salió el enlace para cambiar la contraseña. Revisá tu bandeja y también el correo no deseado.</p>
            {enlacePrueba && (
              <p className="ayuda">Todavía no hay envío de correo configurado.<br /><a href={enlacePrueba}>{enlacePrueba}</a></p>
            )}
            <p className="ayuda pie-auth"><Link to="/ingreso">Volver al ingreso</Link></p>
          </>
        )}
      </section>
    </main>
  );
}
