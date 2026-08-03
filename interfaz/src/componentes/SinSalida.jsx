import { Button, Result } from 'antd';
import { salir } from './Diseno.jsx';

export default function SinSalida({ motivo, plan, modulo, institucion }) {
  const porPlan = motivo === 'plan';

  return (
    <main className="pantalla-auth">
      <section className="tarjeta-auth tarjeta-ancha">
        <Result
          status="warning"
          title={`${modulo ?? 'Tu sección'} no está disponible`}
          subTitle={porPlan
            ? `El plan ${plan ?? 'contratado'} de ${institucion} no habilita esta sección. `
              + 'Escribile a la institución para que la habilite; en cuanto lo haga vas a poder entrar con esta misma cuenta.'
            : 'Tu cuenta no tiene ninguna sección habilitada. Pedíle a quien administra el sistema que revise tus permisos.'}
          extra={[
            <Button key="reintentar" type="primary" onClick={() => window.location.reload()}>Reintentar</Button>,
            <Button key="salir" onClick={salir}>Cerrar sesión</Button>,
          ]}
        />
      </section>
    </main>
  );
}
