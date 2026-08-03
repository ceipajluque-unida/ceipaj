import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Select, Table } from 'antd';
import { llamarApi, usuarioActual } from '../servicios/api.js';
import { avisarError, confirmar, toast } from '../servicios/avisos.js';
import { guaranies, fecha, contar, legible } from '../servicios/formato.js';
import Modal from '../componentes/Modal.jsx';
import VentanaPago from '../componentes/VentanaPago.jsx';
import TablaPagos from '../componentes/TablaPagos.jsx';
import TarjetasPlanes, { ETIQUETA_CAMBIO } from '../componentes/TarjetasPlanes.jsx';
import { descargarArchivo } from '../servicios/descargas.js';

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
  const [cobroEnCurso, setCobroEnCurso] = useState(null);
  const [bajando, setBajando] = useState(null);

  async function cargar() {
    try {
      setDatos(await llamarApi('/api/suscripciones'));
      setCargaError(null);
      window.dispatchEvent(new Event('plan'));
    } catch (excepcion) {
      setCargaError(excepcion.message);
    }
  }

  useEffect(() => {
    cargar();
    if (esAdministrador) llamarApi('/api/pagos/medios').then(setMedios).catch(() => setMedios([]));
  }, []);

  async function abrirPago(plan, cambio) {
    if (cambio?.tipo === 'reduccion') return bajarDePlan(plan, cambio);
    setPlanElegido({ ...plan, cambio });
    setMedio('');
    setError(null);
  }

  async function bajarDePlan(plan, cambio) {
    const ok = await confirmar({
      titulo: `¿Pasar al plan ${plan.texto}?`,
      texto: `El saldo de ${guaranies(cambio.credito)} que te queda del plan ${cambio.planActual} se convierte en `
        + `${contar(cambio.diasQueCubre, 'día', 'días')} del plan ${plan.texto}. El cambio es inmediato y no se cobra nada.`,
      confirmar: 'Sí, cambiar',
    });
    if (!ok) return;
    try {
      const r = await llamarApi('/api/suscripciones/reducir', { metodo: 'POST', cuerpo: { plan: plan.valor } });
      await cargar();
      toast(`Ya estás en el plan ${plan.texto}, por ${contar(r.dias, 'día', 'días')}.`);
    } catch (excepcion) {
      avisarError(excepcion.message);
    }
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

  async function cancelar(vigente) {
    const ok = await confirmar({
      titulo: '¿Dar de baja la renovación?',
      texto: `Vas a seguir usando el plan ${vigente.texto_plan} con todo lo que incluye hasta el `
        + `${fecha(vigente.fecha_fin)}, que es el período que ya pagaste. Desde esa fecha el sistema `
        + 'pasa al plan mínimo. No hay reembolso por los días sin usar.',
      confirmar: 'Sí, dar de baja',
      peligro: true,
    });
    if (!ok) return;
    try {
      const resultado = await llamarApi(`/api/suscripciones/${vigente.id}/cancelar`, { metodo: 'POST' });
      await cargar();
      toast(`Baja registrada. Tu plan sigue activo hasta el ${fecha(resultado.fechaFin)}.`);
    } catch (excepcion) {
      avisarError(excepcion.message);
    }
  }

  async function bajarRecibo(referencia) {
    setBajando(referencia);
    try {
      await descargarArchivo(`/api/pagos/${referencia}/recibo`, `recibo-${referencia}.pdf`);
      toast('Recibo descargado.');
    } catch (excepcion) {
      avisarError(excepcion.message);
    } finally {
      setBajando(null);
    }
  }

  if (!datos) return cargaError ? <p className="error">{cargaError}</p> : <p className="mensaje-centrado">Cargando…</p>;

  const { vigente, planes, historial } = datos;

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
      {cargaError && <p className="error">{cargaError}</p>}

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
            {!vigente.renueva && (
              <p className="nota sep-arriba">
                Diste de baja la renovación. El plan {vigente.texto_plan} sigue disponible hasta
                el {fecha(vigente.fecha_fin)} y después el sistema pasa al plan mínimo.
              </p>
            )}
            {esAdministrador && vigente.renueva && (
              <div className="acciones sep-arriba">
                <Button size="small" danger onClick={() => cancelar(vigente)}>Dar de baja la renovación</Button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="panel">
        <h3>Planes disponibles</h3>
        <TarjetasPlanes
          planes={planes}
          vigente={vigente}
          cambios={datos.cambios}
          esAdministrador={esAdministrador}
          alElegir={abrirPago}
        />
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

      <section className="panel">
        <h3>Pagos de la plataforma</h3>
        {(datos.pagos ?? []).length === 0 ? (
          <p className="nota">Todavía no hay pagos de suscripción.</p>
        ) : (
          <div className="tabla-envoltura">
            <TablaPagos
              pagos={datos.pagos}
              textoMedio={(valor) => legible(valor)}
              esAdministrador={esAdministrador}
              bajando={bajando}
              alBajarRecibo={bajarRecibo}
            />
          </div>
        )}
      </section>

      <Modal abierto={Boolean(planElegido)} titulo={`${ETIQUETA_CAMBIO[planElegido?.cambio?.tipo] ?? 'Contratar'} plan ${planElegido?.texto ?? ''}`} alCerrar={() => setPlanElegido(null)}>
        <form onSubmit={pagarPlan}>
          <p className="ayuda">
            Vas a pagar <strong>{guaranies(planElegido?.cambio?.aPagar ?? planElegido?.precio ?? 0)}</strong>{' '}
            {textoPeriodo(planElegido?.meses ?? 1)}.
          </p>
          {planElegido?.cambio?.credito > 0 && (
            <p className="nota">
              El plan cuesta {guaranies(planElegido.precio)} y se te descuentan{' '}
              {guaranies(planElegido.cambio.credito)} por los {contar(planElegido.cambio.diasRestantes, 'día', 'días')}
              {' '}que quedan del plan {planElegido.cambio.planActual}.
            </p>
          )}
          {planElegido?.cambio?.tipo === 'reduccion' && (
            <p className="nota">
              Como es un plan más económico, empieza el {fecha(planElegido.cambio.desde)}: el período que
              ya pagaste se respeta hasta el final y no hay reembolso.
            </p>
          )}
          {planElegido?.cambio?.tipo === 'renovacion' && (
            <p className="nota">Se suma al final del período actual, así que no perdés los días que te quedan.</p>
          )}
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
