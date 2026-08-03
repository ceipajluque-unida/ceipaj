// aviso previo que va debajo de los formularios donde se cargan datos de personas.
// el texto se edita desde Configuración, así que se pide a la api en vez de quemarlo.
import { useEffect, useState } from 'react';
import { llamarApi } from '../servicios/api.js';

// un solo pedido compartido por todos los formularios de la pantalla
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
