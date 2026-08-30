import { Check } from 'lucide-react';
import { guaranies } from '../servicios/formato.js';

const tope = (valor, singular, plural) => (valor === null ? `${plural} sin tope` : `${valor} ${valor === 1 ? singular : plural}`);

export default function PlanesLanding({ textos, planes, alElegir }) {
  return (
    <section id="planes" className="landing-seccion landing-ancho">
      <div className="landing-titulo-centrado" data-revelar>
        <h2>{textos.TITULO}</h2>
        {textos.BAJADA && <p>{textos.BAJADA}</p>}
      </div>

      <div className="landing-planes" data-revelar-grupo>
        {planes.map((plan) => {
          const destacado = plan.valor === textos.DESTACADO;
          return (
            <article key={plan.valor} className={`landing-plan${destacado ? ' landing-plan-destacado' : ''}`}>
              {destacado && <p className="landing-cinta">{textos.ETIQUETA_DESTACADO}</p>}
              <h3>{plan.texto}</h3>
              <p className="landing-precio">
                {guaranies(plan.precio)}<span>por mes</span>
              </p>
              {plan.descripcion && <p className="landing-plan-nota">{plan.descripcion}</p>}

              <ul className="landing-lista-check">
                <li><Check size={16} aria-hidden="true" />{tope(plan.maxUsuarios, 'usuario interno', 'usuarios internos')}</li>
                <li><Check size={16} aria-hidden="true" />{tope(plan.maxAliados, 'aliado', 'aliados')}</li>
                {plan.incluye.map((punto) => (
                  <li key={punto}><Check size={16} aria-hidden="true" />{punto}</li>
                ))}
              </ul>

              <button
                type="button"
                className={`landing-boton${destacado ? '' : ' landing-boton-suave'}`}
                onClick={() => alElegir(plan.valor)}
              >
                {textos.BOTON}
              </button>
            </article>
          );
        })}
      </div>

      <p className="landing-nota landing-nota-centrada" data-revelar>{textos.PIE}</p>
    </section>
  );
}
