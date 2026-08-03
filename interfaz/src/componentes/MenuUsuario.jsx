import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { salir } from './Diseno.jsx';
import { legible } from '../servicios/formato.js';

const ESTILO_ENLACE = { textAlign: 'left' };

function iniciales(nombre = '') {
  return nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join('') || '?';
}

export default function MenuUsuario({ usuario }) {
  const navegar = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef(null);

  useEffect(() => {
    const alClic = (evento) => { if (caja.current && !caja.current.contains(evento.target)) setAbierto(false); };
    document.addEventListener('mousedown', alClic);
    return () => document.removeEventListener('mousedown', alClic);
  }, []);

  function ir(ruta) {
    setAbierto(false);
    navegar(ruta);
  }

  return (
    <div className="menu-usuario" ref={caja}>
      <Button
        className="avatar"
        type="primary"
        shape="circle"
        size="large"
        onClick={() => setAbierto((estaba) => !estaba)}
        aria-label="Menú de usuario"
        aria-expanded={abierto}
      >
        {iniciales(usuario?.nombre)}
      </Button>

      {abierto && (
        <div className="menu-desplegable">
          <div className="menu-cabecera">
            <strong>{usuario?.nombre}</strong>
            <span className="rol-chip">{legible(usuario?.rol)}</span>
          </div>

          <div className="menu-seccion">
            <Button className="menu-enlace" type="text" block style={ESTILO_ENLACE} onClick={() => ir('/perfil')}>
              Ver perfil y permisos
            </Button>
            <Button className="menu-enlace" type="text" block style={ESTILO_ENLACE} onClick={() => ir('/cambiar-clave')}>
              Cambiar contraseña
            </Button>
          </div>

          <Button className="menu-enlace salir" type="text" danger block style={ESTILO_ENLACE} onClick={salir}>
            Cerrar sesión
          </Button>
        </div>
      )}
    </div>
  );
}
