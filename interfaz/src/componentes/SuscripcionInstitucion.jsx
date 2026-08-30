import { useEffect, useState } from 'react';
import { Button, Table, Tag } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { avisarError, toast, confirmar, pedirTexto } from '../servicios/avisos.js';
import { fecha, guaranies, legible } from '../servicios/formato.js';

// varios períodos pueden convivir: uno rige, otro puede estar programado para
// después y los demás ya se cerraron. decirles a todos "Activa" confunde, así
// que cada uno informa su situación real.
const SITUACION = {
  en_curso: { texto: 'En curso', color: 'green', nota: 'es el plan que rige hoy' },
  programada: { texto: 'Programada', color: 'blue', nota: 'empieza cuando termine el anterior' },
  solapada: { texto: 'Solapada', color: 'gold', nota: 'se pisa con otro que llega más lejos' },
  vencida: { texto: 'Vencida', color: 'default', nota: 'llegó a su fecha de fin' },
  dada_de_baja: { texto: 'Dada de baja', color: 'red', nota: 'la cortó el proveedor antes de tiempo' },
  reemplazada: { texto: 'Reemplazada', color: 'purple', nota: 'se cerró al contratarse otro plan' },
};

const ABIERTAS = ['en_curso', 'programada', 'solapada'];

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
      titulo: `Dar de baja el plan ${legible(fila.plan)}?`,
      texto: `El período se cierra hoy, aunque estaba pago hasta el ${fecha(fila.fecha_fin)}. `
        + 'La institución pasa al plan Básico en el momento y sus usuarios lo notan enseguida. '
        + 'Escribí por qué la das de baja: queda registrado con tu nombre.',
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
    { title: 'Plan', dataIndex: 'plan', render: (valor) => legible(valor) },
    { title: 'Desde', dataIndex: 'fecha_inicio', render: fecha, width: 110 },
    { title: 'Hasta', dataIndex: 'fecha_fin', render: fecha, width: 110 },
    { title: 'Monto', dataIndex: 'monto', render: guaranies, align: 'right', width: 120 },
    {
      title: 'Situación',
      dataIndex: 'situacion',
      width: 215,
      render: (valor) => {
        const s = SITUACION[valor] ?? { texto: legible(valor), color: 'default', nota: '' };
        return (
          <span>
            <Tag color={s.color}>{s.texto}</Tag>
            <br />
            <small className="nota">{s.nota}</small>
          </span>
        );
      },
    },
    {
      title: '',
      width: 220,
      render: (_, fila) => (ABIERTAS.includes(fila.situacion) ? (
        <div className="acciones">
          <Button size="small" onClick={() => cancelarRenovacion(fila)}>No renovar</Button>
          <Button size="small" danger onClick={() => darDeBaja(fila)}>Dar de baja</Button>
        </div>
      ) : null),
    },
  ];

  if (!filas) return <p className="nota">Cargando la suscripción…</p>;

  return (filas.length === 0
    ? <p className="nota">Esta institución todavía no contrató ningún plan.</p>
    : <Table rowKey="id" columns={columnas} dataSource={filas} size="small" pagination={{ pageSize: 10 }} />);
}
