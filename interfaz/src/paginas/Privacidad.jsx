import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from 'antd';
import { haySesion, llamarApi } from '../servicios/api.js';
import { comoHtml } from '../servicios/textoLegal.jsx';
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

        <p className="ayuda centrado sep-arriba">
          {haySesion()
            ? <Link to="/panel">Volver al sistema</Link>
            : <Link to="/ingreso">Volver al ingreso</Link>}
        </p>
      </article>
    </main>
  );
}
