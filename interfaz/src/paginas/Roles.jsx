import { useEffect, useState } from 'react';
import { Button, Checkbox, Input, Table } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { avisarError, toast, confirmar } from '../servicios/avisos.js';
import { nombreModulo } from '../servicios/formato.js';
import { olvidarRoles } from '../servicios/roles.js';
import Modal from '../componentes/Modal.jsx';

const VACIO = { clave: '', titulo: '', modulos: [] };

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formulario, setFormulario] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function cargar() {
    setCargando(true);
    try {
      const datos = await llamarApi('/api/roles');
      setRoles(datos.roles);
      setModulos(datos.modulos);
    } catch (excepcion) {
      avisarError(excepcion.message);
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => { cargar(); }, []);

  function abrirNuevo() {
    setEditando(null);
    setFormulario(VACIO);
    setError('');
    setAbierto(true);
  }

  function abrirEdicion(rol) {
    setEditando(rol);
    setFormulario({ clave: rol.clave, titulo: rol.titulo, modulos: rol.modulos });
    setError('');
    setAbierto(true);
  }

  async function guardar(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError('');
    try {
      if (editando) {
        await llamarApi(`/api/roles/${editando.clave}`, {
          metodo: 'PUT',
          cuerpo: { titulo: formulario.titulo, modulos: formulario.modulos },
        });
        toast('Rol actualizado.');
      } else {
        await llamarApi('/api/roles', { metodo: 'POST', cuerpo: formulario });
        toast('Rol creado.');
      }
      olvidarRoles();
      setAbierto(false);
      await cargar();
    } catch (excepcion) {
      setError(excepcion.message);
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(rol) {
    const ok = await confirmar({
      titulo: `Borrar el rol ${rol.titulo}?`,
      texto: 'Deja de aparecer al dar de alta o editar una cuenta. Como no lo usa nadie, no hay nadie a quien afecte.',
      confirmar: 'Sí, borrar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await llamarApi(`/api/roles/${rol.clave}`, { metodo: 'DELETE' });
      olvidarRoles();
      toast('Rol borrado.');
      await cargar();
    } catch (excepcion) {
      avisarError(excepcion.message);
    }
  }


  const columnas = [
    {
      title: 'Rol',
      dataIndex: 'titulo',
      render: (titulo, rol) => (
        <span>
          <strong>{titulo}</strong>
          <br />
          <small className="nota">{rol.clave}</small>
        </span>
      ),
    },
    { title: 'Cuentas activas', dataIndex: 'usuarios', align: 'right', width: 130 },
    {
      title: 'Módulos habilitados',
      dataIndex: 'modulos',
      render: (lista) => (lista.length === 0
        ? <span className="nota">Sin accesos</span>
        : <span>{lista.map((m) => nombreModulo(m)).join(', ')}</span>),
    },
    {
      title: '',
      width: 160,
      render: (_, rol) => (
        <div className="acciones">
          <Button size="small" disabled={rol.bloqueado} onClick={() => abrirEdicion(rol)}>Editar</Button>
          {!rol.delSistema && <Button size="small" danger onClick={() => borrar(rol)}>Borrar</Button>}
        </div>
      ),
    },
  ];

  return (
    <>
      <header className="encabezado-pagina">
        <h2>Roles del sistema</h2>
        <Button type="primary" className="boton-crear" onClick={abrirNuevo}>+ Nuevo rol</Button>
      </header>

      <section className="panel">
        {cargando
          ? <p className="mensaje-centrado">Cargando…</p>
          : <Table rowKey="clave" columns={columnas} dataSource={roles} size="small" pagination={false} />}
      </section>

      <Modal abierto={abierto} titulo={editando ? `Editar ${editando.titulo}` : 'Nuevo rol'} alCerrar={() => setAbierto(false)}>
        <form onSubmit={guardar} className="formulario">
          <label>
            <span>Nombre del rol</span>
            <Input
              value={formulario.titulo}
              maxLength={60}
              onChange={(e) => setFormulario({ ...formulario, titulo: e.target.value })}
              placeholder="Por ejemplo: Coordinador de sede"
            />
          </label>
          {!editando && (
            <label>
              <span>Clave interna</span>
              <Input
                value={formulario.clave}
                maxLength={30}
                onChange={(e) => setFormulario({ ...formulario, clave: e.target.value.toLowerCase().replace(/[^a-z_]/g, '') })}
                placeholder="coordinador_sede"
              />
              <small className="nota">Es la que se guarda en la base. Va en minúsculas y no se puede cambiar después.</small>
            </label>
          )}
          <fieldset className="grupo-casillas">
            <legend>Módulos habilitados para este rol</legend>
            <div className="casillas">
            {modulos.map((modulo) => (
              <Checkbox
                key={modulo}
                checked={formulario.modulos.includes(modulo)}
                onChange={(e) => setFormulario({
                  ...formulario,
                  modulos: e.target.checked
                    ? [...formulario.modulos, modulo]
                    : formulario.modulos.filter((m) => m !== modulo),
                })}
              >
                {nombreModulo(modulo)}
              </Checkbox>
            ))}
            </div>
          </fieldset>
          {error && <p className="error">{error}</p>}
          <div className="acciones">
            <Button onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={guardando}>
              {editando ? 'Guardar' : 'Crear el rol'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
