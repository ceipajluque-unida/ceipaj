import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { haySesion, llamarApi } from './servicios/api.js';
import Diseno from './componentes/Diseno.jsx';
import ConfiguracionInicial from './paginas/ConfiguracionInicial.jsx';
import Ingreso from './paginas/Ingreso.jsx';
import RecuperarClave from './paginas/RecuperarClave.jsx';
import RestablecerClave from './paginas/RestablecerClave.jsx';
import Privacidad from './paginas/Privacidad.jsx';
// la pagina publica no la ve ningun usuario interno: se carga solo si se entra
const Landing = lazy(() => import('./paginas/Landing.jsx'));
import PagoFinalizado from './paginas/PagoFinalizado.jsx';
import CambioClave from './paginas/CambioClave.jsx';
import PantallaPrincipal from './paginas/PantallaPrincipal.jsx';
import Leads from './paginas/Leads.jsx';
import LeadDetalle from './paginas/LeadDetalle.jsx';
import Seguimiento from './paginas/Seguimiento.jsx';
import Conversion from './paginas/Conversion.jsx';
import Aliados from './paginas/Aliados.jsx';
import PortalAliado from './paginas/PortalAliado.jsx';
import PortalInteresados from './paginas/PortalInteresados.jsx';
import PortalComisiones from './paginas/PortalComisiones.jsx';
import Comisiones from './paginas/Comisiones.jsx';
import Reportes from './paginas/Reportes.jsx';
import Pagos from './paginas/Pagos.jsx';
import Checkout from './paginas/Checkout.jsx';
import Suscripciones from './paginas/Suscripciones.jsx';
import Planes from './paginas/Planes.jsx';
import Instituciones from './paginas/Instituciones.jsx';
import Solicitudes from './paginas/Solicitudes.jsx';
import Plataforma from './paginas/Plataforma.jsx';
import Roles from './paginas/Roles.jsx';
import Usuarios from './paginas/Usuarios.jsx';
import Configuracion from './paginas/Configuracion.jsx';
import Auditoria from './paginas/Auditoria.jsx';
import Perfil from './paginas/Perfil.jsx';

function RutaProtegida({ children }) {
  return haySesion() ? children : <Navigate to="/ingreso" replace />;
}

function RutaDeAcceso({ children }) {
  return haySesion() ? <Navigate to="/panel" replace /> : children;
}

export default function Aplicacion() {
  const [estado, setEstado] = useState(null);

  useEffect(() => {
    llamarApi('/api/autenticacion/estado')
      .then(setEstado)
      .catch(() => setEstado({ requiereConfiguracionInicial: false, sinConexion: true }));
  }, []);

  if (!estado) return <p className="mensaje-centrado">Cargando…</p>;
  if (estado.sinConexion) {
    return <p className="mensaje-centrado">No hay conexión con el servidor.</p>;
  }

  return (
    <Routes>

      <Route
        path="/configuracion-inicial"
        element={
          <RutaDeAcceso>
            {estado.requiereConfiguracionInicial ? <ConfiguracionInicial /> : <Navigate to="/ingreso" replace />}
          </RutaDeAcceso>
        }
      />
      <Route
        path="/ingreso"
        element={
          <RutaDeAcceso>
            {estado.requiereConfiguracionInicial ? <Navigate to="/configuracion-inicial" replace /> : <Ingreso />}
          </RutaDeAcceso>
        }
      />
      <Route path="/recuperar" element={<RutaDeAcceso><RecuperarClave /></RutaDeAcceso>} />
      <Route path="/restablecer" element={<RutaDeAcceso><RestablecerClave /></RutaDeAcceso>} />
      <Route path="/" element={<Suspense fallback={<p className="mensaje-centrado">Cargando…</p>}><Landing /></Suspense>} />
      <Route path="/privacidad" element={<Privacidad />} />
      <Route path="/pago-finalizado" element={<PagoFinalizado />} />
      <Route element={<RutaProtegida><Diseno /></RutaProtegida>}>
        <Route path="/panel" element={<PantallaPrincipal />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/leads/:id" element={<LeadDetalle />} />
        <Route path="/seguimiento" element={<Seguimiento />} />
        <Route path="/conversion" element={<Conversion />} />
        <Route path="/aliados" element={<Aliados />} />
        <Route path="/portal" element={<PortalAliado />} />
        <Route path="/portal/interesados" element={<PortalInteresados />} />
        <Route path="/portal/comisiones" element={<PortalComisiones />} />
        <Route path="/comisiones" element={<Comisiones />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/pagos" element={<Pagos />} />
        <Route path="/checkout/:hash" element={<Checkout />} />
        <Route path="/suscripcion" element={<Suscripciones />} />
        <Route path="/planes" element={<Planes />} />
        <Route path="/instituciones" element={<Instituciones />} />
        <Route path="/solicitudes" element={<Solicitudes />} />
        <Route path="/estadisticas" element={<Plataforma />} />
        <Route path="/roles" element={<Roles />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/configuracion" element={<Configuracion />} />
        <Route path="/auditoria" element={<Auditoria />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/cambiar-clave" element={<CambioClave />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
