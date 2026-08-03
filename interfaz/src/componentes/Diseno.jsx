// estructura de las pantallas internas
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Button } from 'antd';
import { cerrarSesion, llamarApi, usuarioActual } from '../servicios/api.js';
import MenuUsuario from './MenuUsuario.jsx';
import MenuLateral, { MODULO_POR_RUTA } from './MenuLateral.jsx';
import SinAcceso from './SinAcceso.jsx';
import Icono from './iconos.jsx';
import { useInstitucion } from '../contextos/institucion.jsx';

const CLAVE_MENU = 'ceipaj_menu_oculto';

// el proveedor no pertenece a ninguna institución: su casa es la lista de instituciones
const INICIO_POR_ROL = { superadministrador: '/instituciones', aliado: '/portal' };

// avisa al backend para que invalide el token y recién ahí limpia y sale
export async function salir() {
  try { await llamarApi('/api/autenticacion/salir', { metodo: 'POST' }); } catch { }
  cerrarSesion();
  window.location.assign('/ingreso');
}

export default function Diseno() {
  const institucion = useInstitucion();
  const usuario = usuarioActual();
  const ubicacion = useLocation();
  const [modulos, setModulos] = useState(null);
  const [bloqueados, setBloqueados] = useState([]);
  const [plan, setPlan] = useState(null);
  const [badges, setBadges] = useState({});
  const [error, setError] = useState(null);
  // en pantallas chicas el menú arranca oculto
  const [oculto, setOculto] = useState(() =>
    window.innerWidth <= 860 ? true : localStorage.getItem(CLAVE_MENU) === '1'
  );

  const esProveedor = usuario?.rol === 'superadministrador';
  const inicio = INICIO_POR_ROL[usuario?.rol] ?? '/';

  useEffect(() => {
    // si la sesión venció, llamarApi ya redirige al ingreso
    llamarApi('/api/autenticacion/perfil')
      .then((respuesta) => {
        setModulos(respuesta.modulos);
        setBloqueados(respuesta.modulosBloqueados ?? []);
        setPlan(respuesta.plan ?? null);
      })
      .catch((excepcion) => setError(excepcion.message));
    // el proveedor no tiene pendientes de captación: los badges son de la institución
    if (!esProveedor) llamarApi('/api/resumen/badges').then(setBadges).catch(() => setBadges({}));
  }, []);

  function alternarMenu() {
    setOculto((estaba) => {
      const nuevo = !estaba;
      localStorage.setItem(CLAVE_MENU, nuevo ? '1' : '0');
      return nuevo;
    });
  }

  // el aliado ve su portal y el proveedor sus instituciones, no el inicio gerencial
  const puedeVer = (clave) => clave === 'inicio'
    ? !INICIO_POR_ROL[usuario?.rol]
    : modulos?.includes(clave);

  if (error) {
    return (
      <p className="mensaje-centrado">
        {error}<br />
        <Button onClick={() => window.location.reload()}>Reintentar</Button>
      </p>
    );
  }
  if (!modulos) return <p className="mensaje-centrado">Cargando…</p>;

  // se corta acá y no en cada pantalla: escribir la dirección a mano de un módulo ajeno
  // dibujaba la pantalla igual y encima el error del backend
  const raiz = `/${ubicacion.pathname.split('/')[1] ?? ''}`;
  const moduloPedido = MODULO_POR_RUTA[raiz];
  const motivo = !moduloPedido ? null
    : !puedeVer(moduloPedido) ? 'rol'
    : bloqueados.includes(moduloPedido) ? 'plan'
    : null;

  return (
    <div className={`app ${oculto ? 'oculto' : ''}`}>
      {/* el fondo oscuro cierra el menú al tocarlo; sigue nativo porque antd le impone alto propio y dejaría de tapar la pantalla */}
      <button className="fondo-lateral" type="button" onClick={alternarMenu} aria-label="Cerrar menú" />

      <aside className="lateral">
        <div className="marca">
          <span className="marca-logo"><Icono nombre="marca" tam={24} /></span>
          <span>{esProveedor ? 'Panel del proveedor' : institucion.nombre}</span>
        </div>
        <MenuLateral puedeVer={puedeVer} bloqueados={bloqueados} plan={plan} badges={badges} />
      </aside>

      <div className="principal">
        <header className="barra-superior">
          <Button
            type="text"
            className="boton-menu"
            icon={<Icono nombre="menu" tam={22} />}
            onClick={alternarMenu}
            aria-label="Abrir u ocultar menú"
          />
          <span className="titulo-app">{esProveedor ? 'Panel del proveedor' : institucion.nombre}</span>
          <div className="barra-derecha">
            {/* el proveedor no contrata la plataforma, así que no le corresponde ningún plan */}
            {plan && !esProveedor && usuario?.rol !== 'aliado' && (
              <NavLink to="/suscripcion" className={`chip-plan ${plan.vigente ? '' : 'sin-plan'}`}
                title={plan.vigente ? 'Plan contratado' : 'Sin suscripción vigente: el sistema funciona con el plan mínimo'}>
                Plan {plan.texto}
                {plan.vigente
                  ? plan.diasRestantes !== null && <span className="chip-detalle"> · {plan.diasRestantes} d</span>
                  : <span className="chip-detalle"> · sin contratar</span>}
              </NavLink>
            )}
            <MenuUsuario usuario={usuario} />
          </div>
        </header>
        <main className="contenido">
          {motivo
            ? <SinAcceso inicio={inicio} motivo={motivo} plan={plan?.texto} />
            : <Outlet context={{ usuario, modulos, bloqueados, inicio }} />}
        </main>
      </div>
    </div>
  );
}
