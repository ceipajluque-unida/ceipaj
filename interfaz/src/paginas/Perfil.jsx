import { useEffect, useState } from 'react';
import { Button, Input, Select, Table } from 'antd';
import { llamarApi, guardarSesion, tokenActual, usuarioActual } from '../servicios/api.js';
import { avisarError, confirmar, toast, pedirClave } from '../servicios/avisos.js';
import { fecha, legible, nombreModulo } from '../servicios/formato.js';

export default function Perfil() {
  const [perfil, setPerfil] = useState(null);
  const [datos, setDatos] = useState({ nombre: '', correo: '', telefono: '', direccion: '' });
  const [metodo, setMetodo] = useState('app');
  const [qr, setQr] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [validando, setValidando] = useState(false);
  const [error, setError] = useState(null);
  const [equipos, setEquipos] = useState([]);

  async function cargarEquipos() {
    try { setEquipos(await llamarApi('/api/autenticacion/dispositivos')); } catch { setEquipos([]); }
  }

  async function quitarEquipo(equipo) {
    const ok = await confirmar({
      titulo: `Quitar ${equipo.nombre}?`,
      texto: 'La próxima vez que entres desde ahí se vuelve a pedir el código.',
      confirmar: 'Sí, quitar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await llamarApi(`/api/autenticacion/dispositivos/${equipo.id}`, { metodo: 'DELETE' });
      await cargarEquipos();
      toast('Equipo quitado.');
    } catch (excepcion) {
      avisarError(excepcion.message);
    }
  }

  async function cargar() {
    const respuesta = await llamarApi('/api/autenticacion/perfil');
    setPerfil(respuesta);
    await cargarEquipos();
    setDatos({
      nombre: respuesta.usuario.nombre ?? '',
      correo: respuesta.usuario.correo ?? '',
      telefono: respuesta.usuario.telefono ?? '',
      direccion: respuesta.usuario.direccion ?? '',
    });
    setMetodo(respuesta.usuario.metodo_2fa ?? 'app');
  }
  useEffect(() => { cargar().catch((e) => setError(e.message)); }, []);

  async function guardarDatos(evento) {
    evento.preventDefault();
    setGuardando(true);
    try {
      const r = await llamarApi('/api/autenticacion/perfil', { metodo: 'PUT', cuerpo: datos });

      guardarSesion(tokenActual(), { ...usuarioActual(), nombre: r.nombre, correo: r.correo });
      toast('Perfil actualizado.');
      await cargar();
    } catch (excepcion) {
      avisarError(excepcion.message);
    } finally {
      setGuardando(false);
    }
  }

  function etiquetaMetodo(valor) {
    return perfil.metodos2fa.find((m) => m.valor === valor)?.texto ?? legible(valor);
  }

  async function quitarDosPasos() {
    const clave = await pedirClave({
      titulo: 'Quitar la verificación en dos pasos?',
      texto: 'Vas a entrar solo con tu correo y tu contraseña. Escribí tu contraseña actual para confirmar.',
      confirmar: 'Sí, quitar',
    });
    if (!clave) return;
    try {
      await llamarApi('/api/autenticacion/quitar-2fa', { metodo: 'POST', cuerpo: { clave } });
      await cargar();
      toast('La cuenta quedó sin verificación en dos pasos.');
    } catch (excepcion) {
      avisarError(excepcion.message);
    }
  }

  async function guardarMetodo(evento) {
    evento.preventDefault();
    setQr(null);
    setValidando(true);
    try {
      const r = await llamarApi('/api/autenticacion/metodo-2fa', { metodo: 'POST', cuerpo: { metodo, telefono: datos.telefono } });
      await cargar();
      if (r.qr) setQr(r.qr);
      toast('Método de verificación actualizado.');
    } catch (excepcion) {
      avisarError(excepcion.message);
    } finally {
      setValidando(false);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!perfil) return <p className="mensaje-centrado">Cargando…</p>;

  const columnasEquipos = [
    { title: 'Equipo', dataIndex: 'nombre', key: 'nombre' },
    {
      title: 'Agregado',
      dataIndex: 'creado_en',
      key: 'creado_en',
      render: (valor) => <span className="sin-cortar">{fecha(valor)}</span>,
    },
    {
      title: 'Último uso',
      dataIndex: 'ultimo_uso',
      key: 'ultimo_uso',
      render: (valor) => <span className="sin-cortar">{valor ? fecha(valor) : '—'}</span>,
    },
    {
      title: <span className="oculto-visual">Acciones</span>,
      key: 'acciones',
      render: (_, equipo) => (
        <Button size="small" danger aria-label={`Quitar ${equipo.nombre}`} onClick={() => quitarEquipo(equipo)}>
          Quitar
        </Button>
      ),
    },
  ];

  return (
    <>
      <header className="encabezado-pagina"><h2>Mi perfil</h2></header>

      <section className="panel">
        <h3>Datos de la cuenta</h3>
        <form onSubmit={guardarDatos}>
          <label>Nombre completo
            <Input value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} required />
          </label>
          <div className="fila-formulario">
            <label>Correo
              <Input type="email" value={datos.correo} onChange={(e) => setDatos({ ...datos, correo: e.target.value })} required />
            </label>
            <label>Celular
              <Input value={datos.telefono} onChange={(e) => setDatos({ ...datos, telefono: e.target.value })} placeholder="0981 123 456" />
            </label>
          </div>
          <label>Dirección
            <Input value={datos.direccion} onChange={(e) => setDatos({ ...datos, direccion: e.target.value })} />
          </label>
          <div className="menu-fila">
            <span className="nota">Rol: <span className="rol-chip">{legible(perfil.usuario.rol)}</span></span>
            <Button type="primary" htmlType="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</Button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h3>Verificación en dos pasos</h3>
        <dl className="datos-perfil">
          <div>
            <dt>Estado</dt>
            <dd>
              <span className={`estado estado-${perfil.sin2fa ? 'rechazado' : 'exitoso'}`}>
                {perfil.sin2fa ? 'Sin verificación' : `${etiquetaMetodo(perfil.usuario.metodo_2fa)} configurada`}
              </span>
            </dd>
          </div>
        </dl>
        {perfil.puedeQuitar2fa && !perfil.sin2fa && (
          <div className="acciones separado">
            <Button danger onClick={quitarDosPasos}>Quitar la verificación</Button>
          </div>
        )}
        <form onSubmit={guardarMetodo}>
          <div className="fila-formulario">
            <label>Método
              <Select
                value={metodo}
                options={perfil.metodos2fa.map((m) => ({ value: m.valor, label: m.texto }))}
                onChange={(valor) => { setMetodo(valor); setQr(null); }}
              />
            </label>
            {metodo === 'sms' && (
              <label>Celular para el SMS<Input value={datos.telefono} onChange={(e) => setDatos({ ...datos, telefono: e.target.value })} placeholder="0981 123 456" /></label>
            )}
            <Button type="primary" htmlType="submit" disabled={validando}>{validando ? 'Validando…' : 'Actualizar método'}</Button>
          </div>
        </form>
        {qr && (
          <div className="sep-arriba">
            <p className="ayuda">Escaneá este código con tu app.</p>
            <img className="qr" src={qr} alt="Código QR para escanear con la app de autenticación" />
          </div>
        )}
      </section>

      <section className="panel">
        <h3>Equipos de confianza</h3>
        {equipos.length === 0 && (
          <p className="nota">Todavía no hay equipos marcados.</p>
        )}
        {equipos.length > 0 && (
          <div className="tabla-envoltura">
            <Table columns={columnasEquipos} dataSource={equipos} rowKey="id" size="small" pagination={false} />
          </div>
        )}
      </section>

      <section className="panel">
        <h3>Mis permisos</h3>
        <ul className="chips">
          {perfil.modulos.map((clave) => (
            <li key={clave} className="chip-permiso">{nombreModulo(clave)}</li>
          ))}
        </ul>
      </section>

    </>
  );
}
