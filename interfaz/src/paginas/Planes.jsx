import { useEffect, useState } from 'react';
import { Button, Table } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { confirmar, avisarError, toast } from '../servicios/avisos.js';
import { guaranies, legible, contar } from '../servicios/formato.js';
import ImagenPlan from '../componentes/ImagenPlan.jsx';
import FormularioPlan from '../componentes/FormularioPlan.jsx';

const FORMULARIO_VACIO = {
  titulo: '', descripcion: '', precio: 250000, meses: 1,
  incluye: '', maxUsuarios: null, modulos: [], activo: true,
};

export default function Planes() {
  const [planes, setPlanes] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  async function cargar() {
    try { setPlanes(await llamarApi('/api/planes/todos')); } catch (e) { avisarError(e.message); }
  }
  useEffect(() => {
    cargar();
    llamarApi('/api/planes/modulos').then(setModulos).catch(() => setModulos([]));
  }, []);

  function abrirAlta() {
    setError(null);
    setEditando(null);
    setFormulario(FORMULARIO_VACIO);
    setAbierto(true);
  }

  function abrirEdicion(plan) {
    setError(null);
    setEditando(plan);
    setFormulario({
      titulo: plan.texto, descripcion: plan.descripcion ?? '', precio: plan.precio, meses: plan.meses,
      incluye: plan.incluye.join('\n'), maxUsuarios: plan.maxUsuarios, modulos: plan.modulos, activo: plan.activo,
    });
    setAbierto(true);
  }

  async function guardar(evento) {
    evento.preventDefault();
    setError(null);
    if (!formulario.titulo.trim()) return setError('El plan necesita un título.');
    setCargando(true);
    const cuerpo = { ...formulario, incluye: formulario.incluye.split('\n').map((l) => l.trim()).filter(Boolean) };
    try {
      if (editando) await llamarApi(`/api/planes/${editando.id}`, { metodo: 'PUT', cuerpo });
      else await llamarApi('/api/planes', { metodo: 'POST', cuerpo });
      setAbierto(false);
      await cargar();
      toast(editando ? 'Plan actualizado.' : 'Plan creado.');
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setCargando(false);
    }
  }

  async function apagar(plan) {
    const ok = await confirmar({
      titulo: '¿Dar de baja el plan?',
      texto: `"${plan.texto}" deja de ofrecerse. Las suscripciones que ya lo contrataron siguen valiendo.`,
      confirmar: 'Sí, dar de baja',
      peligro: true,
    });
    if (!ok) return;
    try {
      await llamarApi(`/api/planes/${plan.id}`, { metodo: 'DELETE' });
      await cargar();
      toast('Plan dado de baja.');
    } catch (excepcion) { avisarError(excepcion.message); }
  }

  const columnas = [
    { title: 'Plan', dataIndex: 'texto', key: 'texto' },
    { title: 'Precio', dataIndex: 'precio', key: 'precio', render: (valor) => guaranies(valor) },
    { title: 'Duración', dataIndex: 'meses', key: 'meses', render: (valor) => contar(valor, 'mes', 'meses') },
    {
      title: 'Usuarios internos', dataIndex: 'maxUsuarios', key: 'maxUsuarios',
      render: (valor) => (valor === null ? 'Sin tope' : `Hasta ${valor}`),
    },
    {
      title: 'Módulos que habilita', dataIndex: 'modulos', key: 'modulos',
      render: (valor) => (valor.length === 0 ? 'Todos' : valor.map(legible).join(', ')),
    },
    { title: 'Imagen', key: 'imagen', render: (_, plan) => <ImagenPlan plan={plan} alSubir={cargar} /> },
    {
      title: 'Estado', dataIndex: 'activo', key: 'activo',
      render: (valor) => <span className={`estado estado-${valor ? 'exitoso' : 'rechazado'}`}>{valor ? 'Se ofrece' : 'De baja'}</span>,
    },
    {
      title: <span className="oculto-visual">Acciones</span>,
      key: 'acciones',
      render: (_, plan) => (
        <div className="acciones">
          <Button size="small" onClick={() => abrirEdicion(plan)}>Editar</Button>
          {plan.activo && <Button size="small" danger onClick={() => apagar(plan)}>Dar de baja</Button>}
        </div>
      ),
    },
  ];

  return (
    <>
      <header className="encabezado-pagina">
        <h2>Planes de suscripción</h2>
        <Button type="primary" className="boton-crear" onClick={abrirAlta}>+ Nuevo plan</Button>
      </header>

      <section className="panel">
        <div className="tabla-envoltura">
          <Table columns={columnas} dataSource={planes} rowKey="id" size="small" pagination={false} />
        </div>
      </section>

      <FormularioPlan
        abierto={abierto}
        editando={editando}
        modulos={modulos}
        formulario={formulario}
        error={error}
        cargando={cargando}
        alCambiar={setFormulario}
        alEnviar={guardar}
        alCerrar={() => setAbierto(false)}
      />
    </>
  );
}
