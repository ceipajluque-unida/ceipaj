import { bd } from '../../servidor/bd/conexion.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { institucionActual } from '../../servidor/contexto.js';
import { planEnVigor } from '../suscripciones/plan.js';

// el tope de aliados por plan viene de la tabla 19 de la tesis; cuenta solo activos
export async function revisarCupoAliados() {
  const plan = await planEnVigor();
  if (plan.maxAliados === null) return;

  const [[{ total }]] = await bd.query(
    `SELECT COUNT(*) AS total FROM aliados a
       JOIN usuarios u ON u.id = a.usuario_id
      WHERE u.activo = 1 AND a.institucion_id <=> ?`,
    [institucionActual()]
  );
  if (Number(total) >= plan.maxAliados) {
    throw new ErrorVisible(
      plan.maxAliados === 0
        ? `El plan ${plan.texto} no incluye aliados institucionales. Se habilitan cambiando de plan desde Suscripción.`
        : `El plan ${plan.texto} admite ${plan.maxAliados} aliados institucionales y ya están todos ocupados. `
          + 'Desactivá un aliado o cambiá de plan desde Suscripción.',
      402
    );
  }
}
