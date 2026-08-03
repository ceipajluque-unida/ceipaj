// búsqueda y estado del padrón de aliados, junto con la regla de filtrado que aplica la página
import { Button, Input, Select } from 'antd';

export const FILTROS_VACIOS = { buscar: '', estado: '' };

const OPCIONES_ESTADO = [
  { value: '', label: 'Todos' },
  { value: 'activo', label: 'Solo activos' },
  { value: 'inactivo', label: 'Solo inactivos' },
];

export function filtrarAliados(aliados, filtros) {
  const buscado = filtros.buscar.trim().toLowerCase();
  return aliados.filter((aliado) => {
    if (filtros.estado === 'activo' && !aliado.activo) return false;
    if (filtros.estado === 'inactivo' && aliado.activo) return false;
    if (!buscado) return true;
    return `${aliado.nombre} ${aliado.institucion ?? ''} ${aliado.correo}`.toLowerCase().includes(buscado);
  });
}

export default function FiltrosAliados({ filtros, alCambiar }) {
  const hayFiltros = Boolean(filtros.buscar || filtros.estado);

  return (
    <div className="fila-formulario">
      <label>Buscar
        <Input
          placeholder="Nombre, institución o correo"
          value={filtros.buscar}
          onChange={(evento) => alCambiar({ ...filtros, buscar: evento.target.value })}
        />
      </label>
      <label>Estado
        <Select value={filtros.estado} options={OPCIONES_ESTADO} onChange={(valor) => alCambiar({ ...filtros, estado: valor })} />
      </label>
      {hayFiltros && (
        <Button onClick={() => alCambiar(FILTROS_VACIOS)}>Limpiar filtros</Button>
      )}
    </div>
  );
}
