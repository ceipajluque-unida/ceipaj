// lo que se ve al escribir a mano la dirección de un módulo que no corresponde. el
// backend igual lo rechaza; esto evita que la pantalla se dibuje a medias y termine en
// una ventana de error encima de un listado vacío que además era mentira.
import { Link } from 'react-router-dom';
import { Button } from 'antd';

export default function SinAcceso({ inicio = '/', motivo = 'rol', plan }) {
  // son dos casos distintos y conviene decirlo distinto: al primero no hay nada que
  // hacerle desde la pantalla, el segundo se destraba contratando
  const porPlan = motivo === 'plan';

  return (
    <section className="panel panel-angosto">
      <h2>{porPlan ? 'Tu plan no incluye esta sección' : 'No tenés acceso a esta sección'}</h2>
      <p className="nota sep-abajo">
        {porPlan
          ? `El plan ${plan ?? 'contratado'} no habilita este módulo. Podés verlo cambiando de plan desde Suscripción.`
          : 'Tu rol no incluye este módulo. Si creés que deberías verlo, pedíselo a quien administra el sistema.'}
      </p>
      <div className="acciones">
        <Link to={porPlan ? '/suscripcion' : inicio}>
          <Button type="primary">{porPlan ? 'Ver los planes' : 'Volver al inicio'}</Button>
        </Link>
        {porPlan && <Link to={inicio}><Button>Volver al inicio</Button></Link>}
      </div>
    </section>
  );
}
