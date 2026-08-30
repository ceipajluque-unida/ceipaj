import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { animarLanding, fijarBarra } from '../servicios/animacion.js';
import QueEsLanding from '../componentes/QueEsLanding.jsx';
import FuncionesLanding from '../componentes/FuncionesLanding.jsx';
import PlanesLanding from '../componentes/PlanesLanding.jsx';
import PreguntasLanding from '../componentes/PreguntasLanding.jsx';
import FormularioSolicitud from '../componentes/FormularioSolicitud.jsx';

import '../estilos/landing.css';

export default function Landing() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [planElegido, setPlanElegido] = useState('');
  const pagina = useRef(null);
  const barra = useRef(null);
  const portada = useRef(null);

  useEffect(() => {
    llamarApi('/api/solicitudes/publico').then(setDatos).catch((e) => setError(e.message));
  }, []);

  // las animaciones se arman recién cuando el contenido está en pantalla
  useLayoutEffect(() => {
    if (!datos) return undefined;
    const soltarRevelado = animarLanding(pagina.current);
    const soltarBarra = fijarBarra(barra.current, portada.current);
    return () => { soltarRevelado(); soltarBarra(); };
  }, [datos]);

  function irA(ancla, plan = '') {
    if (plan) setPlanElegido(plan);
    document.getElementById(ancla)?.scrollIntoView({ behavior: 'smooth' });
  }

  if (error) return <p className="mensaje-centrado">{error}</p>;
  if (!datos) return <p className="mensaje-centrado">Cargando…</p>;

  const { textos, planes, contacto, plataforma } = datos;
  const resaltado = textos.PORTADA.TITULO_RESALTADO;
  const [antes, despues] = resaltado && textos.PORTADA.TITULO.includes(resaltado)
    ? textos.PORTADA.TITULO.split(resaltado)
    : [textos.PORTADA.TITULO, null];
  const datosContacto = [contacto.nombre, contacto.correo, contacto.telefono, contacto.direccion].filter(Boolean).join(', ');
  // la portada se mete debajo de las barras: cuánto sube depende de si la
  // franja de contacto llegó a dibujarse
  const haySuperior = Boolean(textos.BARRA_SUPERIOR?.MOSTRAR && (textos.BARRA_SUPERIOR.TEXTO || datosContacto));

  return (
    <ConfigProvider theme={{ token: { colorPrimary: datos.color } }}>
      {/* el acento va como estilo del propio elemento: puesto en la hoja lo pisaría la regla .landing */}
      <div className={`landing${haySuperior ? ' landing-con-superior' : ''}`} ref={pagina} style={{ '--landing-acento': datos.color }}>
        {haySuperior && (
          <div className="landing-superior">
            <div className="landing-ancho landing-superior-fila">
              <span>{textos.BARRA_SUPERIOR.TEXTO}</span>
              {datosContacto && <span className="landing-superior-contacto">{datosContacto}</span>}
            </div>
          </div>
        )}

        <header className="landing-barra" ref={barra}>
          <div className="landing-ancho landing-barra-fila">
            <a className="landing-marca" href="#portada">{plataforma}</a>
            <nav className="landing-enlaces">
              {textos.NAVEGACION.ENLACES.map((enlace) => (
                <button key={enlace.ancla} type="button" onClick={() => irA(enlace.ancla)}>{enlace.texto}</button>
              ))}
            </nav>
            <div className="landing-barra-acciones">
              <Link to="/ingreso">{textos.NAVEGACION.INGRESAR}</Link>
              <button type="button" className="landing-boton landing-boton-chico" onClick={() => irA('contacto')}>
                {textos.NAVEGACION.BOTON}
              </button>
            </div>
          </div>
        </header>

        <section id="portada" className="landing-portada" ref={portada}>
          <div className="landing-ancho landing-portada-texto" data-portada>
            <h1>
              {antes}
              {despues !== null && <span className="landing-resaltado">{resaltado}</span>}
              {despues}
            </h1>
            <p className="landing-bajada">{textos.PORTADA.BAJADA}</p>
            <div className="landing-botones">
              <button type="button" className="landing-boton" onClick={() => irA('contacto')}>
                {textos.PORTADA.BOTON}
              </button>
              <button type="button" className="landing-boton landing-boton-borde" onClick={() => irA('planes')}>
                {textos.PORTADA.BOTON_PLANES}
              </button>
            </div>
          </div>
        </section>

        <QueEsLanding textos={textos.QUE_ES} />

        <FuncionesLanding titulo={textos.FUNCIONES_TITULO} funciones={textos.FUNCIONES} />

        <PlanesLanding textos={textos.PLANES} planes={planes} alElegir={(plan) => irA('contacto', plan)} />

        <PreguntasLanding textos={textos.PREGUNTAS} />

        <section className="landing-cierre">
          <div className="landing-ancho" data-revelar>
            <h2>{textos.CIERRE.TITULO}</h2>
            <p>{textos.CIERRE.TEXTO}</p>
            <button type="button" className="landing-boton landing-boton-claro" onClick={() => irA('contacto')}>
              {textos.CIERRE.BOTON}
            </button>
          </div>
        </section>

        <section id="contacto" className="landing-seccion landing-ancho">
          <div className="landing-titulo-centrado" data-revelar>
            <h2>{textos.CONTACTO.TITULO}</h2>
            <p>{textos.CONTACTO.BAJADA}</p>
          </div>
          <FormularioSolicitud
            textos={textos.CONTACTO}
            planes={planes}
            claveCaptcha={datos.claveCaptcha}
            planElegido={planElegido}
            alElegirPlan={setPlanElegido}
          />
        </section>

        <footer className="landing-pie">
          <div className="landing-ancho landing-pie-grilla">
            <div>
              <p className="landing-pie-marca">{plataforma}</p>
              {datosContacto && <p>{datosContacto}</p>}
            </div>
            {textos.PIE.COLUMNAS.map((columna) => (
              <nav key={columna.titulo}>
                <p className="landing-pie-titulo">{columna.titulo}</p>
                {columna.enlaces.map((enlace) => (
                  <button key={enlace.ancla} type="button" onClick={() => irA(enlace.ancla)}>{enlace.texto}</button>
                ))}
              </nav>
            ))}
            <nav>
              <p className="landing-pie-titulo">Sistema</p>
              <Link to="/ingreso">Ingresar</Link>
              <Link to="/privacidad">Política de privacidad</Link>
            </nav>
          </div>
          {textos.PIE.TEXTO && <div className="landing-ancho landing-pie-datos">{textos.PIE.TEXTO}</div>}
        </footer>
      </div>
    </ConfigProvider>
  );
}
