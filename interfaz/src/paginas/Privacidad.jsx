// política de privacidad, disponible sin iniciar sesión. el texto se edita desde Configuración,
// así que se pide a la api en vez de quemarlo y quedar contradiciendo al oficial
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from 'antd';
import { haySesion, llamarApi } from '../servicios/api.js';
import { comoHtml } from '../servicios/markdownSimple.jsx';
import { useInstitucion } from '../contextos/institucion.jsx';

export default function Privacidad() {
  const institucion = useInstitucion();
  const [politica, setPolitica] = useState(null);

  useEffect(() => {
    llamarApi('/api/configuracion/legales')
      .then((t) => setPolitica(t.politica ?? ''))
      .catch(() => setPolitica(''));
  }, []);

  return (
    <main className="pantalla-auth">
      <article className="tarjeta-auth tarjeta-ancha">
        <h1>{institucion.plataforma}</h1>
        <h2>Política de privacidad</h2>

        <div className="sep-arriba">
          {politica === null && <Skeleton active paragraph={{ rows: 8 }} />}
          {politica === '' && <p className="ayuda">Todavía no se cargó el texto de la política.</p>}
          {politica && <article className="documento-legal">{comoHtml(politica)}</article>}
        </div>

        {/* con la sesión abierta, mandar al ingreso echaba al usuario de su propio
            sistema: la política se abre desde adentro y desde afuera */}
        <p className="ayuda centrado sep-arriba">
          {haySesion()
            ? <Link to="/">Volver al sistema</Link>
            : <Link to="/ingreso">Volver al ingreso</Link>}
        </p>
      </article>
    </main>
  );
}
