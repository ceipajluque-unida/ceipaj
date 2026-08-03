import { createContext, useContext, useEffect, useState } from 'react';
import { ConfigProvider, theme } from 'antd';
import esES from 'antd/locale/es_ES';
import { llamarApi } from '../servicios/api.js';

// el color lo fija el proveedor del servicio desde Configuración y vale para todas las
// instituciones. antes lo elegía cada usuario y se guardaba en su navegador, así que dos
// personas del mismo colegio veían el sistema de colores distintos.
const COLOR_POR_DEFECTO = '#35597e';
const CONTRASTE_ALTO = '#0a3157';

const Contexto = createContext(null);

// los mismos valores que usa el css propio, para que antd no desentone
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
  // el alto contraste cambia la paleta, y antd necesita el valor, no la variable css
  const [contraste, setContraste] = useState(() => document.documentElement.dataset.contraste === 'alto');

  // se pide sin sesión a propósito: el ingreso también tiene que salir con el color.
  // se vuelve a pedir cuando configuración avisa que guardó, si no había que recargar
  // la página a mano para ver el cambio.
  useEffect(() => {
    const traer = () => llamarApi('/api/configuracion/legales')
      .then((t) => t.color && setAcento(t.color))
      .catch(() => {});
    traer();
    window.addEventListener('institucion', traer);
    return () => window.removeEventListener('institucion', traer);
  }, []);

  // el panel de accesibilidad toca el atributo del html; antd se entera por acá
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

  // la pantalla de configuración la usa para mostrar el color elegido en el momento, sin
  // esperar a guardar: elegir a ciegas y recién ver el resultado después no sirve
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
