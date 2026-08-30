import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Button, Table } from 'antd';
import { descargarArchivo } from '../servicios/descargas.js';
import { toast, avisarError } from '../servicios/avisos.js';

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
  const { modulos = [], bloqueados = [] } = useOutletContext() ?? {};
  const [bajando, setBajando] = useState(null);

  async function descargar(tabla, formato) {
    setBajando(`${tabla}-${formato}`);
    try {
      await descargarArchivo(
        `/api/reportes/exportar/${tabla}?formato=${formato}`,
        `${tabla}-${new Date().toISOString().slice(0, 10)}.${formato}`
      );
      toast('Reporte descargado.');
    } catch (excepcion) {
      avisarError(excepcion.message);
    } finally {
      setBajando(null);
    }
  }

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
              aria-label={`Descargar ${tabla.titulo} en ${formato.texto}`}
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

      <section className="panel">
        <h3>Descargar información</h3>
        <div className="tabla-envoltura">
          <Table
            columns={columnasDescargas}
            dataSource={TABLAS.filter((tabla) => modulos.includes(tabla.modulo) && !bloqueados.includes(tabla.modulo))}
            rowKey="clave"
            size="small"
            pagination={false}
          />
        </div>
      </section>
    </>
  );
}
