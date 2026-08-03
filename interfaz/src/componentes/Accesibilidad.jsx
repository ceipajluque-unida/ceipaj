import { useEffect, useState } from 'react';
import { Badge, Button, Card, Flex, Segmented, Space, Switch, Tooltip, Typography } from 'antd';
import { Accessibility, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { leer, guardar, aplicar, POR_DEFECTO } from '../servicios/accesibilidad.js';

const { Text } = Typography;
const LIMITE = { minimo: -1, maximo: 2 };
const NOMBRES = ['Chico', 'Normal', 'Grande', 'Más grande'];

export default function Accesibilidad() {
  const [abierto, setAbierto] = useState(false);
  const [preferencias, setPreferencias] = useState(leer);

  useEffect(() => { aplicar(preferencias); }, []);

  useEffect(() => {
    if (!abierto) return;
    const alTecla = (evento) => evento.key === 'Escape' && setAbierto(false);
    document.addEventListener('keydown', alTecla);
    return () => document.removeEventListener('keydown', alTecla);
  }, [abierto]);

  function cambiar(campo, valor) {
    const nuevas = { ...preferencias, [campo]: valor };
    setPreferencias(nuevas);
    guardar(nuevas);
  }

  const lado = preferencias.lado === 'izquierda' ? 'izquierda' : 'derecha';
  const activos = [
    preferencias.contraste,
    preferencias.daltonismo,
    preferencias.subrayar,
    preferencias.texto !== 0,
  ].filter(Boolean).length;

  const interruptor = (campo, etiqueta) => (
    <Flex justify="space-between" align="center" gap="small">
      <Text style={{ fontSize: '0.85rem' }}>{etiqueta}</Text>
      <Switch
        size="small"
        checked={preferencias[campo]}
        onChange={(valor) => cambiar(campo, valor)}
        aria-label={etiqueta}
      />
    </Flex>
  );

  return (
    <div className={`accesibilidad accesibilidad-${lado}`}>
      {abierto && (
        <Card
          className="accesibilidad-panel"
          size="small"
          title={<Text strong style={{ fontSize: '0.85rem' }}>Accesibilidad</Text>}
          extra={<Button type="text" size="small" icon={<X size={15} />} onClick={() => setAbierto(false)} aria-label="Cerrar" />}
          role="region"
          aria-label="Opciones de accesibilidad"
        >
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary" style={{ fontSize: '0.78rem' }}>Tamaño del texto</Text>
              <Flex gap="small" align="center" style={{ marginTop: 4 }}>
                <Button
                  size="small" icon={<Minus size={13} />} aria-label="Achicar el texto"
                  disabled={preferencias.texto <= LIMITE.minimo}
                  onClick={() => cambiar('texto', preferencias.texto - 1)}
                />
                <Text style={{ flex: 1, textAlign: 'center', fontSize: '0.82rem' }} aria-live="polite">
                  {NOMBRES[preferencias.texto + 1]}
                </Text>
                <Button
                  size="small" icon={<Plus size={13} />} aria-label="Agrandar el texto"
                  disabled={preferencias.texto >= LIMITE.maximo}
                  onClick={() => cambiar('texto', preferencias.texto + 1)}
                />
              </Flex>
            </div>

            {interruptor('contraste', 'Alto contraste')}
            {interruptor('daltonismo', 'Colores para daltonismo')}
            {interruptor('subrayar', 'Subrayar los enlaces')}

            <div>
              <Text type="secondary" style={{ fontSize: '0.78rem' }}>Lado del botón</Text>
              <Segmented
                block
                size="small"
                style={{ marginTop: 4 }}
                value={lado}
                onChange={(valor) => cambiar('lado', valor)}
                options={[{ label: 'Izquierda', value: 'izquierda' }, { label: 'Derecha', value: 'derecha' }]}
              />
            </div>

            <Button size="small" block icon={<RotateCcw size={13} />} onClick={() => { setPreferencias(POR_DEFECTO); guardar(POR_DEFECTO); }}>
              Restablecer
            </Button>
          </Space>
        </Card>
      )}

      <Tooltip title="Accesibilidad" placement={lado === 'derecha' ? 'left' : 'right'}>
        <Badge count={activos} size="small" offset={[-4, 4]}>
          <Button
            type="primary" shape="circle" size="large"
            icon={<Accessibility size={20} />}
            aria-expanded={abierto}
            aria-label={`Opciones de accesibilidad${activos ? `, ${activos} activas` : ''}`}
            onClick={() => setAbierto(!abierto)}
          />
        </Badge>
      </Tooltip>
    </div>
  );
}
