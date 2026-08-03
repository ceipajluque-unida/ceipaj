import { contar } from '../servicios/formato.js';

export default function IndicadoresAliados({ aliados }) {
  const activos = aliados.filter((aliado) => aliado.activo).length;
  const recomendados = aliados.reduce((total, aliado) => total + Number(aliado.total_leads), 0);
  const matriculados = aliados.reduce((total, aliado) => total + Number(aliado.convertidos), 0);

  return (
    <section className="cuadricula sep-abajo">
      <article className="indicador">
        <h3>Aliados activos</h3>
        <p className="cifra">{activos}</p>
        <p className="nota">{contar(aliados.length, 'aliado en total', 'aliados en total')}</p>
      </article>
      <article className="indicador">
        <h3>Interesados recomendados</h3>
        <p className="cifra">{recomendados}</p>
      </article>
      <article className="indicador">
        <h3>Llegaron a matricularse</h3>
        <p className="cifra">{matriculados}</p>
      </article>
    </section>
  );
}
