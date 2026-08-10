export default function Barras({ filas }) {
  const maximo = Math.max(1, ...filas.map((fila) => Number(fila.total) || 0));
  return (
    <ul className="lista-barras">
      {filas.map((fila) => (
        <li key={fila.clave} className="fila-barra">
          <span className="nota">{fila.etiqueta}</span>
          <div className="barra"><span style={{ '--porcentaje': `${Math.round(((Number(fila.total) || 0) / maximo) * 100)}%` }} /></div>
          <strong>{fila.texto ?? fila.total}</strong>
        </li>
      ))}
    </ul>
  );
}
