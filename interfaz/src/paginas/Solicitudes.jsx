import { useEffect, useState } from 'react';
import { Button, Input, Select, Table } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { avisarError, toast, confirmar } from '../servicios/avisos.js';
import { fechaHora, contar } from '../servicios/formato.js';
import { ESTADOS_SOLICITUD, DIAS_DESCARTE } from '../servicios/solicitudes.js';
import DetalleSolicitud from '../componentes/DetalleSolicitud.jsx';
import Estado from '../componentes/Estado.jsx';

const TONO_ESTADO = { nueva: 'nuevo', contactada: 'pendiente', convertida: 'exitoso', descartada: 'neutro' };
const textoEstado = (valor) => ESTADOS_SOLICITUD.find((e) => e.valor === valor)?.texto ?? valor;

export default function Solicitudes() {
  const [datos, setDatos] = useState(null);
  const [filtros, setFiltros] = useState({ estado: 'nueva', texto: '' });
  const [abierta, setAbierta] = useState(null);

  async function cargar(actuales = filtros) {
    try {
      const consulta = new URLSearchParams(Object.entries(actuales).filter(([, v]) => v)).toString();
      setDatos(await llamarApi(`/api/solicitudes${consulta ? `?${consulta}` : ''}`));
    } catch (excepcion) {
      avisarError(excepcion.message);
    }
  }
  useEffect(() => { cargar(); }, []);

  function cambiar(campo, valor) {
    const actuales = { ...filtros, [campo]: valor };
    setFiltros(actuales);
    cargar(actuales);
  }

  async function descartarViejas() {
    const ok = await confirmar({
      titulo: '¿Descartar las solicitudes sin atender?',
      texto: `Las que sigan en Nueva y tengan más de ${DIAS_DESCARTE} días pasan a Descartada.`,
      confirmar: 'Sí, descartar',
    });
    if (!ok) return;
    try {
      const r = await llamarApi('/api/solicitudes/descartar-viejas', { metodo: 'POST', cuerpo: { dias: DIAS_DESCARTE } });
      toast(`${contar(r.descartadas, 'solicitud descartada', 'solicitudes descartadas')}.`);
      cargar();
    } catch (excepcion) {
      avisarError(excepcion.message);
    }
  }

  const columnas = [
    { title: 'Recibida', dataIndex: 'creado_en', render: fechaHora, width: 150 },
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'Institución', dataIndex: 'institucion', render: (v) => v || '—' },
    { title: 'Correo', dataIndex: 'correo' },
    { title: 'Plan', dataIndex: 'plan_titulo', render: (v) => v || '—' },
    {
      title: 'Estado',
      dataIndex: 'estado',
      width: 120,
      render: (valor) => <Estado tono={TONO_ESTADO[valor]}>{textoEstado(valor)}</Estado>,
    },
    {
      title: '',
      width: 90,
      render: (_, fila) => <Button size="small" onClick={() => setAbierta(fila)}>Ver</Button>,
    },
  ];

  if (!datos) return <p className="mensaje-centrado">Cargando…</p>;

  return (
    <>
      <header className="encabezado-pagina">
        <h2>Solicitudes de contacto</h2>
      </header>

      <section className="panel">
      <div className="barra-filtros">
        <label>Estado
          <Select
            value={filtros.estado}
            onChange={(valor) => cambiar('estado', valor)}
            options={[{ value: 'todas', label: 'Todos los estados' },
              ...ESTADOS_SOLICITUD.map((e) => ({ value: e.valor, label: e.texto }))]}
          />
        </label>
        <label className="ancho">Buscar
          <Input.Search
            placeholder="Nombre, correo o institución"
            allowClear
            onSearch={(valor) => cambiar('texto', valor)}
          />
        </label>
        <Button onClick={descartarViejas}>{`Descartar las que llevan ${DIAS_DESCARTE} días`}</Button>
      </div>

      {datos.length > 0 ? (
        <div className="tabla-envoltura">
          <Table rowKey="id" columns={columnas} dataSource={datos} size="small" pagination={{ pageSize: 20 }} />
        </div>
      ) : (
        <div className="vacio">
          <p>Ninguna solicitud coincide con lo que buscaste.</p>
        </div>
      )}

      {abierta && (
        <DetalleSolicitud
          solicitud={abierta}
          alCerrar={() => setAbierta(null)}
          alGuardar={() => { setAbierta(null); cargar(); }}
        />
      )}
      </section>
    </>
  );
}
