import { useEffect, useState } from 'react';
import { Button } from 'antd';
import { llamarApi, usuarioActual } from '../servicios/api.js';
import { confirmar, avisarError, toast, mostrarClave } from '../servicios/avisos.js';
import FormularioAliado from '../componentes/FormularioAliado.jsx';
import TablaAliados from '../componentes/TablaAliados.jsx';
import IndicadoresAliados from '../componentes/IndicadoresAliados.jsx';
import FiltrosAliados, { FILTROS_VACIOS, filtrarAliados } from '../componentes/FiltrosAliados.jsx';

const FORMULARIO_VACIO = { nombre: '', correo: '', institucion: '', cargo: '', telefono: '' };

export default function Aliados() {
  const soloLectura = usuarioActual()?.rol === 'direccion';
  const [aliados, setAliados] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  async function cargar() {
    try { setAliados(await llamarApi('/api/aliados')); } catch (e) { avisarError(e.message); }
  }
  useEffect(() => {
    cargar();
    llamarApi('/api/aliados/opciones').then((o) => setCargos(o.cargos)).catch(() => setCargos([]));
  }, []);

  function abrirAlta() {
    setError(null);
    setEditando(null);
    setFormulario(FORMULARIO_VACIO);
    setAbierto(true);
  }

  function abrirEdicion(aliado) {
    setError(null);
    setEditando(aliado);
    setFormulario({
      nombre: aliado.nombre, correo: aliado.correo, institucion: aliado.institucion,
      cargo: aliado.cargo ?? '', telefono: aliado.telefono ?? '',
    });
    setAbierto(true);
  }

  async function guardar(evento) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      if (editando) {
        await llamarApi(`/api/aliados/${editando.id}`, { metodo: 'PUT', cuerpo: formulario });
        setAbierto(false);
        await cargar();
        toast('Datos del aliado actualizados.');
      } else {
        const respuesta = await llamarApi('/api/aliados', { metodo: 'POST', cuerpo: formulario });
        setAbierto(false);
        await cargar();
        if (respuesta.claveTemporal) {
          mostrarClave(respuesta.claveTemporal, 'No pudimos enviarle el correo a', respuesta.aliado.correo);
        } else {
          toast('Aliado creado. Ya le enviamos sus datos de acceso por correo.');
        }
      }
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setCargando(false);
    }
  }

  async function reenviarAcceso(aliado) {
    const ok = await confirmar({
      titulo: 'Reenviar el acceso?',
      texto: `Se genera una clave nueva para ${aliado.nombre} y la anterior deja de servir.`,
      confirmar: 'Sí, reenviar',
    });
    if (!ok) return;
    try {
      const respuesta = await llamarApi(`/api/aliados/${aliado.id}/reenviar-acceso`, { metodo: 'PUT' });
      if (respuesta.claveTemporal) {
        mostrarClave(respuesta.claveTemporal, 'No pudimos enviarle el correo a', aliado.correo);
      } else {
        toast('Listo, le reenviamos el acceso por correo.');
      }
    } catch (excepcion) { avisarError(excepcion.message); }
  }

  async function cambiarActivo(aliado) {
    const desactivar = aliado.activo;
    const ok = await confirmar({
      titulo: desactivar ? 'Desactivar aliado?' : 'Activar aliado?',
      texto: desactivar ? `${aliado.nombre} no podrá ingresar a su portal hasta reactivarlo.` : `${aliado.nombre} podrá ingresar de nuevo a su portal.`,
      confirmar: desactivar ? 'Sí, desactivar' : 'Sí, activar',
      peligro: desactivar,
    });
    if (!ok) return;
    try {
      await llamarApi(`/api/aliados/${aliado.id}/activo`, { metodo: 'PUT', cuerpo: { activo: !aliado.activo } });
      await cargar();
      toast(desactivar ? 'Aliado desactivado.' : 'Aliado activado.');
    } catch (excepcion) { avisarError(excepcion.message); }
  }

  const visibles = filtrarAliados(aliados, filtros);

  return (
    <>
      <header className="encabezado-pagina">
        <h2>Aliados institucionales</h2>
        {!soloLectura && <Button type="primary" className="boton-crear" onClick={abrirAlta}>+ Nuevo aliado</Button>}
      </header>

      <IndicadoresAliados aliados={aliados} />

      <section className="panel">
        <FiltrosAliados filtros={filtros} alCambiar={setFiltros} />
        <TablaAliados
          aliados={visibles}
          total={aliados.length}
          soloLectura={soloLectura}
          alEditar={abrirEdicion}
          alReenviarAcceso={reenviarAcceso}
          alCambiarActivo={cambiarActivo}
        />
      </section>

      <FormularioAliado
        abierto={abierto}
        formulario={formulario}
        alCambiar={setFormulario}
        cargos={cargos}
        editando={editando}
        cargando={cargando}
        error={error}
        alEnviar={guardar}
        alCerrar={() => setAbierto(false)}
      />
    </>
  );
}
