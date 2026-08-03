// pagos de la plataforma: crear cobros, ver el historial y bajar el recibo
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select } from 'antd';
import { llamarApi, usuarioActual } from '../servicios/api.js';
import { avisarError, toast } from '../servicios/avisos.js';
import { descargarArchivo } from '../servicios/descargas.js';
import VentanaPago from '../componentes/VentanaPago.jsx';
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
  // crear cobros es tarea del administrador; la dirección solo mira el historial
  const esAdministrador = usuarioActual()?.rol === 'administrador';
  const [pagos, setPagos] = useState(null);
  const [medios, setMedios] = useState([]); // medios de pago que ofrece la pasarela
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [abierto, setAbierto] = useState(false);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [error, setError] = useState(null); // error del formulario dentro del modal
  const [cargaError, setCargaError] = useState(null); // error al traer el historial
  const [enviando, setEnviando] = useState(false); // evita cobros duplicados por doble clic
  const [cobroEnCurso, setCobroEnCurso] = useState(null); // checkout abierto dentro de la pantalla
  const [bajando, setBajando] = useState(null); // referencia del recibo que se está bajando
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
    // solo el admin crea cobros, así que solo él necesita los medios
    if (esAdministrador) llamarApi('/api/pagos/medios').then(setMedios).catch(() => setMedios([]));
  }, []);

  // texto lindo del medio de pago
  const textoMedio = (valor) => medios.find((m) => m.valor === valor)?.texto ?? valor ?? '—';

  const cambiarFiltro = (clave, valor) => setFiltros({ ...filtros, [clave]: valor });

  async function crearCobro(evento) {
    evento.preventDefault();
    if (enviando) return; // ya hay un cobro en curso
    setError(null);
    if (!formulario.medio) return setError('Elegí un medio de pago.');
    setEnviando(true);
    try {
      const cobro = await llamarApi('/api/pagos', { metodo: 'POST', cuerpo: { concepto: formulario.concepto, monto: Number(formulario.monto), medio: formulario.medio } });
      setAbierto(false);
      setFormulario(FORMULARIO_VACIO);
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
      setEnviando(false);
    }
  }

  // le pregunta a la pasarela el estado real de los pagos que quedaron colgados
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
      <header className="encabezado-pagina">
        <h2>Pagos de la plataforma <span className="etiqueta">sandbox</span></h2>
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
          alAcreditar={async (estado) => {
            await cargar();
            if (estado === 'exitoso') toast('Pago acreditado. Ya podés descargar el recibo.');
          }}
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
            alRetomar={(pago) => setCobroEnCurso({ ...pago, urlPago: pago.url_pago, incrustado: true })}
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
