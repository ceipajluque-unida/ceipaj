import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useOutletContext } from 'react-router-dom';
import { Button } from 'antd';
import { haySesion, llamarApi, usuarioActual } from '../servicios/api.js';
import { contar, legible } from '../servicios/formato.js';

function fechaDeHoy() {
  const texto = new Date().toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function PantallaPrincipal() {
  const usuario = usuarioActual();
  const navegar = useNavigate();
  const { modulos, bloqueados = [] } = useOutletContext() ?? {};
  const esAliado = usuario?.rol === 'aliado';

  const esProveedor = usuario?.rol === 'superadministrador';
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (esAliado || esProveedor) return;

    llamarApi('/api/resumen/indicadores')
      .then(setDatos)
      .catch((excepcion) => {
        if (!haySesion()) return window.location.assign('/ingreso');
        setError(excepcion.message);
      });
  }, []);

  if (esAliado) return <Navigate to="/portal" replace />;
  if (esProveedor) return <Navigate to="/instituciones" replace />;
  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p className="mensaje-centrado">Cargando…</p>;

  const nombreCorto = (usuario?.nombre ?? '').trim().split(' ')[0];
  const sinContacto = datos.alertasSeguimiento;
  const enRiesgo = datos.estudiantesEnRiesgo;
  const hayPendientes = sinContacto > 0 || enRiesgo > 0;
  const maximoCanal = Math.max(...datos.leadsPorCanal.map((fila) => fila.total), 1);
  const maximoEstado = Math.max(...datos.leadsPorEstado.map((fila) => fila.total), 1);

  const disponible = (clave) => modulos?.includes(clave) && !bloqueados.includes(clave);
  const veLeads = disponible('leads');
  const veSeguimiento = disponible('seguimiento');
  const veReportes = disponible('reportes');

  return (
    <>
      <header className="encabezado-pagina">
        <div>
          <h2>Hola{nombreCorto ? `, ${nombreCorto}` : ''}</h2>
          <p className="nota">{fechaDeHoy()}</p>
        </div>
        <div className="acciones">
          {veLeads && <Button type="primary" onClick={() => navegar('/leads')}>Ver interesados</Button>}
          {veReportes && <Button onClick={() => navegar('/reportes')}>Reportes</Button>}
        </div>
      </header>

      <section className="panel">
        <h3>Para hoy</h3>
        {hayPendientes ? (
          <ul className="lista-alertas">
            {sinContacto > 0 && (
              <li>
                <span>{contar(sinContacto, 'interesado sigue', 'interesados siguen')} sin contacto.</span>
                {veLeads && <Link to="/leads">Ver quiénes son</Link>}
              </li>
            )}
            {enRiesgo > 0 && (
              <li>
                <span>{contar(enRiesgo, 'estudiante está', 'estudiantes están')} en riesgo por falta de acompañamiento.</span>
                {veSeguimiento && <Link to="/seguimiento">Ir a seguimiento</Link>}
              </li>
            )}
          </ul>
        ) : (
          <p className="nota">Nada urgente por ahora.</p>
        )}
      </section>

      <section className="cuadricula">
        <article className="indicador">
          <h3>Interesados</h3><p className="cifra">{datos.totalLeads}</p>
        </article>
        <article className="indicador">
          <h3>Matriculados</h3><p className="cifra">{datos.conversiones}</p>
        </article>
        <article className="indicador">
          <h3>Conversión</h3><p className="cifra">{datos.tasaConversion}%</p>
        </article>
        <article className="indicador">
          <h3>Sin contacto</h3><p className="cifra">{sinContacto}</p>
        </article>
        <article className="indicador">
          <h3>En riesgo</h3><p className="cifra">{enRiesgo}</p>
        </article>
      </section>

      <section className="dos-columnas separado">
        <article className="panel">
          <h3>¿Por dónde llegan?</h3>
          {datos.leadsPorCanal.length === 0 ? (
            <p className="nota">Todavía no hay interesados cargados.</p>
          ) : (
            <ul className="lista-barras">
              {datos.leadsPorCanal.map((fila) => (
                <li key={fila.canal} className="fila-barra">
                  <span className="nota">{legible(fila.canal)}</span>

                  <div className="barra"><span style={{ '--porcentaje': `${Math.round((fila.total / maximoCanal) * 100)}%` }} /></div>
                  <strong>{fila.total}</strong>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <h3>En qué estado están</h3>
          {datos.leadsPorEstado.length === 0 ? (
            <p className="nota">Todavía no hay interesados cargados.</p>
          ) : (
            <ul className="lista-barras">
              {datos.leadsPorEstado.map((fila) => (
                <li key={fila.estado} className="fila-barra">
                  <span><span className={`estado estado-${fila.estado}`}>{legible(fila.estado)}</span></span>
                  <div className="barra"><span style={{ '--porcentaje': `${Math.round((fila.total / maximoEstado) * 100)}%` }} /></div>
                  <strong>{fila.total}</strong>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </>
  );
}
