// candado por plan contratado. el rol dice quién puede entrar y el plan dice qué
// contrató la institución, así que primero hay que saber de qué institución es el pedido.
// se monta en servidor.js delante del router, o sea antes que el autenticar de cada
// módulo: por eso lee el token por su cuenta en vez de esperar a req.usuario. quien no
// traiga sesión pasa de largo y lo frena el autenticar del router (o la clave de api,
// en el caso de la entrada del académico, que es pública a propósito).
import jwt from 'jsonwebtoken';
import { SEGURIDAD } from '../../configuracion/ajustes.js';
import { bd } from '../bd/conexion.js';
import { conInstitucion } from '../contexto.js';
import { planEnVigor, moduloIncluido } from '../../modulos/suscripciones/plan.js';

// solo para elegir de quién es el plan: la sesión la valida igual el autenticar del
// router, que revisa cuenta activa, versión de sesión e institución habilitada
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
      // si la consulta del plan falla no se traba el sistema: manda el rol, como antes
      console.error('no se pudo resolver el plan:', error.message);
      return siguiente();
    }
  };
}
