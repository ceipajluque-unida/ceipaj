// visor de auditoría de solo lectura para el admin, quién hizo qué y desde dónde
import { useEffect, useRef, useState } from 'react';
import { Button, Input, Select, Table } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { avisarError } from '../servicios/avisos.js';
import { fechaHora, contar } from '../servicios/formato.js';
import { TEXTO_ACCION } from '../servicios/textosAuditoria.js';

const FILTROS_VACIOS = { buscar: '', accion: '', pagina: 1 };

// lo que no esté en la lista al menos pierde los guiones bajos
function textoAccion(accion) {
  if (TEXTO_ACCION[accion]) return TEXTO_ACCION[accion];
  const suelto = String(accion).replace(/_/g, ' ');
  return suelto.charAt(0).toUpperCase() + suelto.slice(1);
}

export default function Auditoria() {
  const [datos, setDatos] = useState(null);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  // descarta respuestas viejas cuando se escribe rápido en el buscador
  const ultimaConsulta = useRef(0);

  async function cargar(actuales = filtros) {
    try {
      const consulta = new URLSearchParams(Object.entries(actuales).filter(([, valor]) => valor)).toString();
      const miTurno = ++ultimaConsulta.current;
      const resultado = await llamarApi(`/api/auditoria${consulta ? `?${consulta}` : ''}`);
      if (miTurno === ultimaConsulta.current) setDatos(resultado);
    } catch (excepcion) {
      avisarError(excepcion.message);
    }
  }
  useEffect(() => { cargar(); }, []);

  function cambiar(campo, valor) {
    // al cambiar un filtro se vuelve a la página 1
    const actuales = { ...filtros, [campo]: valor, pagina: campo === 'pagina' ? valor : 1 };
    setFiltros(actuales);
    cargar(actuales);
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_VACIOS);
    cargar(FILTROS_VACIOS);
  }

  if (!datos) return <p className="mensaje-centrado">Cargando…</p>;
  const hayFiltros = filtros.buscar !== '' || filtros.accion !== '';

  const columnas = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      render: (valor) => <span className="sin-cortar">{fechaHora(valor)}</span>,
    },
    { title: 'Usuario', dataIndex: 'usuario', key: 'usuario', render: (valor) => valor ?? 'El sistema' },
    { title: 'Movimiento', dataIndex: 'accion', key: 'accion', render: (valor) => textoAccion(valor) },
    { title: 'Detalle', dataIndex: 'detalle', key: 'detalle', render: (valor) => valor ?? '—' },
    { title: 'IP', dataIndex: 'direccion_ip', key: 'direccion_ip', render: (valor) => valor ?? '—' },
  ];

  return (
    <>
      <header className="encabezado-pagina"><h2>Auditoría</h2></header>

      <section className="panel">
        <div className="barra-filtros">
          <label className="ancho">Buscar
            <Input value={filtros.buscar} onChange={(evento) => cambiar('buscar', evento.target.value)} placeholder="Nombre del usuario o detalle" />
          </label>
          <label>Movimiento
            <Select
              value={filtros.accion}
              options={[{ value: '', label: 'Todos' }, ...datos.acciones.map((accion) => ({ value: accion, label: textoAccion(accion) }))]}
              onChange={(valor) => cambiar('accion', valor)}
            />
          </label>
          {hayFiltros && <Button onClick={limpiarFiltros}>Limpiar filtros</Button>}
        </div>

        {datos.registros.length > 0 && (
          <>
            <div className="tabla-envoltura">
              <Table columns={columnas} dataSource={datos.registros} rowKey="id" size="small" pagination={false} />
            </div>

            <div className="paginacion">
              <Button size="small" disabled={datos.pagina <= 1} onClick={() => cambiar('pagina', datos.pagina - 1)}>Anterior</Button>
              <span className="nota">
                Página {datos.pagina} de {datos.paginas} — {contar(datos.total, 'movimiento', 'movimientos')}
              </span>
              <Button size="small" disabled={datos.pagina >= datos.paginas} onClick={() => cambiar('pagina', datos.pagina + 1)}>Siguiente</Button>
            </div>
          </>
        )}

        {datos.registros.length === 0 && (
          <div className="vacio">
            {hayFiltros ? (
              <>
                <p>Ningún movimiento coincide con lo que buscaste.</p>
                <Button onClick={limpiarFiltros}>Limpiar filtros</Button>
              </>
            ) : (
              <p>Todavía no hay movimientos registrados.</p>
            )}
          </div>
        )}
      </section>
    </>
  );
}
