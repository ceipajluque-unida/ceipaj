import { Button } from 'antd';
import { guaranies, fecha, contar, legible } from '../servicios/formato.js';

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

            {plan.imagen && <img src={`/api/planes/imagenes/${plan.imagen}`} alt="" style={ESTILO_PORTADA} />}
            <h3>{plan.texto}{esElActual && <span className="etiqueta">tu plan</span>}</h3>
            {plan.descripcion && <p className="nota">{plan.descripcion}</p>}
            <p className="cifra">{guaranies(plan.precio)}</p>
            <p className="nota">{textoPeriodo(plan.meses)}</p>
            <ul className="lista-plan">
              <li>{plan.maxUsuarios ? `Hasta ${contar(plan.maxUsuarios, 'usuario', 'usuarios')}` : 'Usuarios sin límite'}</li>
              <li>{plan.maxAliados ? `Hasta ${contar(plan.maxAliados, 'aliado institucional', 'aliados institucionales')}` : 'Aliados ilimitados'}</li>
              <li>{plan.modulos?.length ? `Módulos: ${plan.modulos.map(legible).join(', ')}` : 'Todos los módulos'}</li>
              {plan.incluye.map((punto) => <li key={punto}>{punto}</li>)}
            </ul>
            {esAdministrador && (
              <>

                {cambio && !esElActual && cambio.credito > 0 && (
                  <p className="nota">
                    Se te descuentan {guaranies(cambio.credito)} por lo que queda del plan {cambio.planActual}.
                  </p>
                )}
                {cambio?.tipo === 'reduccion' && (
                  <p className="nota">
                    Tu saldo de {guaranies(cambio.credito)} cubre {contar(cambio.diasQueCubre, 'día', 'días')} de este plan.
                  </p>
                )}
                <Button
                  type={esElActual ? 'default' : 'primary'}
                  aria-label={`${ETIQUETA_CAMBIO[cambio?.tipo] ?? 'Contratar'} el plan ${plan.texto}`}
                  onClick={() => alElegir(plan, cambio)}
                >
                  {esElActual ? 'Renovar por otro período' : ETIQUETA_CAMBIO[cambio?.tipo] ?? 'Contratar'}
                  {cambio?.tipo === 'mejora' && ` por ${guaranies(cambio.aPagar)}`}
                  {cambio?.tipo === 'reduccion' && ', sin cargo'}
                </Button>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
