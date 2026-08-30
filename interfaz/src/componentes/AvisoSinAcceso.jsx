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
        content: `${aviso.modulo ?? 'Esa sección'} no está incluida en el plan ${aviso.plan ?? 'contratado'}. `
          + 'Se habilita cambiando de plan.',
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
