import jwt from 'jsonwebtoken';
import { SEGURIDAD } from '../../configuracion/ajustes.js';
import { bd } from '../bd/conexion.js';
import { conInstitucion } from '../contexto.js';

export async function autenticar(req, res, siguiente) {
  const encabezado = req.headers.authorization ?? '';
  const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sesión requerida.' });
  let datos;
  try {
    datos = jwt.verify(token, SEGURIDAD.JWT_SECRETO);

    if (datos.alcance !== 'sesion') throw new Error('alcance incorrecto');
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o vencida.' });
  }

  const [[usuario]] = await bd.query(
    'SELECT nombre, correo, rol, activo, sesion_version, institucion_id FROM usuarios WHERE id = ?',
    [datos.id]
  );
  if (!usuario || !usuario.activo) return res.status(401).json({ error: 'La cuenta no está activa.' });
  if ((datos.sv ?? 0) !== usuario.sesion_version) return res.status(401).json({ error: 'La sesión se cerró o expiró.' });

  if (usuario.institucion_id) {
    const [[institucion]] = await bd.query('SELECT activo FROM instituciones WHERE id = ?', [usuario.institucion_id]);
    if (!institucion?.activo) return res.status(403).json({ error: 'La institución no está habilitada.' });
  }
  req.usuario = {
    id: datos.id, nombre: usuario.nombre, correo: usuario.correo,
    rol: usuario.rol, institucionId: usuario.institucion_id ?? null,
  };

  return conInstitucion(req.usuario.institucionId, siguiente);
}

export function permitirRoles(...roles) {
  return (req, res, siguiente) => {
    if (!roles.includes(req.usuario?.rol)) {
      return res.status(403).json({ error: 'Sin permiso para esta operación.' });
    }
    return siguiente();
  };
}

export function permitirModulo(modulo, { porPlan = true } = {}) {
  return async (req, res, siguiente) => {
    try {
      const { rolesDelModulo } = await import('../../modulos/roles/servicio.js');
      const permitidos = await rolesDelModulo(modulo);
      if (!permitidos.includes(req.usuario?.rol)) {
        return res.status(403).json({ error: 'Sin permisos para esta operación.' });
      }

      if (!porPlan) return siguiente();

      const { planEnVigor, moduloIncluido } = await import('../../modulos/suscripciones/plan.js');
      const plan = await planEnVigor();
      if (!moduloIncluido(plan, modulo)) {
        return res.status(402).json({
          error: `El plan ${plan.texto} no incluye esta sección. Por favor considere una suscripcion a un plan con privilegios.`,
          modulo,
          plan: plan.clave,
        });
      }
      return siguiente();
    } catch (excepcion) {
      return siguiente(excepcion);
    }
  };
}
