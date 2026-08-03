// los textos legales vienen con encabezados ##, listas - y negritas **, se arman a mano para no sumar dependencias
import { Fragment } from 'react';

export function comoHtml(texto) {
  return String(texto ?? '').split(/\n\s*\n/).map((bloque, i) => {
    const limpio = bloque.trim();
    if (limpio.startsWith('## ')) return <h3 key={i}>{limpio.slice(3)}</h3>;
    if (limpio.startsWith('- ')) {
      return (
        <ul key={i}>
          {limpio.split('\n').map((linea, j) => <li key={j}>{conNegritas(linea.replace(/^- /, ''))}</li>)}
        </ul>
      );
    }
    return <p key={i}>{conRenglones(limpio)}</p>;
  });
}

// un salto suelto dentro del párrafo se respeta, si no los renglones seguidos salen pegados en una línea
function conRenglones(bloque) {
  return bloque.split('\n').map((linea, i) => (
    <Fragment key={i}>{i > 0 && <br />}{conNegritas(linea)}</Fragment>
  ));
}

function conNegritas(linea) {
  return linea.split(/(\*\*[^*]+\*\*)/).map((parte, i) =>
    (parte.startsWith('**') ? <strong key={i}>{parte.slice(2, -2)}</strong> : parte));
}
