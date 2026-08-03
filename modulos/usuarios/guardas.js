import { bd } from '../../servidor/bd/conexion.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { ROLES } from '../../configuracion/ajustes.js';
import { ROLES_AJENOS } from '../../configuracion/permisos.js';
import { institucionActual } from '../../servidor/contexto.js';
import { planEnVigor } from '../suscripciones/plan.js';

export async function revisarCupo() {
  const plan = await planEnVigor();
  if (plan.maxUsuarios === null) return;

  const [[{ total }]] = await bd.query(
    'SELECT COUNT(*) AS total FROM usuarios WHERE rol NOT IN (?, ?) AND activo = 1 AND institucion_id <=> ?',
    [...ROLES_AJENOS, institucionActual()]
  );
  if (Number(total) >= plan.maxUsuarios) {
    throw new ErrorVisible(
      `El plan ${plan.texto} admite ${plan.maxUsuarios} usuarios internos y ya están todos ocupados. ` +
      'Desactivá una cuenta o cambiá de plan desde Suscripción.',
      402
    );
  }
}

export async function exigirOtroAdministrador(id) {
  const [[{ total }]] = await bd.query(
    'SELECT COUNT(*) AS total FROM usuarios WHERE rol = ? AND activo = 1 AND id <> ? AND institucion_id <=> ?',
    [ROLES.ADMINISTRADOR, id, institucionActual()]
  );
  if (Number(total) === 0) throw new ErrorVisible('Tiene que quedar al menos un administrador activo.');
}
