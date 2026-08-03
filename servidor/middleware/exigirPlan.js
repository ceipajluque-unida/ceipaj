import jwt from 'jsonwebtoken';
import { SEGURIDAD } from '../../configuracion/ajustes.js';
import { bd } from '../bd/conexion.js';
import { conInstitucion } from '../contexto.js';
import { planEnVigor, moduloIncluido } from '../../modulos/suscripciones/plan.js';

async function institucionDelToken(req) {
  const encabezado = req.headers.authorization ?? '';
  if (!encabezado.startsWith('Bearer ')) return null;
  try {
    const datos = jwt.verify(encabezado.slice(7), SEGURIDAD.JWT_SECRETO);
    if (datos.alcance !== 'sesion') return null;
    const [[usuario]] = await bd.query('SELECT institucion_id FROM usuarios WHERE id = ?', [datos.id]);
    return usuario?.institucion_id ?? null;
  } catch {
    return null;
  }
}

export function exigirPlan(modulo) {
  return async (req, res, siguiente) => {
    try {
      const institucionId = await institucionDelToken(req);
      if (institucionId === null) return siguiente();
      const plan = await conInstitucion(institucionId, planEnVigor);
      if (moduloIncluido(plan, modulo)) return siguiente();
      return res.status(402).json({
        error: `El plan ${plan.texto} no incluye este módulo. Cambiá de plan desde Suscripción para habilitarlo.`,
        modulo,
        plan: plan.clave,
      });
    } catch (error) {
      console.error('no se pudo resolver el plan:', error.message);
      return siguiente();
    }
  };
}
