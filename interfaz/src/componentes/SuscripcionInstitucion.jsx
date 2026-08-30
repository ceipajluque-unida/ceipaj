import { useEffect, useState } from 'react';
import { Button, Table } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { avisarError, toast, confirmar, pedirTexto } from '../servicios/avisos.js';
import { fecha, guaranies, legible } from '../servicios/formato.js';
import Estado from './Estado.jsx';
import MotivoBaja from './MotivoBaja.jsx';
import { situacionDe, ABIERTAS } from '../servicios/situaciones.js';

export default function SuscripcionInstitucion({ institucionId, refresco }) {
  const [filas, setFilas] = useState(null);
  const [verBaja, setVerBaja] = useState(null);

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
      titulo: '¿Cancelar la renovación?',
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
      titulo: `¿Dar de baja el plan ${legible(fila.plan)}?`,
      texto: `El período se cierra hoy, aunque estaba pago hasta el ${fecha(fila.fecha_fin)}. `
        + 'La institución pasa al plan Free en el momento: sus usuarios van a poder consultar lo que ya '
        + 'está cargado, pero no trabajar. '
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
      render: (valor, fila) => {
        const s = situacionDe(valor);
        return <Estado tono={s.tono}>{s.texto}</Estado>;
      },
    },
    {
      title: '',
      width: 220,
      render: (_, fila) => {
        const hayQueContar = fila.situacion === 'dada_de_baja';
        return (
          <div className="acciones">
            {hayQueContar && (
              <Button size="small" onClick={() => setVerBaja(fila)}>Ver motivo</Button>
            )}
            {ABIERTAS.includes(fila.situacion) && (
              <>
                {!fila.cancelada_en && (
                  <Button size="small" onClick={() => cancelarRenovacion(fila)}>No renovar</Button>
                )}
                <Button size="small" danger onClick={() => darDeBaja(fila)}>Dar de baja</Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  if (!filas) return <p className="nota">Cargando la suscripción…</p>;

  if (filas.length === 0) return <p className="nota">Esta institución todavía no contrató ningún plan.</p>;

  return (
    <>
      <div className="tabla-envoltura">
        <Table rowKey="id" columns={columnas} dataSource={filas} size="small" pagination={{ pageSize: 10 }} />
      </div>
      {verBaja && <MotivoBaja suscripcion={verBaja} alCerrar={() => setVerBaja(null)} />}
    </>
  );
}
