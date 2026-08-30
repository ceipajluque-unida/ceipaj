import { Check, Users, BellRing, Handshake, BarChart3 } from 'lucide-react';

const ICONOS = { captacion: Users, seguimiento: BellRing, aliados: Handshake, gerencia: BarChart3 };

// tarjetas con icono en fila: es la forma en que se leen las paginas de
// producto de toda la vida, y no hace falta explicarla
export default function FuncionesLanding({ titulo, funciones }) {
  return (
    <section id="funciones" className="landing-seccion landing-seccion-gris">
      <div className="landing-ancho">
        <div className="landing-titulo-centrado" data-revelar>
          <h2>{titulo.TITULO}</h2>
          {titulo.BAJADA && <p>{titulo.BAJADA}</p>}
        </div>

        <div className="landing-servicios" data-revelar-grupo>
          {funciones.map((funcion) => {
            const Icono = ICONOS[funcion.icono] ?? Users;
            return (
              <article key={funcion.titulo} className="landing-servicio">
                <span className="landing-servicio-icono"><Icono size={26} aria-hidden="true" /></span>
                <p className="landing-etiqueta-seccion">{funcion.etiqueta}</p>
                <h3>{funcion.titulo}</h3>
                <p className="landing-servicio-texto">{funcion.texto}</p>
                <ul className="landing-lista-check">
                  {funcion.puntos.map((punto) => (
                    <li key={punto}><Check size={16} aria-hidden="true" />{punto}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
