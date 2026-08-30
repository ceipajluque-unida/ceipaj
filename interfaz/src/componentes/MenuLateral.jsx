import { NavLink } from 'react-router-dom';
import Icono from './iconos.jsx';

export const GRUPOS = [
  { titulo: null, items: [{ clave: 'inicio', ruta: '/panel', texto: 'Inicio' }] },
  { titulo: 'Captación', items: [
    { clave: 'leads', ruta: '/leads', texto: 'Interesados' },
    { clave: 'seguimiento', ruta: '/seguimiento', texto: 'Seguimiento' },
    { clave: 'conversion', ruta: '/conversion', texto: 'Conversión' },
  ] },
  { titulo: 'Aliados', items: [
    { clave: 'aliados', ruta: '/aliados', texto: 'Aliados' },
    { clave: 'comisiones', ruta: '/comisiones', texto: 'Comisiones' },
    { clave: 'portal', ruta: '/portal', texto: 'Mi portal', fin: true },
    { clave: 'portal-interesados', modulo: 'portal', icono: 'leads', ruta: '/portal/interesados', texto: 'Mis interesados' },
    { clave: 'portal-comisiones', modulo: 'portal', icono: 'comisiones', insignia: 'portal', ruta: '/portal/comisiones', texto: 'Mis comisiones' },
  ] },

  { titulo: 'Plataforma', items: [
    { clave: 'plataforma', ruta: '/estadisticas', texto: 'Estadísticas' },
    { clave: 'instituciones', ruta: '/instituciones', texto: 'Instituciones' },
    { clave: 'planes', ruta: '/planes', texto: 'Planes' },
    { clave: 'roles', ruta: '/roles', texto: 'Roles' },
    { clave: 'solicitudes', ruta: '/solicitudes', texto: 'Solicitudes' },
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

export const NOMBRE_MODULO = Object.fromEntries(
  GRUPOS.flatMap((grupo) => grupo.items).map((item) => [item.clave, item.texto])
);

export const MODULO_POR_RUTA = Object.fromEntries(
  GRUPOS.flatMap((grupo) => grupo.items).map((item) => [item.ruta, item.modulo ?? item.clave])
);

export default function MenuLateral({ puedeVer, bloqueados = [], plan, badges }) {
  return (
    <nav aria-label="Menú principal">
      {GRUPOS.map((grupo, indice) => {
        const items = grupo.items.filter((item) => puedeVer(item.modulo ?? item.clave));
        if (items.length === 0) return null;
        return (
          <div className="grupo-nav" key={grupo.titulo ?? indice}>
            {grupo.titulo && <span className="grupo-titulo">{grupo.titulo}</span>}
            <ul className="lista-nav">
              {items.map((item) => {
                const trabado = bloqueados.includes(item.modulo ?? item.clave);
                return (
                  <li key={item.clave}>
                    <NavLink to={trabado ? '/suscripcion' : item.ruta} end={Boolean(item.fin)}
                      className={({ isActive }) => `${isActive && !trabado ? 'activo' : ''} ${trabado ? 'trabado' : ''}`}
                      title={trabado ? `El plan ${plan?.texto ?? ''} no incluye esta sección` : undefined}
                    >
                      <span className="icono"><Icono nombre={item.icono ?? item.clave} /></span>{item.texto}
                      {trabado && <span className="candado" aria-hidden="true"><Icono nombre="candado" tam={14} /></span>}
                      {trabado && <span className="oculto-visual"> no incluido en tu plan</span>}
                      {!trabado && badges[item.insignia ?? item.clave] > 0 && (
                        <span className="badge">{badges[item.insignia ?? item.clave]}<span className="oculto-visual"> pendientes</span></span>
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
  );
}
