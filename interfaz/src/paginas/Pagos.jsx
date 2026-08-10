import { useEffect, useState } from 'react';
import { Button, Input, Select } from 'antd';
import { llamarApi, usuarioActual } from '../servicios/api.js';
import { avisarError, toast } from '../servicios/avisos.js';
import { descargarArchivo } from '../servicios/descargas.js';
import { legible } from '../servicios/formato.js';
import VentanaPago from '../componentes/VentanaPago.jsx';
import { abrirVentanaPago, llevarVentanaPagoA } from '../servicios/ventanaPago.js';
import TablaPagos from '../componentes/TablaPagos.jsx';

const FILTROS_VACIOS = { estado: '', buscar: '' };
const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'exitoso', label: 'Pagados' },
  { value: 'rechazado', label: 'Rechazados' },
];

export default function Pagos() {
  const esAdministrador = usuarioActual()?.rol === 'administrador';
  const [pagos, setPagos] = useState(null);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [cargaError, setCargaError] = useState(null);
  const [cobroEnCurso, setCobroEnCurso] = useState(null);
  const [bajando, setBajando] = useState(null);
  const [conciliando, setConciliando] = useState(false);

  async function cargar() {
    try {
      setPagos(await llamarApi('/api/pagos'));
      setCargaError(null);
    } catch (excepcion) {
      setCargaError(excepcion.message);
    }
  }

  useEffect(() => { cargar(); }, []);

  const cambiarFiltro = (clave, valor) => setFiltros({ ...filtros, [clave]: valor });

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
        <h2>Pagos a la plataforma</h2>
        {esAdministrador && (
          <Button disabled={conciliando} onClick={conciliar}>
            {conciliando ? 'Consultando…' : 'Conciliar pagos'}
          </Button>
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
          <p className="nota">Todavía no hay pagos.</p>
        )}
        {pagos.length > 0 && visibles.length === 0 && <p className="nota">Ningún pago coincide con esos filtros.</p>}
        {visibles.length > 0 && (
          <TablaPagos
            pagos={visibles}
            textoMedio={(valor) => legible(valor)}
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
        {pagos.length === 50 && <p className="nota">Se muestran los 50 pagos más recientes.</p>}
      </section>
    </>
  );
}
