import { Button } from 'antd';
import { guaranies, contar, nombreModulo } from '../servicios/formato.js';

const ESTILO_PORTADA = { width: '100%', height: 110, objectFit: 'cover', borderRadius: 10 };

export const ETIQUETA_CAMBIO = {
  alta: 'Contratar',
  renovacion: 'Renovar',
  mejora: 'Mejorar a este plan',
  no_permitido: 'No disponible con tu plan',
};

// para las preguntas de confirmación: la etiqueta del botón ya dice "plan"
export const TITULO_CAMBIO = {
  alta: 'Contratar el plan',
  renovacion: 'Renovar el plan',
  mejora: 'Mejorar al plan',
};

function textoPeriodo(meses) {
  if (meses === 1) return 'por mes';
  if (meses === 12) return 'por año';
  return `cada ${meses} meses`;
}

// una sola cadena: como varios hijos, el botón de antd los separa con su
// propio espacio y el texto sale partido
function textoBoton(esElActual, cambio) {
  if (esElActual) return 'Renovar por otro período';
  const base = ETIQUETA_CAMBIO[cambio?.tipo] ?? 'Contratar';
  if (cambio?.tipo === 'mejora') return `${base} por ${guaranies(cambio.aPagar)}`;
  return base;
}

export default function TarjetasPlanes({ planes, vigente, cambios = {}, esAdministrador, alElegir }) {
  return (
    <div className="cuadricula">
      {planes.map((plan) => {
        const cambio = cambios[plan.valor];
        const esElActual = vigente?.plan === plan.valor;
        return (
          <article className={`plan ${esElActual ? 'plan-actual' : ''}`} key={plan.valor}>

            {plan.imagen && <img src={`/api/planes/imagenes/${plan.imagen}`} alt="" style={ESTILO_PORTADA} />}
            <h3>{plan.texto}{esElActual && <span className="etiqueta">tu plan</span>}</h3>
            {plan.descripcion && <p className="nota">{plan.descripcion}</p>}
            <p className="cifra">{guaranies(plan.precio)}</p>
            <p className="nota">{textoPeriodo(plan.meses)}</p>
            <ul className="lista-plan">
              <li>{plan.maxUsuarios ? `Hasta ${contar(plan.maxUsuarios, 'usuario', 'usuarios')}` : 'Usuarios sin límite'}</li>
              <li>{plan.maxAliados ? `Hasta ${contar(plan.maxAliados, 'aliado institucional', 'aliados institucionales')}` : 'Aliados ilimitados'}</li>
              <li>{plan.modulos?.length ? `Secciones: ${plan.modulos.map(nombreModulo).join(', ')}` : 'Todas las secciones'}</li>
              {plan.incluye.map((punto) => <li key={punto}>{punto}</li>)}
            </ul>
            {esAdministrador && plan.precio === 0 && (
              <p className="nota">Es el plan al que vuelve la institución cuando no hay una suscripción vigente.</p>
            )}
            {esAdministrador && plan.precio > 0 && (
              <>

                {cambio && !esElActual && cambio.credito > 0 && (
                  <p className="nota">
                    Se te descuentan {guaranies(cambio.credito)} por lo que queda del plan {cambio.planActual}.
                  </p>
                )}
                {cambio?.tipo === 'no_permitido' && <p className="nota">{cambio.motivo}</p>}
                <Button
                  type={esElActual ? 'default' : 'primary'}
                  disabled={cambio?.tipo === 'no_permitido'}
                  aria-label={`${ETIQUETA_CAMBIO[cambio?.tipo] ?? 'Contratar'} el plan ${plan.texto}`}
                  onClick={() => alElegir(plan, cambio)}
                >
                  {textoBoton(esElActual, cambio)}
                </Button>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
