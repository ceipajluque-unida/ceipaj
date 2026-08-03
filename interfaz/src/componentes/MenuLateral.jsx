// menú agrupado por temas; cada ítem se ve solo si el rol tiene ese módulo
import { NavLink } from 'react-router-dom';
import Icono from './iconos.jsx';

export const GRUPOS = [
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

// cómo se llama cada módulo en el menú, para poder nombrarlo en los avisos
export const NOMBRE_MODULO = Object.fromEntries(
  GRUPOS.flatMap((grupo) => grupo.items).map((item) => [item.clave, item.texto])
);

// con qué módulo se corresponde cada dirección, para saber quién puede abrirla
export const MODULO_POR_RUTA = Object.fromEntries(
  GRUPOS.flatMap((grupo) => grupo.items).map((item) => [item.ruta, item.clave])
);

export default function MenuLateral({ puedeVer, bloqueados, plan, badges }) {
  return (
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
  );
}
