// punto de entrada que monta la aplicación react
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ProveedorTema } from './contextos/tema.jsx';
import Aplicacion from './Aplicacion.jsx';
import Accesibilidad from './componentes/Accesibilidad.jsx';
import { ProveedorInstitucion } from './contextos/institucion.jsx';
// antd trae sus estilos en el propio js; acá solo va lo del sistema
import './estilos.css';
import './estilos/accesibilidad.css';

createRoot(document.getElementById('raiz')).render(
  <React.StrictMode>
    <ProveedorTema>
      <ProveedorInstitucion>
      {/* los flags apagan los avisos de la v7 que todavía no aplica */}
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Aplicacion />
        <Accesibilidad />
      </BrowserRouter>
      </ProveedorInstitucion>
    </ProveedorTema>
  </React.StrictMode>
);
