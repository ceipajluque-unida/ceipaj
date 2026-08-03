import { useEffect, useRef } from 'react';

const FUENTE = 'https://www.google.com/recaptcha/api.js?render=explicit';
let cargando = null;

function cargarScript() {
  if (window.grecaptcha?.render) return Promise.resolve();
  if (cargando) return cargando;
  cargando = new Promise((listo, falla) => {
    const etiqueta = document.createElement('script');
    etiqueta.src = FUENTE;
    etiqueta.async = true;
    etiqueta.defer = true;
    etiqueta.onload = () => window.grecaptcha.ready(listo);
    etiqueta.onerror = () => falla(new Error('no se pudo cargar el captcha'));
    document.head.appendChild(etiqueta);
  });
  return cargando;
}

export default function Captcha({ claveSitio, alResolver }) {
  const caja = useRef(null);
  const dibujado = useRef(false);

  useEffect(() => {
    if (!claveSitio || dibujado.current) return;
    let vivo = true;
    cargarScript()
      .then(() => {
        if (!vivo || dibujado.current || !caja.current) return;
        dibujado.current = true;
        window.grecaptcha.render(caja.current, {
          sitekey: claveSitio,
          callback: alResolver,
          'expired-callback': () => alResolver(''),
          'error-callback': () => alResolver(''),
        });
      })
      .catch(() => { });
    return () => { vivo = false; };
  }, [claveSitio]);

  if (!claveSitio) return null;
  return <div className="captcha" ref={caja} />;
}
