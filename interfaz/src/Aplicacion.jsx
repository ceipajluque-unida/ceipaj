// rutas de la app; las pantallas internas van protegidas
import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { haySesion, llamarApi } from './servicios/api.js';
import Diseno from './componentes/Diseno.jsx';
import ConfiguracionInicial from './paginas/ConfiguracionInicial.jsx';
import Ingreso from './paginas/Ingreso.jsx';
import RecuperarClave from './paginas/RecuperarClave.jsx';
import RestablecerClave from './paginas/RestablecerClave.jsx';
import Privacidad from './paginas/Privacidad.jsx';
import CambioClave from './paginas/CambioClave.jsx';
import PantallaPrincipal from './paginas/PantallaPrincipal.jsx';
import Leads from './paginas/Leads.jsx';
import LeadDetalle from './paginas/LeadDetalle.jsx';
import Seguimiento from './paginas/Seguimiento.jsx';
import Conversion from './paginas/Conversion.jsx';
import Aliados from './paginas/Aliados.jsx';
import PortalAliado from './paginas/PortalAliado.jsx';
import Comisiones from './paginas/Comisiones.jsx';
import Reportes from './paginas/Reportes.jsx';
import Pagos from './paginas/Pagos.jsx';
import Suscripciones from './paginas/Suscripciones.jsx';
import Planes from './paginas/Planes.jsx';
import Instituciones from './paginas/Instituciones.jsx';
import Usuarios from './paginas/Usuarios.jsx';
import Configuracion from './paginas/Configuracion.jsx';
import Auditoria from './paginas/Auditoria.jsx';
import Perfil from './paginas/Perfil.jsx';

// solo deja pasar con sesión iniciada; si no, manda al ingreso
function RutaProtegida({ children }) {
  return haySesion() ? children : <Navigate to="/ingreso" replace />;
}

export default function Aplicacion() {
  // al abrir se consulta si el sistema está recién instalado (sin usuarios)
  const [estado, setEstado] = useState(null);

  useEffect(() => {
    llamarApi('/api/autenticacion/estado')
      .then(setEstado)
      .catch(() => setEstado({ requiereConfiguracionInicial: false, sinConexion: true }));
  }, []);

  if (!estado) return <p className="mensaje-centrado">Cargando…</p>;
  if (estado.sinConexion) {
    return <p className="mensaje-centrado">No hay conexión con el servidor. Iniciar el backend con «npm run servidor» y recargar.</p>;
  }

  return (
    <Routes>
      <Route path="/configuracion-inicial" element={<ConfiguracionInicial />} />
      <Route
        path="/ingreso"
        element={estado.requiereConfiguracionInicial ? <Navigate to="/configuracion-inicial" replace /> : <Ingreso />}
      />
      <Route path="/recuperar" element={<RecuperarClave />} />
      <Route path="/restablecer" element={<RestablecerClave />} />
      <Route path="/privacidad" element={<Privacidad />} />
      <Route element={<RutaProtegida><Diseno /></RutaProtegida>}>
        <Route path="/" element={<PantallaPrincipal />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/leads/:id" element={<LeadDetalle />} />
        <Route path="/seguimiento" element={<Seguimiento />} />
        <Route path="/conversion" element={<Conversion />} />
        <Route path="/aliados" element={<Aliados />} />
        <Route path="/portal" element={<PortalAliado />} />
        <Route path="/comisiones" element={<Comisiones />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/pagos" element={<Pagos />} />
        <Route path="/suscripcion" element={<Suscripciones />} />
        <Route path="/planes" element={<Planes />} />
        <Route path="/instituciones" element={<Instituciones />} />
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
