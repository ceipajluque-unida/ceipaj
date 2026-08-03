// el nombre de la institución sale de configuración, no va escrito en las pantallas
import { createContext, useContext, useEffect, useState } from 'react';
import { llamarApi } from '../servicios/api.js';

const Contexto = createContext({ nombre: '', ciudad: '' });

export function ProveedorInstitucion({ children }) {
  const [datos, setDatos] = useState({ nombre: '', ciudad: '' });

  useEffect(() => {
    const traer = () => llamarApi('/api/autenticacion/estado')
      .then((estado) => estado.institucion && setDatos(estado.institucion))
      .catch(() => {});
    traer();
    // al guardar configuración se avisa por acá, para no tener que recargar la página
    window.addEventListener('institucion', traer);
    return () => window.removeEventListener('institucion', traer);
  }, []);

  return <Contexto.Provider value={datos}>{children}</Contexto.Provider>;
}

export function useInstitucion() {
  return useContext(Contexto);
}
