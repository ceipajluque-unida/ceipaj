import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ProveedorTema } from './contextos/tema.jsx';
import Aplicacion from './Aplicacion.jsx';
import Accesibilidad from './componentes/Accesibilidad.jsx';
import { ProveedorInstitucion } from './contextos/institucion.jsx';

import './estilos.css';
import './estilos/accesibilidad.css';

createRoot(document.getElementById('raiz')).render(
  <React.StrictMode>
    <ProveedorTema>
      <ProveedorInstitucion>

      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Aplicacion />
        <Accesibilidad />
      </BrowserRouter>
      </ProveedorInstitucion>
    </ProveedorTema>
  </React.StrictMode>
);
