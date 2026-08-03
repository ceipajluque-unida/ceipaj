// ajustes del sistema, solo para el admin; los secretos guardados nunca se devuelven
import * as ajustes from '../../servidor/ajustesSistema.js';
import { CATALOGO, CLAVES, CLAVES_SECRETAS } from '../../servidor/ajustesSistema.js';
import { validarAjuste } from '../../servidor/validarAjuste.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { enviarCorreo } from '../../servidor/correo.js';
import { enviarSms } from '../../servidor/sms.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { INSTITUCION, ROLES, COLORES_SISTEMA, LEGALES } from '../../configuracion/ajustes.js';
import { AMBITO, ambitoDe } from '../../configuracion/ambitos.js';
import { bd } from '../../servidor/bd/conexion.js';
import { institucionActual } from '../../servidor/contexto.js';
import { POLITICA_PRIVACIDAD, TERMINOS_Y_CONDICIONES, AVISO_PRIVACIDAD, PRESENTACION_LOGIN } from '../../configuracion/legales.js';
import { limpiarCache } from '../pagos/pasarelas/freno.js';

// qué ámbitos puede ver y tocar cada rol. la degradación del final es la que sostiene a
// las instalaciones que todavía no tienen proveedor: sin ella, un sistema recién
// entregado se quedaría sin poder configurar la seguridad ni los textos legales.
async function ambitosDe(rol) {
  if (rol === ROLES.SUPERADMINISTRADOR) return [AMBITO.PLATAFORMA];
  const [[{ total }]] = await bd.query(
    'SELECT COUNT(*) AS total FROM usuarios WHERE rol = ? AND activo = 1',
    [ROLES.SUPERADMINISTRADOR]
  );
  return Number(total) > 0 ? [AMBITO.INSTITUCION] : [AMBITO.INSTITUCION, AMBITO.PLATAFORMA];
}

// catálogo con el valor actual de cada ajuste; de los secretos solo si están configurados
export async function obtenerConfiguracion(rol) {
  const permitidos = await ambitosDe(rol);
  return CATALOGO.map((grupo) => ({
    categoria: grupo.categoria,
    ajustes: grupo.ajustes.filter((ajuste) => permitidos.includes(ambitoDe(ajuste.clave))).map((ajuste) => {
      const base = {
        clave: ajuste.clave, etiqueta: ajuste.etiqueta, tipo: ajuste.tipo,
        opciones: ajuste.opciones, ayuda: ajuste.ayuda, depende: ajuste.depende,
        min: ajuste.min, max: ajuste.max, generable: ajuste.generable, moneda: ajuste.moneda,
        ambito: ambitoDe(ajuste.clave),
      };
      if (ajuste.tipo === 'secreto') return { ...base, configurado: Boolean(ajustes.leer(ajuste.clave, '')) };
      return { ...base, valor: ajustes.leer(ajuste.clave, ajuste.porDefecto) };
    }),
  })).filter((grupo) => grupo.ajustes.length > 0);
}

// el nombre y la ciudad se editan desde acá pero también figuran en la tabla de
// instituciones, que es lo que ve el proveedor en su listado. sin esta copia las dos
// quedaban distintas y no había forma de saber cuál valía.
async function reflejarEnLaInstitucion(guardados) {
  const institucionId = institucionActual();
  if (institucionId === null) return;
  const campos = [];
  const args = [];
  if ('INSTITUCION_NOMBRE' in guardados) { campos.push('nombre = ?'); args.push(guardados.INSTITUCION_NOMBRE); }
  if ('INSTITUCION_CIUDAD' in guardados) { campos.push('ciudad = ?'); args.push(guardados.INSTITUCION_CIUDAD || null); }
  if (campos.length === 0) return;
  await bd.query(`UPDATE instituciones SET ${campos.join(', ')} WHERE id = ?`, [...args, institucionId]);
}

export async function guardarConfiguracion(cambios, solicitante, ip) {
  // el filtro va también acá y no solo al dibujar la pantalla: ocultar un campo en la
  // interfaz no impide mandar el PUT a mano con la clave que no corresponde
  const permitidos = await ambitosDe(solicitante.rol);
  const validos = {};
  for (const [clave, valor] of Object.entries(cambios ?? {})) {
    if (!CLAVES.includes(clave)) continue;
    if (!permitidos.includes(ambitoDe(clave))) {
      throw new ErrorVisible(`El ajuste "${clave}" no es de tu ámbito.`, 403);
    }
    // un secreto en blanco no pisa lo guardado, así no se borra sin querer
    if (CLAVES_SECRETAS.includes(clave) && !String(valor ?? '').trim()) continue;
    validos[clave] = validarAjuste(clave, valor);
  }
  if (Object.keys(validos).length === 0) throw new ErrorVisible('No hay cambios para guardar.');
  await ajustes.guardar(validos);
  await reflejarEnLaInstitucion(validos);
  // al tocar la pasarela lo que quedó cacheado de ella ya no sirve
  if (Object.keys(validos).some((clave) => clave.startsWith('PAGOPAR_'))) {
    limpiarCache();
  }
  // en la auditoría van las claves cambiadas, nunca los valores (pueden ser secretos)
  await registrarAuditoria({ usuarioId: solicitante.id, accion: 'configuracion_actualizada', detalle: Object.keys(validos).join(', '), ip });
  return obtenerConfiguracion(solicitante.rol);
}

export async function probarCorreo(para) {
  const resultado = await enviarCorreo({
    para,
    asunto: `Prueba de correo · ${INSTITUCION.NOMBRE}`,
    texto: 'Este es un correo de prueba del Sistema de Información Gerencial. Si lo recibiste, el SMTP está bien configurado.',
  });
  if (!resultado.enviado) throw new ErrorVisible(`No se pudo enviar: ${resultado.motivo}`, 502);
  return { enviado: true };
}

export async function probarSms(para) {
  const resultado = await enviarSms({ para, texto: 'Prueba de SMS del Sistema de Información Gerencial del CEIPAJ.' });
  if (!resultado.enviado) throw new ErrorVisible(`No se pudo enviar: ${resultado.motivo}`, 502);
  return { enviado: true };
}

// textos que se muestran en el pie y en el ingreso, sin necesidad de sesión
export function textosLegales() {
  return {
    politica: ajustes.leer('TEXTO_POLITICA', POLITICA_PRIVACIDAD),
    terminos: ajustes.leer('TEXTO_TERMINOS', TERMINOS_Y_CONDICIONES),
    aviso: ajustes.leer('TEXTO_AVISO_PRIVACIDAD', AVISO_PRIVACIDAD),
    presentacion: ajustes.leer('TEXTO_PRESENTACION', PRESENTACION_LOGIN),
    // con la imagen que ya trae el texto escrito, el nombre y la presentación se apagan
    mostrarTextos: ajustes.leerBooleano('MOSTRAR_TEXTOS_INGRESO', LEGALES.MOSTRAR_TEXTOS_INGRESO),
    color: ajustes.leer('COLOR_ACENTO', COLORES_SISTEMA[0].valor),
    // ruta lista para usar, o vacío si no se cargó ninguna imagen
    fondo: ajustes.leer('IMAGEN_FONDO_INGRESO', '') ? `/api/fondo/${ajustes.leer('IMAGEN_FONDO_INGRESO', '')}` : '',
  };
}
