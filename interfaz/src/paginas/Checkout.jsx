import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Descriptions, Divider, Input, Result, Steps } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { guaranies, legible } from '../servicios/formato.js';

const TARJETA_DE_PRUEBA = { numero: '4111 1111 1111 1111', vence: '12/30', codigo: '123', titular: '' };

export default function Checkout() {
  const { hash } = useParams();
  const navegar = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [tarjeta, setTarjeta] = useState(TARJETA_DE_PRUEBA);
  const [pagando, setPagando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    llamarApi(`/api/pagos/simulada/${hash}`)
      .then((datos) => { setPedido(datos); setListo(datos.estado === 'exitoso'); })
      .catch((excepcion) => setError(excepcion.message));
  }, [hash]);

  async function confirmar(evento) {
    evento.preventDefault();
    setError(null);
    if (!tarjeta.titular.trim()) return setError('Escribí el nombre que figura en la tarjeta.');
    setPagando(true);
    try {
      await llamarApi(`/api/pagos/simulada/${hash}/pagar`, { metodo: 'POST' });
      window.dispatchEvent(new Event('plan'));
      setListo(true);
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setPagando(false);
    }
  }

  if (error && !pedido) return <Alert type="error" showIcon message={error} />;
  if (!pedido) return <p className="mensaje-centrado">Cargando el pedido…</p>;

  const campo = (clave) => (evento) => setTarjeta({ ...tarjeta, [clave]: evento.target.value });

  return (
    <>
      <header className="encabezado-pagina">
        <h2>Pago de {pedido.concepto}</h2>
      </header>

      <section className="panel panel-checkout">
        <Steps
          size="small"
          current={listo ? 2 : 1}
          items={[{ title: 'Pedido' }, { title: 'Pago' }, { title: 'Acreditado' }]}
        />
        <Divider />

        {listo ? (
          <Result
            status="success"
            title="Pago acreditado"
            subTitle={`Referencia ${pedido.referencia}, ${guaranies(pedido.monto)}`}
            extra={[
              <Button key="pagos" type="primary" onClick={() => navegar('/pagos')}>Ver el comprobante</Button>,
              <Button key="susc" onClick={() => navegar('/suscripcion')}>Ir a Suscripción</Button>,
            ]}
          />
        ) : (
          <div className="dos-columnas">
            <article>
              <h3>Detalle</h3>
              <Descriptions column={1} size="small" bordered items={[
                { key: 'c', label: 'Concepto', children: pedido.concepto },
                { key: 'r', label: 'Referencia', children: pedido.referencia },
                { key: 'm', label: 'Medio', children: legible(pedido.medio) },
                { key: 't', label: 'Total', children: <strong>{guaranies(pedido.monto)}</strong> },
              ]} />
              <Alert
                className="sep-arriba"
                type="info"
                showIcon
                message="Pasarela Demo"
                description="No se cobra dinero real. Los datos de la tarjeta no se guardan en ningún lado."
              />
            </article>

            <article>
              <h3>Datos de la tarjeta</h3>
              <form onSubmit={confirmar}>
                <label><span>Nombre del titular</span>
                  <Input value={tarjeta.titular} onChange={campo('titular')} required />
                </label>
                <label><span>Número</span>
                  <Input value={tarjeta.numero} onChange={campo('numero')} inputMode="numeric" />
                </label>
                <div className="fila-campos">
                  <label><span>Vencimiento</span>
                    <Input value={tarjeta.vence} onChange={campo('vence')} placeholder="MM/AA" />
                  </label>
                  <label><span>Código</span>
                    <Input value={tarjeta.codigo} onChange={campo('codigo')} inputMode="numeric" maxLength={4} />
                  </label>
                </div>
                {error && <p className="error">{error}</p>}
                <div className="acciones sep-arriba">
                  <Button type="primary" htmlType="submit" size="large" disabled={pagando}>
                    {pagando ? 'Procesando…' : `Pagar ${guaranies(pedido.monto)}`}
                  </Button>
                  <Button onClick={() => navegar(-1)}>Cancelar</Button>
                </div>
              </form>
            </article>
          </div>
        )}
      </section>
    </>
  );
}
