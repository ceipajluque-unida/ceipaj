// las tarjetas de los planes disponibles. cada botón dice lo que va a pasar de verdad:
// renovar el que ya se tiene, mejorar pagando la diferencia, o pasar a uno más barato
// cuando termine el período pagado.
import { Button } from 'antd';
import { guaranies, fecha, contar, legible } from '../servicios/formato.js';

// alto fijo para que las tarjetas queden parejas aunque las imágenes vengan de distintos tamaños
const ESTILO_PORTADA = { width: '100%', height: 110, objectFit: 'cover', borderRadius: 10 };

export const ETIQUETA_CAMBIO = {
  alta: 'Contratar',
  renovacion: 'Renovar',
  mejora: 'Mejorar a este plan',
  reduccion: 'Pasar a este plan',
};

function textoPeriodo(meses) {
  if (meses === 1) return 'por mes';
  if (meses === 12) return 'por año';
  return `cada ${meses} meses`;
}

export default function TarjetasPlanes({ planes, vigente, cambios = {}, esAdministrador, alElegir }) {
  return (
    <div className="cuadricula">
      {planes.map((plan) => {
        const cambio = cambios[plan.valor];
        const esElActual = vigente?.plan === plan.valor;
        return (
          <article className={`plan ${esElActual ? 'plan-actual' : ''}`} key={plan.valor}>
            {/* decorativa: el título va justo abajo, repetirlo en el alt molesta al lector de pantalla */}
            {plan.imagen && <img src={`/api/planes/imagenes/${plan.imagen}`} alt="" style={ESTILO_PORTADA} />}
            <h3>{plan.texto}{esElActual && <span className="etiqueta">tu plan</span>}</h3>
            {plan.descripcion && <p className="nota">{plan.descripcion}</p>}
            <p className="cifra">{guaranies(plan.precio)}</p>
            <p className="nota">{textoPeriodo(plan.meses)}</p>
            <ul className="lista-plan">
              <li>{plan.maxUsuarios ? `Hasta ${contar(plan.maxUsuarios, 'usuario', 'usuarios')}` : 'Usuarios sin límite'}</li>
              <li>{plan.modulos?.length ? `Módulos: ${plan.modulos.map(legible).join(', ')}` : 'Todos los módulos'}</li>
              {plan.incluye.map((punto) => <li key={punto}>{punto}</li>)}
            </ul>
            {esAdministrador && (
              <>
                {/* el detalle va antes del botón: quien lo aprieta ya sabe qué se le cobra */}
                {cambio && !esElActual && cambio.credito > 0 && (
                  <p className="nota">
                    Se te descuentan {guaranies(cambio.credito)} por lo que queda del plan {cambio.planActual}.
                  </p>
                )}
                {cambio?.tipo === 'reduccion' && (
                  <p className="nota">Empieza el {fecha(cambio.desde)}, al terminar el período que ya pagaste.</p>
                )}
                <Button
                  type={esElActual ? 'default' : 'primary'}
                  aria-label={`${ETIQUETA_CAMBIO[cambio?.tipo] ?? 'Contratar'} el plan ${plan.texto}`}
                  onClick={() => alElegir(plan, cambio)}
                >
                  {esElActual ? 'Renovar por otro período' : ETIQUETA_CAMBIO[cambio?.tipo] ?? 'Contratar'}
                  {cambio && cambio.aPagar !== plan.precio && ` — ${guaranies(cambio.aPagar)}`}
                </Button>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
