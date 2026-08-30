import { useEffect, useState } from 'react';
import { Button, Table } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { descargarArchivo } from '../servicios/descargas.js';
import { avisarError, toast } from '../servicios/avisos.js';
import { contar, fechaHora, guaranies } from '../servicios/formato.js';
import CifrasPlataforma from '../componentes/CifrasPlataforma.jsx';
import InstitucionesPlataforma from '../componentes/InstitucionesPlataforma.jsx';

const FORMATOS = [
  { clave: 'xlsx', texto: 'Excel' },
  { clave: 'pdf', texto: 'PDF' },
  { clave: 'csv', texto: 'CSV' },
];

const REPORTES = [
  { clave: 'planes', titulo: 'Ingresos por plan' },
  { clave: 'instituciones', titulo: 'Instituciones' },
  { clave: 'meses', titulo: 'Recaudación por mes' },
];

export default function Plataforma() {
  const [datos, setDatos] = useState(null);
  const [momento, setMomento] = useState(null);
  const [bajando, setBajando] = useState(null);
  const [seccion, setSeccion] = useState(0);

  useEffect(() => {
    llamarApi('/api/plataforma')
      .then((r) => { setDatos(r); setMomento(new Date().toISOString()); })
      .catch((e) => avisarError(e.message));
  }, []);

  async function descargar(reporte, formato) {
    setBajando(`${reporte}-${formato}`);
    try {
      await descargarArchivo(
        `/api/plataforma/exportar/${reporte}?formato=${formato}`,
        `plataforma-${reporte}-${new Date().toISOString().slice(0, 10)}.${formato}`
      );
      toast('Reporte descargado.');
    } catch (excepcion) {
      avisarError(excepcion.message);
    } finally {
      setBajando(null);
    }
  }

  if (!datos) return <p className="mensaje-centrado">Cargando…</p>;
  const { resumen, planes, instituciones, meses } = datos;

  const columnasPlan = [
    { title: 'Plan', dataIndex: 'titulo' },
    { title: 'Precio por mes', dataIndex: 'precio', render: guaranies, align: 'right', width: 140 },
    { title: 'Instituciones que lo tienen hoy', dataIndex: 'institucionesVigentes', align: 'right', width: 200 },
    { title: 'Ingreso mensual aproximado', dataIndex: 'ingresoMensual', render: guaranies, align: 'right', width: 190 },
    { title: 'Períodos vendidos', dataIndex: 'periodosVendidos', align: 'right', width: 145 },
    { title: 'Cobrado en total', dataIndex: 'recaudado', render: guaranies, align: 'right', width: 150 },
    {
      title: 'Del total cobrado',
      dataIndex: 'participacion',
      align: 'right',
      width: 145,
      render: (valor) => (valor > 0 ? `${String(valor).replace('.', ',')} %` : <span className="nota">—</span>),
    },
  ];

  const columnasMes = [
    { title: 'Mes', dataIndex: 'mes', width: 130 },
    { title: 'Pagos acreditados', dataIndex: 'pagos', align: 'right', width: 165 },
    { title: 'Instituciones que pagaron', dataIndex: 'instituciones', align: 'right', width: 205 },
    { title: 'Recaudado', dataIndex: 'recaudado', render: guaranies, align: 'right' },
  ];

  const secciones = [
    { key: 'resumen', label: 'Resumen general', children: <CifrasPlataforma resumen={resumen} /> },
    {
      key: 'planes',
      label: 'Ingresos por plan',
      children: (
        <div className="tabla-envoltura">
          <Table rowKey="clave" columns={columnasPlan} dataSource={planes} size="small" pagination={false} />
        </div>
      ),
    },
    {
      key: 'instituciones',
      label: `Detalle por institución (${instituciones.length})`,
      children: <InstitucionesPlataforma instituciones={instituciones} />,
    },
    {
      key: 'meses',
      label: 'Recaudación mensual',
      children: meses.length === 0
        ? <p className="nota">Todavía no hay ningún pago acreditado con fecha.</p>
        : (
          <div className="tabla-envoltura">
            <Table rowKey="mes" columns={columnasMes} dataSource={meses} size="small" pagination={false} />
          </div>
        ),
    },
    {
      key: 'reportes',
      label: 'Reportes',
      children: (
        <>
          <div className="lista-reportes">
            {REPORTES.map((reporte) => (
              <article className="reporte" key={reporte.clave}>
                <div>
                  <strong>{reporte.titulo}</strong>
                </div>
                <div className="acciones">
                  {FORMATOS.map((formato) => (
                    <Button
                      key={formato.clave}
                      size="small"
                      loading={bajando === `${reporte.clave}-${formato.clave}`}
                      onClick={() => descargar(reporte.clave, formato.clave)}
                    >
                      {formato.texto}
                    </Button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      ),
    },
  ];

  return (
    <>
      <header className="encabezado-pagina">
        <h2>Estadísticas de la plataforma</h2>
        <span className="nota">Consultado el {fechaHora(momento)}</span>
      </header>

      <div className="config">
        <nav className="config-secciones" aria-label="Secciones de las estadísticas">
          {secciones.map((item, indice) => (
            <Button
              key={item.key}
              type="text"
              className={indice === seccion ? 'activa' : ''}
              onClick={() => setSeccion(indice)}
            >
              {item.label}
            </Button>
          ))}
        </nav>

        <section className="panel">
          <h3>{secciones[seccion].label}</h3>
          {secciones[seccion].children}
        </section>
      </div>
    </>
  );
}
