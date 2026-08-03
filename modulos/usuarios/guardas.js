// frenos que protegen al sistema de quedarse sin administrador o de pasarse del
// cupo de cuentas que admite el plan contratado.
import { bd } from '../../servidor/bd/conexion.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { ROLES } from '../../configuracion/ajustes.js';
import { ROLES_AJENOS } from '../../configuracion/permisos.js';
import { institucionActual } from '../../servidor/contexto.js';
import { planEnVigor } from '../suscripciones/plan.js';

// el plan contratado topea cuántas cuentas internas activas puede tener la institución
export async function revisarCupo() {
  const plan = await planEnVigor();
  if (plan.maxUsuarios === null) return;
  // el cupo es de la institución: el superadministrador es del proveedor y no le come
  // una licencia al cliente que paga
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

// sin esto, el único administrador podría degradarse o desactivarse y dejar el
// sistema sin nadie que pueda administrarlo
export async function exigirOtroAdministrador(id) {
  const [[{ total }]] = await bd.query(
    'SELECT COUNT(*) AS total FROM usuarios WHERE rol = ? AND activo = 1 AND id <> ?',
    [ROLES.ADMINISTRADOR, id]
  );
  if (Number(total) === 0) throw new ErrorVisible('Tiene que quedar al menos un administrador activo.');
}
