// comisiones de aliados con su resumen; solo el admin marca pagada una pendiente
import { useEffect, useState } from 'react';
import { Button, Select, Table } from 'antd';
import { llamarApi, usuarioActual } from '../servicios/api.js';
import { confirmar, avisarError, toast } from '../servicios/avisos.js';
import { guaranies, fecha, contar, legible } from '../servicios/formato.js';

const FILTROS_VACIOS = { aliado: '', estado: '' };

export default function Comisiones() {
  const esAdministrador = usuarioActual()?.rol === 'administrador';
  const [datos, setDatos] = useState(null); // { comisiones, resumen }
  const [cargaError, setCargaError] = useState(null);
  const [pestana, setPestana] = useState('resumen');
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);

  async function cargar() {
    try {
      setDatos(await llamarApi('/api/comisiones'));
    } catch (excepcion) {
      setCargaError(excepcion.message);
    }
  }
  useEffect(() => { cargar(); }, []);

  // marcar pagada mueve plata, se confirma antes
  async function marcarPagada(comision) {
    const ok = await confirmar({
      titulo: '¿Marcar la comisión como pagada?',
      texto: `Se registra el pago de ${guaranies(comision.monto)} a ${comision.aliado}.`,
      confirmar: 'Sí, marcar pagada',
    });
    if (!ok) return;
    try {
      await llamarApi(`/api/comisiones/${comision.id}/estado`, { metodo: 'PUT', cuerpo: { estado: 'pagada' } });
      await cargar();
      toast('Comisión marcada como pagada.');
    } catch (excepcion) {
      avisarError(excepcion.message);
    }
  }

  if (!datos) return cargaError ? <p className="error">{cargaError}</p> : <p className="mensaje-centrado">Cargando…</p>;

  if (datos.comisiones.length === 0) {
    return (
      <>
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
  // por id y no por nombre: el backend agrupa por aliado_id justamente para no mezclar
  // homónimos, y filtrar por el nombre volvía a juntarlos en una sola opción
  const opcionesAliado = datos.resumen.map((fila) => ({ value: fila.aliado_id, label: fila.aliado }));

  const hayFiltros = Boolean(filtros.aliado || filtros.estado);
  const visibles = datos.comisiones.filter((comision) => {
    if (filtros.aliado && comision.aliado_id !== filtros.aliado) return false;
    if (filtros.estado && comision.estado !== filtros.estado) return false;
    return true;
  });
  const filtrar = (clave) => (valor) => setFiltros({ ...filtros, [clave]: valor });

  const columnasResumen = [
    { title: 'Aliado', dataIndex: 'aliado', key: 'aliado' },
    { title: 'Comisiones', dataIndex: 'cantidad', key: 'cantidad' },
    { title: 'Falta pagar', dataIndex: 'pendiente', key: 'pendiente', render: (valor) => guaranies(valor) },
    { title: 'Ya pagado', dataIndex: 'pagada', key: 'pagada', render: (valor) => guaranies(valor) },
  ];

  const columnasDetalle = [
    { title: 'Aliado', dataIndex: 'aliado', key: 'aliado' },
    { title: 'Interesado matriculado', dataIndex: 'lead', key: 'lead' },
    { title: 'Monto', dataIndex: 'monto', key: 'monto', render: (valor) => guaranies(valor) },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (valor) => <span className={`estado estado-${valor}`}>{legible(valor)}</span>,
    },
    {
      title: 'Generada',
      dataIndex: 'creado_en',
      key: 'creado_en',
      render: (valor) => <span className="sin-cortar">{fecha(valor)}</span>,
    },
    ...(esAdministrador ? [{
      title: <span className="oculto-visual">Acciones</span>,
      key: 'acciones',
      render: (_, comision) => (comision.estado !== 'pendiente' ? null : (
        <div className="acciones">
          <Button
            size="small"
            aria-label={`Marcar como pagada la comisión de ${comision.aliado}`}
            onClick={() => marcarPagada(comision)}
          >
            Marcar pagada
          </Button>
        </div>
      )),
    }] : []),
  ];

  return (
    <>
      <header className="encabezado-pagina"><h2>Comisiones de aliados</h2></header>

      <section className="cuadricula sep-abajo">
        <article className="indicador">
          <h3>Falta pagar</h3>
          <p className="cifra">{guaranies(totales.pendiente)}</p>
          <p className="nota">{contar(pendientes, 'comisión pendiente', 'comisiones pendientes')}</p>
        </article>
        <article className="indicador">
          <h3>Ya pagado</h3>
          <p className="cifra">{guaranies(totales.pagada)}</p>
        </article>
        <article className="indicador">
          <h3>Aliados con comisiones</h3>
          <p className="cifra">{datos.resumen.length}</p>
          <p className="nota">{contar(datos.comisiones.length, 'comisión generada', 'comisiones generadas')}</p>
        </article>
      </section>

      <nav className="pestanas">
        <Button type="text" className={pestana === 'resumen' ? 'activa' : ''} onClick={() => setPestana('resumen')}>Resumen por aliado</Button>
        <Button type="text" className={pestana === 'detalle' ? 'activa' : ''} onClick={() => setPestana('detalle')}>Detalle</Button>
      </nav>

      {pestana === 'resumen' && (
        <section className="panel">
          <div className="tabla-envoltura">
            <Table columns={columnasResumen} dataSource={datos.resumen} rowKey="aliado_id" size="small" pagination={false} />
          </div>
        </section>
      )}

      {pestana === 'detalle' && (
        <section className="panel">
          <div className="fila-formulario">
            <label>Aliado
              <Select
                value={filtros.aliado}
                options={[{ value: '', label: 'Todos' }, ...opcionesAliado]}
                onChange={filtrar('aliado')}
              />
            </label>
            <label>Estado
              <Select
                value={filtros.estado}
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'pendiente', label: 'Pendientes' },
                  { value: 'pagada', label: 'Pagadas' },
                ]}
                onChange={filtrar('estado')}
              />
            </label>
            {hayFiltros && (
              <Button onClick={() => setFiltros(FILTROS_VACIOS)}>Limpiar filtros</Button>
            )}
          </div>

          {visibles.length === 0 && <p className="nota">Ninguna comisión coincide con esos filtros.</p>}
          {visibles.length > 0 && (
            <div className="tabla-envoltura">
              <Table columns={columnasDetalle} dataSource={visibles} rowKey="id" size="small" pagination={false} />
            </div>
          )}
        </section>
      )}
    </>
  );
}
