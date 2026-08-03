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

async function ambitosDe(rol) {
  if (rol === ROLES.SUPERADMINISTRADOR) return [AMBITO.PLATAFORMA];
  const [[{ total }]] = await bd.query(
    'SELECT COUNT(*) AS total FROM usuarios WHERE rol = ? AND activo = 1',
    [ROLES.SUPERADMINISTRADOR]
  );
  return Number(total) > 0 ? [AMBITO.INSTITUCION] : [AMBITO.INSTITUCION, AMBITO.PLATAFORMA];
}

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
  const permitidos = await ambitosDe(solicitante.rol);
  const validos = {};
  for (const [clave, valor] of Object.entries(cambios ?? {})) {
    if (!CLAVES.includes(clave)) continue;
    if (!permitidos.includes(ambitoDe(clave))) {
      throw new ErrorVisible(`El ajuste "${clave}" no es de tu ámbito.`, 403);
    }

    if (CLAVES_SECRETAS.includes(clave) && !String(valor ?? '').trim()) continue;
    validos[clave] = validarAjuste(clave, valor);
  }
  if (Object.keys(validos).length === 0) throw new ErrorVisible('No hay cambios para guardar.');
  await ajustes.guardar(validos);
  await reflejarEnLaInstitucion(validos);

  if (Object.keys(validos).some((clave) => clave.startsWith('PAGOPAR_'))) {
    limpiarCache();
  }

  await registrarAuditoria({ usuarioId: solicitante.id, accion: 'configuracion_actualizada', detalle: Object.keys(validos).join(', '), ip });
  return obtenerConfiguracion(solicitante.rol);
}

export async function probarCorreo(para) {
  const resultado = await enviarCorreo({
    para,
    asunto: `Prueba de correo — ${INSTITUCION.NOMBRE}`,
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

export function textosLegales() {
  return {
    politica: ajustes.leer('TEXTO_POLITICA', POLITICA_PRIVACIDAD),
    terminos: ajustes.leer('TEXTO_TERMINOS', TERMINOS_Y_CONDICIONES),
    aviso: ajustes.leer('TEXTO_AVISO_PRIVACIDAD', AVISO_PRIVACIDAD),
    presentacion: ajustes.leer('TEXTO_PRESENTACION', PRESENTACION_LOGIN),

    mostrarTextos: ajustes.leerBooleano('MOSTRAR_TEXTOS_INGRESO', LEGALES.MOSTRAR_TEXTOS_INGRESO),
    color: ajustes.leer('COLOR_ACENTO', COLORES_SISTEMA[0].valor),

    fondo: ajustes.leer('IMAGEN_FONDO_INGRESO', '') ? `/api/fondo/${ajustes.leer('IMAGEN_FONDO_INGRESO', '')}` : '',
  };
}
