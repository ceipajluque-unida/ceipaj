import { enviarCorreo, correoConfigurado } from '../../servidor/correo.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { SEGURIDAD, INSTITUCION } from '../../configuracion/ajustes.js';

function momento() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export async function avisarIngresoDesdeEquipoNuevo(usuario, { equipo, ip }) {
  try {
    if (!ajustes.leerBooleano('AVISAR_INGRESO_NUEVO_EQUIPO', SEGURIDAD.AVISAR_INGRESO_NUEVO_EQUIPO)) return { enviado: false };
    if (!usuario?.correo || !correoConfigurado()) return { enviado: false };
    const texto = `Hola ${usuario.nombre}:\n\n` +
      `Se inició sesión en tu cuenta de ${INSTITUCION.NOMBRE} desde un equipo que no está marcado como de confianza.\n\n` +
      `Equipo: ${equipo}\n` +
      `Fecha: ${momento()}\n` +
      `IP: ${ip || 'desconocida'}\n\n` +
      `Si no fuiste vos, cambiá tu contraseña cuanto antes.`;
    const envio = await enviarCorreo({ para: usuario.correo, asunto: `Nuevo inicio de sesión — ${INSTITUCION.NOMBRE}`, texto });
    return { enviado: envio.enviado };
  } catch {
    return { enviado: false };
  }
}
