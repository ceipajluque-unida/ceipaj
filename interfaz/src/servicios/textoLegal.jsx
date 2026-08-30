const TITULO = /^\d+\.\s+\S/;

export function comoHtml(texto) {
  return String(texto ?? '').split(/\n\s*\n/).map((bloque, i) => {
    const limpio = bloque.trim();
    if (TITULO.test(limpio) && !limpio.includes('\n') && limpio.length < 90) {
      return <h3 key={i}>{limpio}</h3>;
    }
    if (limpio.startsWith('- ')) {
      return (
        <ul key={i}>
          {limpio.split('\n').map((linea, j) => <li key={j}>{linea.replace(/^- /, '')}</li>)}
        </ul>
      );
    }
    return <p key={i}>{limpio}</p>;
  });
}
