import { createContext, useContext, useEffect, useState } from 'react';
import { llamarApi } from '../servicios/api.js';

const VACIO = { nombre: '', ciudad: '', plataforma: '' };
const Contexto = createContext(VACIO);

export function ProveedorInstitucion({ children }) {
  const [datos, setDatos] = useState(VACIO);

  useEffect(() => {
    const traer = () => llamarApi('/api/autenticacion/estado')
      .then((estado) => setDatos({
        nombre: estado.institucion?.nombre ?? '',
        ciudad: estado.institucion?.ciudad ?? '',
        plataforma: estado.plataforma?.nombre ?? '',
      }))
      .catch(() => {});
    traer();

    window.addEventListener('institucion', traer);
    return () => window.removeEventListener('institucion', traer);
  }, []);

  return <Contexto.Provider value={datos}>{children}</Contexto.Provider>;
}

export function useInstitucion() {
  return useContext(Contexto);
}
