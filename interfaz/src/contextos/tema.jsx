import { createContext, useContext, useEffect, useState } from 'react';
import { ConfigProvider, theme } from 'antd';
import esES from 'antd/locale/es_ES';
import { llamarApi } from '../servicios/api.js';

const COLOR_POR_DEFECTO = '#35597e';
const CONTRASTE_ALTO = '#0a3157';

const Contexto = createContext(null);

function fichas(color) {
  return {
    colorPrimary: color,
    colorLink: color,
    colorBorder: '#e4e7f0',
    colorText: '#232733',
    colorTextSecondary: '#6b7085',
    colorBgLayout: '#f3f5fa',
    borderRadius: 9,
    fontFamily: '"Segoe UI", system-ui, -apple-system, Roboto, sans-serif',
    fontSize: 14,
  };
}

export function ProveedorTema({ children }) {
  const [acento, setAcento] = useState(COLOR_POR_DEFECTO);

  const [contraste, setContraste] = useState(() => document.documentElement.dataset.contraste === 'alto');

  useEffect(() => {
    const traer = () => llamarApi('/api/configuracion/legales')
      .then((t) => t.color && setAcento(t.color))
      .catch(() => {});
    traer();
    window.addEventListener('institucion', traer);
    return () => window.removeEventListener('institucion', traer);
  }, []);

  useEffect(() => {
    const observador = new MutationObserver(() => {
      setContraste(document.documentElement.dataset.contraste === 'alto');
    });
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-contraste'] });
    return () => observador.disconnect();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--acento', acento);
  }, [acento]);

  const color = contraste ? CONTRASTE_ALTO : acento;

  return (
    <Contexto.Provider value={{ acento, previsualizar: setAcento }}>
      <ConfigProvider
        locale={esES}
        theme={{ algorithm: theme.defaultAlgorithm, token: fichas(color) }}
      >
        {children}
      </ConfigProvider>
    </Contexto.Provider>
  );
}

export function useTema() {
  return useContext(Contexto);
}
