import { useEffect, useState } from 'react';
import { Button, Table } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { avisarExito, avisarError, toast, confirmar } from '../servicios/avisos.js';
import { descargarArchivo } from '../servicios/descargas.js';
import { fecha, contar } from '../servicios/formato.js';
import Modal from '../componentes/Modal.jsx';

export default function Conversion() {
  const [matriculados, setMatriculados] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [importando, setImportando] = useState(false);

  async function cargarMatriculados() {
    try { setMatriculados(await llamarApi('/api/conversion/matriculados')); } catch (e) { avisarError(e.message); }
  }
  useEffect(() => { cargarMatriculados(); }, []);

  async function sincronizar() {
    const ok = await confirmar({
      titulo: '¿Sincronizar con el sistema académico?',
      texto: 'Los interesados que coincidan por cédula pasan a Matriculado y, si los trajo un aliado, se le genera la comisión.',
      confirmar: 'Sí, sincronizar',
    });
    if (!ok) return;
    setSincronizando(true);
    try {
      const respuesta = await llamarApi('/api/conversion/sincronizar', { metodo: 'POST' });
      const convertidos = respuesta.convertidos;
      const nombres = convertidos.map((convertido) => convertido.nombre).join(', ');
      const enAcademico = contar(respuesta.enAcademico, 'matriculado', 'matriculados');
      await avisarExito(
        convertidos.length === 0
          ? `El académico informa ${enAcademico} y ninguno coincide con interesados pendientes.`
          : convertidos.length === 1
            ? `Ya quedó matriculado: ${nombres}.`
            : `Quedaron matriculados ${convertidos.length} interesados: ${nombres}.`,
        'Sincronización lista'
      );
      await cargarMatriculados();
    } catch (excepcion) {
      avisarError(excepcion.message);
    } finally {
      setSincronizando(false);
    }
  }

  async function bajarEjemplo() {
    try {
      await descargarArchivo('/api/conversion/ejemplo.csv', 'matriculados-ejemplo.csv');
    } catch (excepcion) {
      avisarError(excepcion.message);
    }
  }

  async function importar(evento) {
    evento.preventDefault();
    if (!archivo) return setError('Elegí un archivo CSV.');
    setError(null);
    setImportando(true);
    try {
      const contenido = await archivo.text();
      const respuesta = await llamarApi('/api/conversion/importar', { metodo: 'POST', cuerpo: { contenido } });
      setResumen(respuesta);
      setAbierto(false);
      setArchivo(null);
      await cargarMatriculados();
      toast(respuesta.guardadas === 1 ? 'Se importó 1 matriculado.' : `Se importaron ${respuesta.guardadas} matriculados.`);
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setImportando(false);
    }
  }

  function abrirImportacion() {
    setError(null);
    setAbierto(true);
  }

  const columnas = [
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    { title: 'Cédula', dataIndex: 'cedula', key: 'cedula' },
    {
      title: 'Fecha de inscripción',
      dataIndex: 'fecha_inscripcion',
      key: 'fecha_inscripcion',
      render: (valor) => <span className="sin-cortar">{fecha(valor)}</span>,
    },
  ];

  return (
    <>
      <header className="encabezado-pagina">
        <h2>Conversión</h2>
        <div className="acciones">
          <Button onClick={abrirImportacion}>Importar planilla</Button>
          <Button type="primary" onClick={sincronizar} disabled={sincronizando}>
            {sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}
          </Button>
        </div>
      </header>

      {resumen && (
        <section className="panel">
          <h3>Última importación</h3>
          <p className="exito">
            {contar(resumen.leidas, 'fila leída', 'filas leídas')} y {contar(resumen.guardadas, 'guardada', 'guardadas')}.
          </p>
          {resumen.rechazadas.length > 0 && (
            <>
              <p className="ayuda">
                {resumen.rechazadas.length === 1 ? 'Una fila quedó afuera:' : `${resumen.rechazadas.length} filas quedaron afuera:`}
              </p>
              <ul className="lista-alertas">
                {resumen.rechazadas.map((fila) => (
                  <li key={fila.linea}><span className="etiqueta">Fila {fila.linea}</span> {fila.motivo}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <section className="panel">
        <h3>Matriculados según el sistema académico</h3>
        {matriculados === null && <p className="nota">Cargando…</p>}
        {matriculados?.length > 0 && (
          <>
            <p className="nota">{contar(matriculados.length, 'matriculado informado', 'matriculados informados')}.</p>
            <div className="tabla-envoltura">
              <Table columns={columnas} dataSource={matriculados} rowKey="cedula" size="small" pagination={false} />
            </div>
          </>
        )}
        {matriculados?.length === 0 && (
          <div className="vacio">
            <p>El sistema académico todavía no informa matriculados.</p>
            <Button onClick={abrirImportacion}>Importar planilla</Button>
          </div>
        )}
      </section>

      <Modal abierto={abierto} titulo="Importar matriculados" alCerrar={() => setAbierto(false)} ancho={520}>
        <form onSubmit={importar}>
          <label>Planilla CSV
            <input type="file" accept=".csv,text/csv" onChange={(evento) => setArchivo(evento.target.files[0] ?? null)} required />
          </label>
          <p className="ayuda">
            Columnas: <strong>cedula;nombre;fecha_inscripcion</strong>{' '}
            <Button type="link" onClick={bajarEjemplo}>Bajar planilla de ejemplo</Button>
          </p>
          {error && <p className="error">{error}</p>}
          <div className="acciones">
            <Button type="primary" htmlType="submit" disabled={importando}>{importando ? 'Importando…' : 'Importar'}</Button>
            <Button onClick={() => setAbierto(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
