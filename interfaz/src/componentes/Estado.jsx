// una sola forma de mostrar un estado en todo el sistema: la pastilla con los
// colores de la institución. las pantallas nuevas venían con la etiqueta de
// fábrica de antd y se notaba que eran de otra tanda.
const TONOS = ['nuevo', 'pendiente', 'exitoso', 'rechazado', 'neutro'];

export default function Estado({ tono = 'neutro', children }) {
  const elegido = TONOS.includes(tono) ? tono : 'neutro';
  return <span className={`estado estado-${elegido}`}>{children}</span>;
}
