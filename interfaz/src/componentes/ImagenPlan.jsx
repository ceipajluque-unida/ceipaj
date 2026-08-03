import { useState } from 'react';
import { llamarApi } from '../servicios/api.js';
import { avisarError, toast } from '../servicios/avisos.js';

export const AYUDA_IMAGEN = 'PNG, JPG o WEBP, hasta 400 KB, se recomienda 800 × 450 px (16:9)';

export default function ImagenPlan({ plan, alSubir }) {
  const [subiendo, setSubiendo] = useState(false);

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
      await llamarApi(`/api/planes/${plan.id}/imagen`, { metodo: 'PUT', cuerpo: { imagen: base64 } });
      toast('Imagen actualizada.');
      await alSubir?.();
    } catch (excepcion) {
      avisarError(excepcion.message);
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <label className="imagen-plan" title={AYUDA_IMAGEN}>
      {plan.imagen
        ? <img src={`/api/planes/imagenes/${plan.imagen}`} alt={`Imagen del plan ${plan.texto}`} />
        : <span className="sin-imagen">Sin imagen</span>}

      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={elegir} disabled={subiendo} />
      <span className="cambiar-imagen">{subiendo ? 'Subiendo…' : 'Cambiar'}</span>
    </label>
  );
}
