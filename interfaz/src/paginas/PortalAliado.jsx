import { useEffect, useState } from 'react';
import { llamarApi, usuarioActual } from '../servicios/api.js';
import { avisarError } from '../servicios/avisos.js';
import { contar } from '../servicios/formato.js';
import Barras from '../componentes/Barras.jsx';
import { TEXTO_ESTADO } from './PortalInteresados.jsx';

export default function PortalAliado() {
  const usuario = usuarioActual();
  const [resumen, setResumen] = useState(null);

  useEffect(() => {
    llamarApi('/api/portal/resumen').then(setResumen).catch((e) => avisarError(e.message));
  }, []);

  if (!resumen) return <p className="mensaje-centrado">Cargando…</p>;

  const porEstado = (resumen.porEstado ?? []).map((fila) => ({
    clave: fila.estado,
    etiqueta: TEXTO_ESTADO[fila.estado] ?? fila.estado,
    total: fila.total,
  }));

  return (
    <>
      <header className="encabezado-pagina"><h2>Hola, {usuario?.nombre}</h2></header>

      <section className="cuadricula sep-abajo">
        <article className="indicador">
          <h3>Recomendados</h3>
          <p className="cifra">{resumen.totalLeads}</p>
          <p className="nota">Cada uno suma {contar(resumen.puntosPorLead, 'punto', 'puntos')}</p>
        </article>
        <article className="indicador">
          <h3>Matriculados</h3>
          <p className="cifra">{resumen.convertidos}</p>
          <p className="nota">Cada matrícula suma {contar(resumen.puntosPorConversion, 'punto más', 'puntos más')}</p>
        </article>
        <article className="indicador">
          <h3>Mis puntos</h3>
          <p className="cifra">{resumen.puntos}</p>
        </article>
      </section>

      <section className="panel">
        <h3>Cómo van tus recomendados</h3>
        {porEstado.length === 0 ? (
          <p className="nota">Todavía no recomendaste a nadie.</p>
        ) : (
          <Barras filas={porEstado} />
        )}
      </section>
    </>
  );
}
