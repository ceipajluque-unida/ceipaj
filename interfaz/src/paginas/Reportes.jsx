// reportes gerenciales con rendimiento por aliado y exportación a excel, pdf o csv
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Button, Table } from 'antd';
import { llamarApi, tokenActual } from '../servicios/api.js';
import { toast, avisarError } from '../servicios/avisos.js';

// tablas que se pueden bajar. cada una declara de qué módulo son sus datos, para
// ofrecer solo las que el rol puede pedir de verdad: antes la lista era fija y al
// comercial le mostraba nueve botones que el backend le contestaba con 403.
const TABLAS = [
  { clave: 'leads', titulo: 'Interesados', modulo: 'leads' },
  { clave: 'interacciones', titulo: 'Interacciones', modulo: 'leads' },
  { clave: 'comisiones', titulo: 'Comisiones', modulo: 'comisiones' },
  { clave: 'pagos', titulo: 'Pagos', modulo: 'pagos' },
  { clave: 'suscripciones', titulo: 'Suscripciones', modulo: 'suscripcion' },
  { clave: 'auditoria', titulo: 'Auditoría', modulo: 'auditoria' },
];

const FORMATOS = [
  { clave: 'xlsx', texto: 'Excel' },
  { clave: 'pdf', texto: 'PDF' },
  { clave: 'csv', texto: 'CSV' },
];

export default function Reportes() {
  // los módulos del rol llegan del diseño, que ya los pidió al entrar
  const { modulos = [] } = useOutletContext() ?? {};
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [bajando, setBajando] = useState(null); // qué archivo se está generando

  useEffect(() => {
    llamarApi('/api/reportes/indicadores')
      .then(setDatos)
      .catch((excepcion) => setError(excepcion.message));
  }, []);

  async function descargar(tabla, formato) {
    setBajando(`${tabla}-${formato}`);
    try {
      // se descarga a mano porque el token tiene que ir en el encabezado
      const respuesta = await fetch(`/api/reportes/exportar/${tabla}?formato=${formato}`, {
        headers: { Authorization: `Bearer ${tokenActual()}` },
      });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => ({}));
        throw new Error(cuerpo.error ?? 'No se pudo exportar.');
      }
      const url = URL.createObjectURL(await respuesta.blob());
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `${tabla}-${new Date().toISOString().slice(0, 10)}.${formato}`;
      enlace.click();
      URL.revokeObjectURL(url);
      toast('Listo, fijate en tus descargas.');
    } catch (excepcion) {
      avisarError(excepcion.message);
    } finally {
      setBajando(null);
    }
  }

  if (!datos) return error ? <p className="error">{error}</p> : <p className="mensaje-centrado">Cargando…</p>;

  const columnasAliados = [
    { title: 'Aliado', dataIndex: 'aliado', key: 'aliado' },
    { title: 'Institución', dataIndex: 'institucion', key: 'institucion' },
    { title: 'Interesados', dataIndex: 'leads', key: 'leads' },
    { title: 'Matriculados', dataIndex: 'convertidos', key: 'convertidos' },
    { title: 'Puntos', dataIndex: 'puntos', key: 'puntos', render: (valor) => <strong>{valor}</strong> },
  ];

  const columnasDescargas = [
    { title: 'Reporte', dataIndex: 'titulo', key: 'titulo', render: (valor) => <strong>{valor}</strong> },
    {
      title: 'Formato',
      key: 'formato',
      render: (_, tabla) => (
        <div className="acciones">
          {FORMATOS.map((formato) => (
            <Button
              key={formato.clave}
              size="small"
              aria-label={`Bajar ${tabla.titulo} en ${formato.texto}`}
              disabled={bajando !== null}
              onClick={() => descargar(tabla.clave, formato.clave)}
            >
              {bajando === `${tabla.clave}-${formato.clave}` ? 'Generando…' : formato.texto}
            </Button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <>
      <header className="encabezado-pagina"><h2>Reportes</h2></header>

      <section className="cuadricula sep-abajo">
        <article className="indicador">
          <h3>Interesados</h3>
          <p className="cifra">{datos.totalLeads}</p>
          <p className="nota">Registrados en total</p>
        </article>
        <article className="indicador">
          <h3>Matriculados</h3>
          <p className="cifra">{datos.conversiones}</p>
        </article>
        <article className="indicador">
          <h3>Tasa de conversión</h3>
          <p className="cifra">{datos.tasaConversion}%</p>
        </article>
      </section>

      <section className="panel">
        <h3>Rendimiento por aliado</h3>
        {datos.rendimientoAliados.length > 0 && (
          <div className="tabla-envoltura">
            <Table
              columns={columnasAliados}
              dataSource={datos.rendimientoAliados}
              rowKey="aliado_id"
              size="small"
              pagination={false}
            />
          </div>
        )}
        {datos.rendimientoAliados.length === 0 && (
          <div className="vacio">
            <p>Todavía no hay aliados cargados.</p>
          </div>
        )}
      </section>

      <section className="panel">
        <h3>Bajar información</h3>
        <div className="tabla-envoltura">
          <Table
            columns={columnasDescargas}
            dataSource={TABLAS.filter((tabla) => modulos.includes(tabla.modulo))}
            rowKey="clave"
            size="small"
            pagination={false}
          />
        </div>
      </section>
    </>
  );
}
