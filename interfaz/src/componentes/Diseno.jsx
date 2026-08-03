import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Button } from 'antd';
import { cerrarSesion, llamarApi, usuarioActual } from '../servicios/api.js';
import MenuUsuario from './MenuUsuario.jsx';
import MenuLateral, { MODULO_POR_RUTA, NOMBRE_MODULO } from './MenuLateral.jsx';
import AvisoSinAcceso from './AvisoSinAcceso.jsx';
import SinSalida from './SinSalida.jsx';
import Icono from './iconos.jsx';
import { useInstitucion } from '../contextos/institucion.jsx';

const CLAVE_MENU = 'ceipaj_menu_oculto';

const INICIO_POR_ROL = { superadministrador: '/instituciones', aliado: '/portal' };

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

  const [oculto, setOculto] = useState(() =>
    window.innerWidth <= 860 ? true : localStorage.getItem(CLAVE_MENU) === '1'
  );

  const esProveedor = usuario?.rol === 'superadministrador';
  const inicio = INICIO_POR_ROL[usuario?.rol] ?? '/';

  useEffect(() => {
    const traer = () => {
      llamarApi('/api/autenticacion/perfil')
        .then((respuesta) => {
          setModulos(respuesta.modulos);
          setBloqueados(respuesta.modulosBloqueados ?? []);
          setPlan(respuesta.plan ?? null);
        })
        .catch((excepcion) => setError(excepcion.message));
      if (!esProveedor) llamarApi('/api/resumen/badges').then(setBadges).catch(() => setBadges({}));
    };
    traer();
    window.addEventListener('plan', traer);
    return () => window.removeEventListener('plan', traer);
  }, []);

  function alternarMenu() {
    setOculto((estaba) => {
      const nuevo = !estaba;
      localStorage.setItem(CLAVE_MENU, nuevo ? '1' : '0');
      return nuevo;
    });
  }

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

  const raiz = `/${ubicacion.pathname.split('/')[1] ?? ''}`;
  const moduloPedido = MODULO_POR_RUTA[raiz];

  if (raiz === '/' && inicio !== '/') return <Navigate to={inicio} replace />;

  const motivo = !moduloPedido ? null
    : !puedeVer(moduloPedido) ? 'rol'
    : bloqueados.includes(moduloPedido) ? 'plan'
    : null;

  if (motivo) {
    const destino = motivo === 'plan' && modulos.includes('suscripcion') ? '/suscripcion' : inicio;
    const seRepite = destino === ubicacion.pathname || destino === raiz;
    if (!seRepite) {
      return <Navigate to={destino} replace state={{ sinAcceso: { motivo, plan: plan?.texto, modulo: NOMBRE_MODULO[moduloPedido] } }} />;
    }

    return (
      <SinSalida
        motivo={motivo}
        plan={plan?.texto}
        modulo={NOMBRE_MODULO[moduloPedido]}
        institucion={esProveedor ? 'Panel del proveedor' : institucion.nombre}
      />
    );
  }

  return (
    <div className={`app ${oculto ? 'oculto' : ''}`}>

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

            {plan && !esProveedor && usuario?.rol !== 'aliado' && (
              <NavLink to="/suscripcion" className={`chip-plan ${plan.vigente ? '' : 'sin-plan'}`}
                title={plan.vigente ? 'Plan contratado' : 'Sin suscripción vigente: el sistema funciona con el plan mínimo'}>
                Plan {plan.texto}
                {plan.vigente
                  ? plan.diasRestantes !== null && <span className="chip-detalle"> — {plan.diasRestantes} d</span>
                  : <span className="chip-detalle"> — sin contratar</span>}
              </NavLink>
            )}
            <MenuUsuario usuario={usuario} />
          </div>
        </header>
        <main className="contenido">
          <AvisoSinAcceso />
          <Outlet context={{ usuario, modulos, bloqueados, inicio }} />
        </main>
      </div>
    </div>
  );
}
