import { Plus } from 'lucide-react';

// acordeon con details y summary: se abre con el teclado y funciona aunque el
// javascript no llegue a correr, sin depender de ningun componente
export default function PreguntasLanding({ textos }) {
  return (
    <section id="preguntas" className="landing-seccion landing-ancho">
      <div className="landing-titulo-centrado" data-revelar>
        <h2>{textos.TITULO}</h2>
      </div>
      <div className="landing-preguntas" data-revelar-grupo>
        {textos.LISTA.map((item) => (
          <details key={item.pregunta}>
            <summary>
              {item.pregunta}
              <Plus size={18} aria-hidden="true" />
            </summary>
            <p>{item.respuesta}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
