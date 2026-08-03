// suscripción de la institución a la plataforma, con el plan vigente y el pago
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Select, Table } from 'antd';
import { llamarApi, usuarioActual } from '../servicios/api.js';
import { avisarError, confirmar, toast } from '../servicios/avisos.js';
import { guaranies, fecha, contar, legible } from '../servicios/formato.js';
import Modal from '../componentes/Modal.jsx';
import VentanaPago from '../componentes/VentanaPago.jsx';

// alto fijo para que las tarjetas queden parejas aunque las imágenes vengan de distintos tamaños
const ESTILO_PORTADA = { width: '100%', height: 110, objectFit: 'cover', borderRadius: 10 };

function textoPeriodo(meses) {
  if (meses === 1) return 'por mes';
  if (meses === 12) return 'por año';
  return `cada ${meses} meses`;
}

export default function Suscripciones() {
  const navegar = useNavigate();
  const esAdministrador = usuarioActual()?.rol === 'administrador';
  const [datos, setDatos] = useState(null);
  const [medios, setMedios] = useState([]);
  const [planElegido, setPlanElegido] = useState(null);
  const [medio, setMedio] = useState('');
  const [error, setError] = useState(null);
  const [cargaError, setCargaError] = useState(null);
  const [pagando, setPagando] = useState(false);
  const [cobroEnCurso, setCobroEnCurso] = useState(null); // checkout abierto dentro de la pantalla

  async function cargar() {
    try {
      setDatos(await llamarApi('/api/suscripciones'));
    } catch (excepcion) {
      setCargaError(excepcion.message);
    }
  }

  useEffect(() => {
    cargar();
    if (esAdministrador) llamarApi('/api/pagos/medios').then(setMedios).catch(() => setMedios([]));
  }, []);

  function abrirPago(plan) {
    setPlanElegido(plan);
    setMedio('');
    setError(null);
  }

  async function pagarPlan(evento) {
    evento.preventDefault();
    if (pagando) return;
    setError(null);
    if (!medio) return setError('Elegí un medio de pago.');
    setPagando(true);
    try {
      const cobro = await llamarApi('/api/pagos/plan', { metodo: 'POST', cuerpo: { plan: planElegido.valor, medio } });
      setPlanElegido(null);
      await cargar();
      // la pasarela de prueba tiene su checkout dentro del sistema: se abre como pantalla
      // completa, no apretado adentro de un marco en esta misma vista
      if (String(cobro.urlPago ?? '').includes('/checkout/')) {
        return navegar(new URL(cobro.urlPago, window.location.origin).pathname);
      }
      setCobroEnCurso(cobro);
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setPagando(false);
    }
  }

  async function cancelar(id) {
    const ok = await confirmar({
      titulo: '¿Cancelar la suscripción?',
      texto: 'El sistema pasa al plan mínimo: los módulos que ese plan no incluya quedan con candado. Suscripción y pagos siguen abiertos para poder renovar.',
      confirmar: 'Sí, cancelar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await llamarApi(`/api/suscripciones/${id}/cancelar`, { metodo: 'POST' });
      await cargar();
      toast('Suscripción cancelada.');
    } catch (excepcion) {
      avisarError(excepcion.message);
    }
  }

  if (!datos) return cargaError ? <p className="error">{cargaError}</p> : <p className="mensaje-centrado">Cargando…</p>;

  const { vigente, planes, historial } = datos;

  // el historial guarda la clave del plan; un plan apagado ya no viene en la lista
  const tituloPlan = (clave) => planes.find((plan) => plan.valor === clave)?.texto ?? legible(clave);

  const columnas = [
    { title: 'Plan', dataIndex: 'plan', key: 'plan', render: (valor) => tituloPlan(valor) },
    { title: 'Monto', dataIndex: 'monto', key: 'monto', render: (valor) => <span className="sin-cortar">{guaranies(valor)}</span> },
    { title: 'Inicio', dataIndex: 'fecha_inicio', key: 'fecha_inicio', render: (valor) => <span className="sin-cortar">{fecha(valor)}</span> },
    { title: 'Vence', dataIndex: 'fecha_fin', key: 'fecha_fin', render: (valor) => <span className="sin-cortar">{fecha(valor)}</span> },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (valor) => <span className={`estado estado-${valor}`}>{legible(valor)}</span>,
    },
    { title: 'Pago', dataIndex: 'referencia', key: 'referencia', render: (valor) => valor ?? '—' },
  ];

  const opcionesMedio = [
    { value: '', label: 'Elegir…' },
    ...medios.map((opcion) => ({ value: opcion.valor, label: opcion.texto })),
  ];

  return (
    <>
      <header className="encabezado-pagina"><h2>Suscripción a la plataforma</h2></header>

      {cobroEnCurso && (
        <VentanaPago
          cobro={cobroEnCurso}
          alCerrar={() => setCobroEnCurso(null)}
          alAcreditar={async (estado) => {
            await cargar();
            if (estado === 'exitoso') toast('Pago acreditado, tu suscripción quedó activa.');
          }}
        />
      )}

      <section className="panel">
        <h3>Estado actual</h3>
        {!vigente && (
          <p className="error">
            No hay una suscripción activa. Elegí un plan para poner la plataforma al día.
          </p>
        )}
        {vigente && (
          <>
            {vigente.por_vencer && (
              <p className="error">
                Tu plan {vigente.texto_plan} vence en {contar(vigente.dias_restantes, 'día', 'días')}, el {fecha(vigente.fecha_fin)}.
                Renovalo para no perder los módulos que incluye tu plan.
              </p>
            )}
            <dl className="datos-perfil">
              <div><dt>Plan</dt><dd>{vigente.texto_plan}</dd></div>
              <div><dt>Estado</dt><dd><span className={`estado estado-${vigente.estado}`}>{legible(vigente.estado)}</span></dd></div>
              <div><dt>Inicio</dt><dd className="sin-cortar">{fecha(vigente.fecha_inicio)}</dd></div>
              <div><dt>Vence</dt><dd className="sin-cortar">{fecha(vigente.fecha_fin)}</dd></div>
              <div><dt>Días restantes</dt><dd>{vigente.dias_restantes}</dd></div>
            </dl>
            {esAdministrador && (
              <div className="acciones sep-arriba">
                <Button size="small" danger onClick={() => cancelar(vigente.id)}>Cancelar suscripción</Button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="panel">
        <h3>Planes disponibles</h3>
        <div className="cuadricula">
          {planes.map((plan) => (
            <article className={`plan ${vigente?.plan === plan.valor ? 'plan-actual' : ''}`} key={plan.valor}>
              {/* decorativa: el título va justo abajo, repetirlo en el alt molesta al lector de pantalla */}
              {plan.imagen && <img src={`/api/planes/imagenes/${plan.imagen}`} alt="" style={ESTILO_PORTADA} />}
              <h3>{plan.texto}{vigente?.plan === plan.valor && <span className="etiqueta">tu plan</span>}</h3>
              {plan.descripcion && <p className="nota">{plan.descripcion}</p>}
              <p className="cifra">{guaranies(plan.precio)}</p>
              <p className="nota">{textoPeriodo(plan.meses)}</p>
              <ul className="lista-plan">
                <li>{plan.maxUsuarios ? `Hasta ${contar(plan.maxUsuarios, 'usuario', 'usuarios')}` : 'Usuarios sin límite'}</li>
                <li>{plan.modulos?.length ? `Módulos: ${plan.modulos.map(legible).join(', ')}` : 'Todos los módulos'}</li>
                {plan.incluye.map((punto) => <li key={punto}>{punto}</li>)}
              </ul>
              {esAdministrador && (
                <Button type="primary" aria-label={`${vigente ? 'Cambiar al plan' : 'Contratar el plan'} ${plan.texto}`} onClick={() => abrirPago(plan)}>
                  {vigente ? 'Cambiar a este plan' : 'Contratar'}
                </Button>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>Historial de suscripciones</h3>
        {historial.length === 0 && <p className="nota">Todavía no hay períodos contratados.</p>}
        {historial.length > 0 && (
          <div className="tabla-envoltura">
            <Table columns={columnas} dataSource={historial} rowKey="id" size="small" pagination={false} />
          </div>
        )}
      </section>

      <Modal abierto={Boolean(planElegido)} titulo={`Contratar plan ${planElegido?.texto ?? ''}`} alCerrar={() => setPlanElegido(null)}>
        <form onSubmit={pagarPlan}>
          <p className="ayuda">Vas a pagar {guaranies(planElegido?.precio ?? 0)} {textoPeriodo(planElegido?.meses ?? 1)}.</p>
          <label>Medio de pago
            <Select value={medio} options={opcionesMedio} onChange={setMedio} />
          </label>
          {error && <p className="error">{error}</p>}
          <div className="acciones">
            <Button type="primary" htmlType="submit" disabled={pagando}>{pagando ? 'Generando el pago…' : 'Ir a pagar'}</Button>
            <Button onClick={() => setPlanElegido(null)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
