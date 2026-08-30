import { useState } from 'react';
import { Button } from 'antd';
import RolesInstitucion from './RolesInstitucion.jsx';
import UsuariosInstitucion from './UsuariosInstitucion.jsx';
import AliadosInstitucion from './AliadosInstitucion.jsx';
import SuscripcionInstitucion from './SuscripcionInstitucion.jsx';

// la ficha se navega igual que la pantalla de Configuración: las secciones a la
// izquierda y el contenido al lado. es el patrón que ya usa el sistema.
export default function DetalleInstitucion({ institucion, version, alCambiar }) {
  const [seccion, setSeccion] = useState(0);

  const secciones = [
    { titulo: 'Roles y accesos', contenido: <RolesInstitucion institucionId={institucion.id} refresco={version} /> },
    { titulo: 'Usuarios', contenido: <UsuariosInstitucion institucion={institucion} alCambiar={alCambiar} /> },
    { titulo: 'Aliados', contenido: <AliadosInstitucion institucion={institucion} /> },
    { titulo: 'Suscripción', contenido: <SuscripcionInstitucion institucionId={institucion.id} refresco={version} /> },
  ];

  return (
    <div className="config detalle-institucion">
      <nav className="config-secciones" aria-label={`Secciones de ${institucion.nombre}`}>
        {secciones.map((item, indice) => (
          <Button
            key={item.titulo}
            type="text"
            className={indice === seccion ? 'activa' : ''}
            onClick={() => setSeccion(indice)}
          >
            {item.titulo}
          </Button>
        ))}
      </nav>

      <section className="panel">
        <h4>{secciones[seccion].titulo}</h4>
        {secciones[seccion].contenido}
      </section>
    </div>
  );
}
