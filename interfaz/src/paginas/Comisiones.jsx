import { useEffect, useState } from 'react';
import { Button, Table } from 'antd';
import { llamarApi, usuarioActual } from '../servicios/api.js';
import { descargarArchivo } from '../servicios/descargas.js';
import { confirmar, avisarError, toast } from '../servicios/avisos.js';
import { guaranies, fecha, contar } from '../servicios/formato.js';
import Modal from '../componentes/Modal.jsx';
import Barras from '../componentes/Barras.jsx';

export default function Comisiones() {
  const esAdministrador = usuarioActual()?.rol === 'administrador';
  const [datos, setDatos] = useState(null);
  const [cargaError, setCargaError] = useState(null);
  const [aliadoElegido, setAliadoElegido] = useState(null);

  async function cargar() {
    try {
      setDatos(await llamarApi('/api/comisiones'));
      setCargaError(null);
    } catch (excepcion) {
      setCargaError(excepcion.message);
    }
  }
  useEffect(() => { cargar(); }, []);

  async function bajarRecibo(comision) {
    try {
      await descargarArchivo(`/api/comisiones/${comision.id}/recibo`, `recibo-COM-${comision.id}.pdf`);
      toast('Recibo descargado.');
    } catch (excepcion) {
      avisarError(excepcion.message);
    }
  }

  async function pagar(comision) {
    const ok = await confirmar({
      titulo: `¿Pagar la comisión de ${comision.aliado}?`,
      texto: `${guaranies(comision.monto)} por la matrícula de ${comision.interesado}.`,
      confirmar: 'Sí, pagar',
    });
    if (!ok) return;
    try {
      await llamarApi(`/api/comisiones/${comision.id}/estado`, { metodo: 'PUT', cuerpo: { estado: 'pagada' } });
      await cargar();
      toast('Comisión pagada.');
    } catch (excepcion) {
      avisarError(excepcion.message);
    }
  }

  if (!datos) return cargaError ? <p className="error">{cargaError}</p> : <p className="mensaje-centrado">Cargando…</p>;

  if (datos.comisiones.length === 0) {
    return (
      <>
        {cargaError && <p className="error">{cargaError}</p>}
        <header className="encabezado-pagina"><h2>Comisiones de aliados</h2></header>
        <section className="panel">
          <p className="nota">Todavía no hay comisiones.</p>
        </section>
      </>
    );
  }

  const totales = datos.resumen.reduce(
    (acumulado, fila) => ({ pendiente: acumulado.pendiente + fila.pendiente, pagada: acumulado.pagada + fila.pagada }),
    { pendiente: 0, pagada: 0 }
  );
  const pendientes = datos.comisiones.filter((comision) => comision.estado === 'pendiente').length;
  const delElegido = aliadoElegido
    ? datos.comisiones.filter((comision) => comision.aliado_id === aliadoElegido.aliado_id)
    : [];

  const columnasResumen = [
    { title: 'Aliado', dataIndex: 'aliado', key: 'aliado' },
    { title: 'Comisiones', dataIndex: 'cantidad', key: 'cantidad', align: 'center' },
    { title: 'Pendiente de pago', dataIndex: 'pendiente', key: 'pendiente', render: (valor) => guaranies(valor) },
    { title: 'Pagado', dataIndex: 'pagada', key: 'pagada', render: (valor) => guaranies(valor) },
    {
      title: <span className="oculto-visual">Acciones</span>,
      key: 'acciones',
      render: (_, fila) => (
        <Button size="small" onClick={() => setAliadoElegido(fila)}>Ver detalle</Button>
      ),
    },
  ];

  const columnasDetalle = [
    { title: 'Interesado matriculado', dataIndex: 'interesado', key: 'interesado' },
    { title: 'Monto', dataIndex: 'monto', key: 'monto', render: (valor) => guaranies(valor) },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (valor) => <span className={`estado estado-${valor}`}>{valor === 'pagada' ? 'Pagada' : 'Pendiente de pago'}</span>,
    },
    {
      title: 'Generada el',
      dataIndex: 'creado_en',
      key: 'creado_en',
      render: (valor) => <span className="sin-cortar">{fecha(valor)}</span>,
    },
    {
      title: <span className="oculto-visual">Acciones</span>,
      key: 'acciones',
      render: (_, comision) => (
        <div className="acciones">
          {esAdministrador && comision.estado === 'pendiente' && (
            <Button size="small" type="primary" onClick={() => pagar(comision)}>Pagar</Button>
          )}
          {comision.estado === 'pagada' && (
            <Button size="small" onClick={() => bajarRecibo(comision)}>Recibo</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      {cargaError && <p className="error">{cargaError}</p>}

      <header className="encabezado-pagina"><h2>Comisiones de aliados</h2></header>

      <section className="cuadricula sep-abajo">
        <article className="indicador">
          <h3>Pendiente de pago</h3>
          <p className="cifra">{guaranies(totales.pendiente)}</p>
          <p className="nota">{contar(pendientes, 'comisión por pagar', 'comisiones por pagar')}</p>
        </article>
        <article className="indicador">
          <h3>Pagado</h3>
          <p className="cifra">{guaranies(totales.pagada)}</p>
        </article>
        <article className="indicador">
          <h3>Aliados con comisiones</h3>
          <p className="cifra">{datos.resumen.length}</p>
          <p className="nota">{contar(datos.comisiones.length, 'comisión generada', 'comisiones generadas')}</p>
        </article>
      </section>

      <section className="panel sep-abajo">
        <h3>Pagado y pendiente</h3>
        <Barras filas={[
          { clave: 'pendiente', etiqueta: 'Pendiente de pago', total: totales.pendiente, texto: guaranies(totales.pendiente) },
          { clave: 'pagada', etiqueta: 'Pagado', total: totales.pagada, texto: guaranies(totales.pagada) },
        ]} />
      </section>

      <section className="panel">
        <h3>Resumen por aliado</h3>
        <div className="tabla-envoltura">
          <Table columns={columnasResumen} dataSource={datos.resumen} rowKey="aliado_id" size="small" pagination={false} />
        </div>
      </section>

      <Modal
        abierto={Boolean(aliadoElegido)}
        titulo={`Comisiones de ${aliadoElegido?.aliado ?? ''}`}
        alCerrar={() => setAliadoElegido(null)}
        ancho={760}
      >
        <div className="tabla-envoltura">
          <Table columns={columnasDetalle} dataSource={delElegido} rowKey="id" size="small" pagination={false} />
        </div>
      </Modal>
    </>
  );
}
