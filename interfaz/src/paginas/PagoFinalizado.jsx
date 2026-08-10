import { useEffect, useState } from 'react';
import { Button, Result } from 'antd';
import { Link } from 'react-router-dom';

export default function PagoFinalizado() {
  const [sigueAbierta, setSigueAbierta] = useState(false);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      window.close();
      setSigueAbierta(true);
    }, 1500);
    return () => clearTimeout(temporizador);
  }, []);

  return (
    <main className="pantalla-suelta">
      <Result
        status="success"
        title="Pago procesado"
        subTitle="Esta ventana se cierra sola y el sistema queda al día."
        extra={sigueAbierta && <Link to="/"><Button type="primary">Volver al sistema</Button></Link>}
      />
    </main>
  );
}
