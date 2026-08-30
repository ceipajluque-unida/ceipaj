import { useEffect, useState } from 'react';
import { Button, Table, Tag } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { avisarError, toast, confirmar, pedirTexto } from '../servicios/avisos.js';
import { fecha, guaranies, legible } from '../servicios/formato.js';

const COLOR = { activa: 'green', vencida: 'default', cancelada: 'red' };

// el proveedor ve los períodos contratados de una institución y puede cortarlos.
// son dos cosas distintas y por eso hay dos botones.
export default function SuscripcionInstitucion({ institucionId, refresco }) {
  const [filas, setFilas] = useState(null);

  async function cargar() {
    try {
      setFilas(await llamarApi(`/api/instituciones/${institucionId}/suscripciones`));
    } catch (excepcion) {
      avisarError(excepcion.message);
      setFilas([]);
    }
  }
  useEffect(() => { cargar(); }, [institucionId, refresco]);

  async function cancelarRenovacion(fila) {
    const ok = await confirmar({
      titulo: 'Cancelar la renovación?',
      texto: `El período contratado sigue hasta el ${fecha(fila.fecha_fin)} y después no se renueva. `
        + 'La institución no pierde nada hoy.',
      confirmar: 'Sí, cancelar la renovación',
    });
    if (!ok) return;
    try {
      await llamarApi(`/api/instituciones/${institucionId}/suscripciones/${fila.id}/cancelar`, { metodo: 'POST' });
      toast('La suscripción no se va a renovar.');
      cargar();
    } catch (excepcion) {
      avisarError(excepcion.message);
    }
  }

  async function darDeBaja(fila) {
    const motivo = await pedirTexto({
      titulo: 'Dar de baja ahora?',
      texto: 'El período se corta en el acto y la institución cae al plan Básico enseguida. '
        + 'Escribí el motivo: queda en la auditoría.',
      marcador: 'Por ejemplo: falta de pago',
      confirmar: 'Dar de baja',
    });
    if (!motivo) return;
    try {
      await llamarApi(`/api/instituciones/${institucionId}/suscripciones/${fila.id}/dar-de-baja`, {
        metodo: 'POST', cuerpo: { motivo },
      });
      toast('Suscripción dada de baja.');
      cargar();
    } catch (excepcion) {
      avisarError(excepcion.message);
    }
  }

  const columnas = [
    { title: 'Plan', dataIndex: 'plan', render: (v) => legible(v) },
    { title: 'Desde', dataIndex: 'fecha_inicio', render: fecha, width: 110 },
    { title: 'Hasta', dataIndex: 'fecha_fin', render: fecha, width: 110 },
    { title: 'Monto', dataIndex: 'monto', render: guaranies, align: 'right', width: 120 },
    {
      title: 'Estado',
      dataIndex: 'estado',
      width: 110,
      render: (valor) => <Tag color={COLOR[valor]}>{legible(valor)}</Tag>,
    },
    {
      title: '',
      width: 220,
      render: (_, fila) => (fila.estado !== 'activa' ? null : (
        <div className="acciones">
          <Button size="small" onClick={() => cancelarRenovacion(fila)}>No renovar</Button>
          <Button size="small" danger onClick={() => darDeBaja(fila)}>Dar de baja</Button>
        </div>
      )),
    },
  ];

  if (!filas) return <p className="nota">Cargando la suscripción…</p>;

  return (
    <section className="bloque-institucion">
      <h4>Suscripción</h4>
      {filas.length === 0
        ? <p className="nota">Esta institución todavía no contrató ningún plan.</p>
        : <Table rowKey="id" columns={columnas} dataSource={filas} size="small" pagination={false} />}
    </section>
  );
}
