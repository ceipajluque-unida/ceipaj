import { useEffect, useState } from 'react';
import { llamarApi } from '../servicios/api.js';

let pendiente = null;

export default function AvisoPrivacidad() {
  const [texto, setTexto] = useState('');

  useEffect(() => {
    pendiente = pendiente ?? llamarApi('/api/configuracion/legales');
    let vigente = true;
    pendiente.then((t) => vigente && setTexto(t.aviso ?? '')).catch(() => {});
    return () => { vigente = false; };
  }, []);

  if (!texto) return null;
  return (
    <p className="aviso-privacidad">
      <strong>Aviso de privacidad:</strong> {texto}
    </p>
  );
}
