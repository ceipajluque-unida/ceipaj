// avisa por qué se volvió al inicio cuando alguien pidió un módulo que no le toca.
// va como mensaje flotante y no como pantalla: la sección no se muestra de ninguna forma.
import { useEffect } from 'react';
import { message } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';

export default function AvisoSinAcceso() {
  const { state, pathname } = useLocation();
  const navegar = useNavigate();

  useEffect(() => {
    const aviso = state?.sinAcceso;
    if (!aviso) return;
    if (aviso.motivo === 'plan') {
      message.warning(`El plan ${aviso.plan ?? 'contratado'} no incluye esa sección. Podés habilitarla cambiando de plan.`);
    } else {
      message.error('No tenés acceso a esa sección.');
    }
    // se limpia el estado para que el aviso no vuelva a salir al recargar o al volver atrás
    navegar(pathname, { replace: true, state: null });
  }, [state]);

  return null;
}
