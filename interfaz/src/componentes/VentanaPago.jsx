import { useEffect, useRef, useState } from 'react';
import { Alert, Button } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { guaranies } from '../servicios/formato.js';
import { exitoProcesando } from '../servicios/avisos.js';
import { abrirVentanaPago, llevarVentanaPagoA, cerrarVentanaPago, hayVentanaPago } from '../servicios/ventanaPago.js';

export default function VentanaPago({ cobro, alAcreditar, alCerrar }) {
  const [estado, setEstado] = useState('pendiente');
  const [seCanso, setSeCanso] = useState(false);
  const avisado = useRef(false);
  const panel = useRef(null);

  useEffect(() => {
    panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const segundos = cobro.segundosConsulta ?? 5;
  const limite = (cobro.minutosEspera ?? 15) * 60000;

  useEffect(() => {
    const desde = Date.now();
    let vivo = true;
    let turno;

    function proximaEspera() {
      const minutos = (Date.now() - desde) / 60000;
      if (minutos < 2) return segundos * 1000;
      if (minutos < 5) return segundos * 2000;
      return segundos * 4000;
    }

    async function preguntar() {
      if (!vivo) return;
      if (Date.now() - desde > limite) { setSeCanso(true); return; }

      if (document.visibilityState === 'visible') {
        try {
          const actual = await llamarApi(`/api/pagos/${cobro.referencia}/estado`);
          if (!vivo) return;
          if (actual.estado !== 'pendiente' && !avisado.current) {
            avisado.current = true;
            cerrarVentanaPago();
            setEstado(actual.estado);
            alAcreditar(actual.estado);
            if (actual.estado === 'exitoso') {
              await exitoProcesando('Pago acreditado');
              if (vivo) alCerrar();
            }
            return;
          }
        } catch { }
      }
      turno = setTimeout(preguntar, proximaEspera());
    }

    turno = setTimeout(preguntar, segundos * 1000);
    return () => { vivo = false; clearTimeout(turno); };
  }, [cobro.referencia]);

  if (estado === 'exitoso') {
    return (
      <section className="panel panel-pago">
        <Alert type="success" showIcon message="Pago acreditado. El recibo queda en el historial." />
      </section>
    );
  }

  if (estado === 'rechazado') {
    return (
      <section className="panel panel-pago">
        <Alert type="error" showIcon message="El pago fue rechazado." />
        <div className="acciones"><Button onClick={alCerrar}>Cerrar</Button></div>
      </section>
    );
  }

  return (
    <section ref={panel} className="panel panel-pago">
      <header className="pago-cabecera">
        <div>
          <h3>Completá el pago</h3>
          <p className="nota">{cobro.concepto}, {guaranies(cobro.monto)}, referencia {cobro.referencia}</p>
        </div>
        <Button size="small" onClick={alCerrar}>Cancelar</Button>
      </header>

      {cobro.urlPago && cobro.incrustado && (
        <iframe
          className="marco-pago"
          src={cobro.urlPago}
          title="Pago seguro de la pasarela"
          style={{ height: `${cobro.altoCheckout ?? 640}px` }}
          allow="payment"
        />
      )}

      {cobro.urlPago && !cobro.incrustado && (
        <div className="acciones">
          <Button type="primary" onClick={() => { abrirVentanaPago(); llevarVentanaPagoA(cobro.urlPago); }}>
            {hayVentanaPago() ? 'Volver a la ventana de pago' : 'Abrir la ventana de pago'}
          </Button>
        </div>
      )}

      {cobro.urlPago && cobro.incrustado && (
        <p className="nota">
          <a href={cobro.urlPago} target="_blank" rel="noreferrer">Abrir en una pestaña nueva</a>
        </p>
      )}

      {seCanso && (
        <Alert
          type="error"
          showIcon
          message="No llegó la confirmación. Si ya pagaste, usá Actualizar estados en la pantalla Pagos."
        />
      )}
    </section>
  );
}
