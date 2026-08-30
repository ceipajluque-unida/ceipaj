import { useRef, useState } from 'react';
import { Button } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { avisarError, toast } from '../servicios/avisos.js';

export const AYUDA_FONDO = 'JPG, PNG o WEBP, hasta 2 MB, se recomienda 1920 × 1080 px';

export default function FondoIngreso({ actual, alCambiar }) {
  const [subiendo, setSubiendo] = useState(false);

  const entrada = useRef(null);

  async function elegir(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    setSubiendo(true);
    try {
      const base64 = await new Promise((resolver, rechazar) => {
        const lector = new FileReader();
        lector.onload = () => resolver(String(lector.result).split(',')[1]);
        lector.onerror = () => rechazar(new Error('No se pudo leer el archivo.'));
        lector.readAsDataURL(archivo);
      });
      const r = await llamarApi('/api/configuracion/fondo', { metodo: 'PUT', cuerpo: { imagen: base64 } });
      toast('Imagen de fondo actualizada.');
      await alCambiar?.(r.imagen);
    } catch (excepcion) {
      avisarError(excepcion.message);
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="fondo-ingreso">
      {actual
        ? <img src={`/api/fondo/${actual}`} alt="Fondo actual de la pantalla de ingreso" />
        : <span className="sin-imagen">Sin imagen: el panel del ingreso usa el color del sistema</span>}
      <div className="subir-fondo">

        <input ref={entrada} type="file" accept="image/png,image/jpeg,image/webp"
          onChange={elegir} disabled={subiendo} aria-label="Elegir la imagen de fondo del ingreso" />
        <Button onClick={() => entrada.current?.click()} disabled={subiendo}>
          {subiendo ? 'Subiendo…' : actual ? 'Cambiar imagen' : 'Elegir imagen'}
        </Button>
        {actual && !subiendo && (
          <Button danger onClick={() => alCambiar?.('')}>Quitar</Button>
        )}
      </div>
      <span className="nota">{AYUDA_FONDO}</span>
    </div>
  );
}
