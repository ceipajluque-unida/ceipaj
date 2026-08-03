// estructura de las pantallas internas
import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Button } from 'antd';
import { cerrarSesion, llamarApi, usuarioActual } from '../servicios/api.js';
import MenuUsuario from './MenuUsuario.jsx';
import Icono from './iconos.jsx';
import { useInstitucion } from '../contextos/institucion.jsx';

// menú agrupado por temas...cada ítem se ve solo si el rol tiene ese módulo
const GRUPOS = [
  { titulo: null, items: [{ clave: 'inicio', ruta: '/', texto: 'Inicio' }] },
  { titulo: 'Captación', items: [
    { clave: 'leads', ruta: '/leads', texto: 'Interesados' },
    { clave: 'seguimiento', ruta: '/seguimiento', texto: 'Seguimiento' },
    { clave: 'conversion', ruta: '/conversion', texto: 'Conversión' },
  ] },
  { titulo: 'Aliados', items: [
    { clave: 'aliados', ruta: '/aliados', texto: 'Aliados' },
    { clave: 'comisiones', ruta: '/comisiones', texto: 'Comisiones' },
    { clave: 'portal', ruta: '/portal', texto: 'Mi portal' },
  ] },
  // solo lo ve el proveedor del servicio: el menú se arma con los módulos del rol
  { titulo: 'Plataforma', items: [
    { clave: 'instituciones', ruta: '/instituciones', texto: 'Instituciones' },
    { clave: 'planes', ruta: '/planes', texto: 'Planes' },
  ] },
  { titulo: 'Gestión', items: [
    { clave: 'reportes', ruta: '/reportes', texto: 'Reportes' },
    { clave: 'pagos', ruta: '/pagos', texto: 'Pagos' },
    { clave: 'suscripcion', ruta: '/suscripcion', texto: 'Suscripción' },
    { clave: 'usuarios', ruta: '/usuarios', texto: 'Usuarios' },
    { clave: 'auditoria', ruta: '/auditoria', texto: 'Auditoría' },
    { clave: 'configuracion', ruta: '/configuracion', texto: 'Configuración' },
  ] },
];

const CLAVE_MENU = 'ceipaj_menu_oculto';

// avisa al backend para que invalide el token y recién ahí limpia y sale
export async function salir() {
  try { await llamarApi('/api/autenticacion/salir', { metodo: 'POST' }); } catch { }
  cerrarSesion();
  window.location.assign('/ingreso');
}

export default function Diseno() {
  const institucion = useInstitucion();
  const usuario = usuarioActual();
  const [modulos, setModulos] = useState(null);
  const [bloqueados, setBloqueados] = useState([]);
  const [plan, setPlan] = useState(null);
  const [badges, setBadges] = useState({});
  const [error, setError] = useState(null);
  // en pantallas chicas el menú arranca oculto
  const [oculto, setOculto] = useState(() =>
    window.innerWidth <= 860 ? true : localStorage.getItem(CLAVE_MENU) === '1'
  );

  useEffect(() => {
    // si la sesión venció, llamarApi ya redirige al ingreso
    llamarApi('/api/autenticacion/perfil')
      .then((respuesta) => {
        setModulos(respuesta.modulos);
        setBloqueados(respuesta.modulosBloqueados ?? []);
        setPlan(respuesta.plan ?? null);
      })
      .catch((excepcion) => setError(excepcion.message));
    // pendientes por módulo; si falla, el menú va sin badges
    llamarApi('/api/resumen/badges').then(setBadges).catch(() => setBadges({}));
  }, []);

  function alternarMenu() {
    setOculto((estaba) => {
      const nuevo = !estaba;
      localStorage.setItem(CLAVE_MENU, nuevo ? '1' : '0');
      return nuevo;
    });
  }

  // el aliado ve su portal, no el inicio gerencial
  const puedeVer = (clave) => clave === 'inicio' ? usuario?.rol !== 'aliado' : modulos?.includes(clave);

  if (error) {
    return (
      <p className="mensaje-centrado">
        {error}<br />
        <Button onClick={() => window.location.reload()}>Reintentar</Button>
      </p>
    );
  }
  if (!modulos) return <p className="mensaje-centrado">Cargando…</p>;

  return (
    <div className={`app ${oculto ? 'oculto' : ''}`}>
      {/* el fondo oscuro cierra el menú al tocarlo; sigue nativo porque antd le impone alto propio y dejaría de tapar la pantalla */}
      <button className="fondo-lateral" type="button" onClick={alternarMenu} aria-label="Cerrar menú" />

      <aside className="lateral">
        <div className="marca">
          <span className="marca-logo"><Icono nombre="marca" tam={24} /></span>
          <span>{institucion.nombre}</span>
        </div>
        <nav aria-label="Menú principal">
          {GRUPOS.map((grupo, indice) => {
            const items = grupo.items.filter((item) => puedeVer(item.clave));
            if (items.length === 0) return null;
            return (
              <div className="grupo-nav" key={grupo.titulo ?? indice}>
                {grupo.titulo && <span className="grupo-titulo">{grupo.titulo}</span>}
                <ul className="lista-nav">
                  {items.map((item) => {
                    // el módulo que el rol tiene pero el plan no incluye se muestra con
                    // candado en vez de esconderse: así se ve qué habilita cambiar de plan
                    const trabado = bloqueados.includes(item.clave);
                    return (
                      <li key={item.clave}>
                        <NavLink to={trabado ? '/suscripcion' : item.ruta} end={item.ruta === '/'}
                          className={({ isActive }) => `${isActive && !trabado ? 'activo' : ''} ${trabado ? 'trabado' : ''}`}
                          title={trabado ? `El plan ${plan?.texto ?? ''} no incluye este módulo` : undefined}>
                          <span className="icono"><Icono nombre={item.clave} /></span>{item.texto}
                          {trabado && (
                            <span className="candado" aria-hidden="true"><Icono nombre="candado" tam={14} /></span>
                          )}
                          {trabado && <span className="oculto-visual"> no incluido en tu plan</span>}
                          {!trabado && badges[item.clave] > 0 && (
                            <span className="badge">{badges[item.clave]}<span className="oculto-visual"> pendientes</span></span>
                          )}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
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
          <span className="titulo-app">{institucion.nombre}</span>
          <div className="barra-derecha">
            {plan && usuario?.rol !== 'aliado' && (
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
          <Outlet context={{ usuario, modulos }} />
        </main>
      </div>
    </div>
  );
}
