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
      message.warning({
        content: `${aviso.modulo ?? 'Esa sección'} no está disponible con el plan ${aviso.plan ?? 'contratado'}. `
          + 'Podés habilitarla contratando un plan que la incluya.',
        duration: 6,
      });
    } else {
      message.error({
        content: `${aviso.modulo ?? 'Esa sección'} no está disponible para tu rol. `
          + 'Si necesitás entrar, pedíselo a quien administra el sistema.',
        duration: 6,
      });
    }

    navegar(pathname, { replace: true, state: null });
  }, [state]);

  return null;
}
