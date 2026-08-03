// los nombres salen de configuración, no van escritos en las pantallas. son dos y no uno:
// el del sistema (el producto, lo que se ve en el ingreso) y el del colegio que contrató,
// que recién se sabe cuando hay sesión.
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
    // al guardar configuración se avisa por acá, para no tener que recargar la página
    window.addEventListener('institucion', traer);
    return () => window.removeEventListener('institucion', traer);
  }, []);

  return <Contexto.Provider value={datos}>{children}</Contexto.Provider>;
}

export function useInstitucion() {
  return useContext(Contexto);
}
