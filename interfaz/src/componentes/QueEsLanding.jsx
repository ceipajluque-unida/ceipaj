// lo primero que necesita saber quien entra: qué es esto. va antes de las
// tarjetas, que ya hablan de problemas concretos.
export default function QueEsLanding({ textos }) {
  return (
    <section id="que-es" className="landing-seccion landing-ancho">
      <div className="landing-titulo-centrado" data-revelar>
        <h2>{textos.TITULO}</h2>
        <p>{textos.TEXTO}</p>
      </div>

      <ol className="landing-pasos" data-revelar-grupo>
        {textos.PASOS.map((paso, indice) => (
          <li key={paso.titulo}>
            <span className="landing-numero">{indice + 1}</span>
            <h3>{paso.titulo}</h3>
            <p>{paso.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
