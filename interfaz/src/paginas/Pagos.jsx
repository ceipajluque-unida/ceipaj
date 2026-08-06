import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select } from 'antd';
import { llamarApi, usuarioActual } from '../servicios/api.js';
import { avisarError, toast } from '../servicios/avisos.js';
import { descargarArchivo } from '../servicios/descargas.js';
import VentanaPago from '../componentes/VentanaPago.jsx';
import { abrirVentanaPago, llevarVentanaPagoA, cerrarVentanaPago } from '../servicios/ventanaPago.js';
import TablaPagos from '../componentes/TablaPagos.jsx';
import FormularioCobro from '../componentes/FormularioCobro.jsx';

const FORMULARIO_VACIO = { concepto: '', monto: '', medio: '' };
const FILTROS_VACIOS = { estado: '', buscar: '' };
const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'exitoso', label: 'Pagados' },
  { value: 'rechazado', label: 'Rechazados' },
];

export default function Pagos() {
  const navegar = useNavigate();

  const esAdministrador = usuarioActual()?.rol === 'administrador';
  const [pagos, setPagos] = useState(null);
  const [medios, setMedios] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [abierto, setAbierto] = useState(false);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [error, setError] = useState(null);
  const [cargaError, setCargaError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [cobroEnCurso, setCobroEnCurso] = useState(null);
  const [bajando, setBajando] = useState(null);
  const [conciliando, setConciliando] = useState(false);

  async function cargar() {
    try {
      setPagos(await llamarApi('/api/pagos'));
    } catch (excepcion) {
      setCargaError(excepcion.message);
    }
  }

  useEffect(() => {
    cargar();

    if (esAdministrador) llamarApi('/api/pagos/medios').then(setMedios).catch(() => setMedios([]));
  }, []);

  const textoMedio = (valor) => medios.find((m) => m.valor === valor)?.texto ?? valor ?? '—';

  const cambiarFiltro = (clave, valor) => setFiltros({ ...filtros, [clave]: valor });

  async function crearCobro(evento) {
    evento.preventDefault();
    if (enviando) return;
    setError(null);
    if (!formulario.medio) return setError('Elegí un medio de pago.');
    if (medios.find((opcion) => opcion.valor === formulario.medio)?.ventanaPropia) abrirVentanaPago();
    setEnviando(true);
    try {
      const cobro = await llamarApi('/api/pagos', { metodo: 'POST', cuerpo: { concepto: formulario.concepto, monto: Number(formulario.monto), medio: formulario.medio } });
      setAbierto(false);
      setFormulario(FORMULARIO_VACIO);
      await cargar();

      if (String(cobro.urlPago ?? '').includes('/checkout/')) {
        cerrarVentanaPago();
        return navegar(new URL(cobro.urlPago, window.location.origin).pathname);
      }
      if (cobro.urlPago && !cobro.incrustado) llevarVentanaPagoA(cobro.urlPago);
      else cerrarVentanaPago();
      setCobroEnCurso(cobro);
    } catch (excepcion) {
      cerrarVentanaPago();
      setError(excepcion.message);
    } finally {
      setEnviando(false);
    }
  }

  async function conciliar() {
    setConciliando(true);
    try {
      const { revisados, actualizados, sinRevisar } = await llamarApi('/api/pagos/conciliar', { metodo: 'POST' });
      await cargar();
      const resto = sinRevisar > 0 ? ` Quedaron ${sinRevisar} para la próxima vuelta.` : '';
      toast(actualizados > 0
        ? `Se actualizaron ${actualizados} de ${revisados} cobros.${resto}`
        : `Se revisaron ${revisados} cobros y ninguno cambió.${resto}`);
    } catch (excepcion) {
      avisarError(excepcion.message);
    } finally {
      setConciliando(false);
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

  if (!pagos) return cargaError ? <p className="error">{cargaError}</p> : <p className="mensaje-centrado">Cargando…</p>;

  const hayFiltros = Boolean(filtros.estado || filtros.buscar);
  const buscado = filtros.buscar.trim().toLowerCase();
  const visibles = pagos.filter((pago) => {
    if (filtros.estado && pago.estado !== filtros.estado) return false;
    if (!buscado) return true;
    return `${pago.referencia} ${pago.concepto}`.toLowerCase().includes(buscado);
  });

  return (
    <>
      {cargaError && <p className="error">{cargaError}</p>}

      <header className="encabezado-pagina">

        <h2>Cobros de la institución</h2>
        {esAdministrador && (
          <div className="acciones">
            <Button disabled={conciliando} onClick={conciliar}>
              {conciliando ? 'Consultando…' : 'Conciliar pagos'}
            </Button>
            <Button type="primary" className="boton-crear" onClick={() => { setError(null); setAbierto(true); }}>+ Crear cobro</Button>
          </div>
        )}
      </header>

      {cobroEnCurso && (
        <VentanaPago
          cobro={cobroEnCurso}
          alCerrar={() => setCobroEnCurso(null)}
          alAcreditar={() => cargar()}
        />
      )}

      <section className="panel">
        <div className="fila-formulario">
          <label>Buscar
            <Input placeholder="Referencia o concepto" value={filtros.buscar} onChange={(evento) => cambiarFiltro('buscar', evento.target.value)} />
          </label>
          <label>Estado
            <Select
              value={filtros.estado}
              options={ESTADOS}
              onChange={(valor) => cambiarFiltro('estado', valor)}
            />
          </label>
          {hayFiltros && (
            <Button onClick={() => setFiltros(FILTROS_VACIOS)}>Limpiar filtros</Button>
          )}
        </div>

        {pagos.length === 0 && (
          <p className="nota">Todavía no hay cobros.</p>
        )}
        {pagos.length > 0 && visibles.length === 0 && <p className="nota">Ningún cobro coincide con esos filtros.</p>}
        {visibles.length > 0 && (
          <TablaPagos
            pagos={visibles}
            textoMedio={textoMedio}
            esAdministrador={esAdministrador}
            bajando={bajando}
            alBajarRecibo={bajarRecibo}
            alRetomar={(pago) => {
              const propia = pago.proveedor === 'adamspay';
              if (propia) {
                abrirVentanaPago();
                llevarVentanaPagoA(pago.url_pago);
              }
              setCobroEnCurso({ ...pago, urlPago: pago.url_pago, incrustado: !propia });
            }}
          />
        )}
        {pagos.length === 50 && <p className="nota">Se muestran los 50 cobros más recientes.</p>}
      </section>

      <FormularioCobro
        abierto={abierto}
        medios={medios}
        formulario={formulario}
        error={error}
        enviando={enviando}
        alCambiar={setFormulario}
        alEnviar={crearCobro}
        alCerrar={() => setAbierto(false)}
      />
    </>
  );
}
