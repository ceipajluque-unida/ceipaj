import { useEffect, useState } from 'react';
import { Alert, Input, Select } from 'antd';
import { Link } from 'react-router-dom';
import { llamarApi } from '../servicios/api.js';
import Captcha from './Captcha.jsx';

const VACIO = {
  nombre: '', institucion: '', correo: '', telefono: '', ciudad: '', mensaje: '', motivo: '', plan: '',
};

export default function FormularioSolicitud({ textos, planes, claveCaptcha, planElegido, alElegirPlan }) {
  const [datos, setDatos] = useState({ ...VACIO, motivo: textos.MOTIVOS[0]?.valor ?? '' });
  const [captcha, setCaptcha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [listo, setListo] = useState(null);

  // al elegir un plan mas arriba, el formulario queda apuntando a ese plan
  useEffect(() => {
    if (!planElegido) return;
    setDatos((previo) => ({ ...previo, plan: planElegido, motivo: 'plan' }));
  }, [planElegido]);

  const cambiar = (campo) => (evento) => {
    const valor = evento?.target ? evento.target.value : evento;
    setDatos((previo) => ({ ...previo, [campo]: valor }));
    if (campo === 'plan' && alElegirPlan) alElegirPlan(valor);
  };

  async function enviar(evento) {
    evento.preventDefault();
    setError(null);
    if (!datos.nombre.trim()) return setError('Escribí tu nombre.');
    if (!datos.correo.trim()) return setError('Escribí tu correo.');
    if (claveCaptcha && !captcha) return setError('Resolvé el captcha para continuar.');

    setEnviando(true);
    try {
      const respuesta = await llamarApi('/api/solicitudes', { metodo: 'POST', cuerpo: { ...datos, captcha } });
      setListo(respuesta.mensaje ?? textos.EXITO);
      setDatos({ ...VACIO, motivo: textos.MOTIVOS[0]?.valor ?? '' });
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setEnviando(false);
      setCaptcha('');
    }
  }

  if (listo) {
    return <Alert className="landing-exito" type="success" showIcon message={listo} />;
  }

  return (
    <form className="landing-formulario" onSubmit={enviar}>
      <div className="landing-campos">
        <label>
          <span>Nombre y apellido</span>
          <Input value={datos.nombre} onChange={cambiar('nombre')} maxLength={100} required />
        </label>
        <label>
          <span>Institución</span>
          <Input value={datos.institucion} onChange={cambiar('institucion')} maxLength={150} />
        </label>
        <label>
          <span>Correo</span>
          <Input type="email" value={datos.correo} onChange={cambiar('correo')} maxLength={150} required />
        </label>
        <label>
          <span>Teléfono</span>
          <Input value={datos.telefono} onChange={cambiar('telefono')} maxLength={30} />
        </label>
        <label>
          <span>Ciudad</span>
          <Input value={datos.ciudad} onChange={cambiar('ciudad')} maxLength={80} />
        </label>
        <label>
          <span>Motivo</span>
          <Select value={datos.motivo} onChange={cambiar('motivo')} style={{ width: '100%' }} aria-label="Motivo"
            options={textos.MOTIVOS.map((m) => ({ value: m.valor, label: m.texto }))} />
        </label>
        <label className="landing-campo-ancho">
          <span>Plan de interés</span>
          <Select value={datos.plan} onChange={cambiar('plan')} style={{ width: '100%' }} allowClear aria-label="Plan de interés"
            placeholder="Sin definir"
            options={planes.map((plan) => ({ value: plan.valor, label: plan.texto }))} />
        </label>
        <label className="landing-campo-ancho">
          <span>Mensaje</span>
          <Input.TextArea rows={4} value={datos.mensaje} onChange={cambiar('mensaje')} maxLength={600} showCount aria-label="Mensaje" />
        </label>
      </div>

      {claveCaptcha && <Captcha claveSitio={claveCaptcha} alResolver={setCaptcha} />}
      {error && <p className="error">{error}</p>}

      <button type="submit" className="landing-boton" disabled={enviando}>
        {enviando ? 'Enviando…' : 'Enviar la solicitud'}
      </button>

      <p className="landing-aviso">
        {textos.AVISO ? `${textos.AVISO} ` : ''}
        <Link to="/privacidad">{textos.ENLACE_AVISO}</Link>
      </p>
    </form>
  );
}
