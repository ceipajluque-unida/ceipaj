import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { MODULOS_NUCLEO, SUSCRIPCION } from '../../configuracion/ajustes.js';
import { MODULOS } from '../../configuracion/permisos.js';

const aLista = (texto) => String(texto ?? '').split('\n').map((l) => l.trim()).filter(Boolean);

function armar(fila) {
  return {
    id: fila.id,
    valor: fila.clave,
    texto: fila.titulo,
    descripcion: fila.descripcion,
    precio: Number(fila.precio),
    meses: Number(fila.meses),
    incluye: aLista(fila.incluye),
    maxUsuarios: fila.max_usuarios === null ? null : Number(fila.max_usuarios),
    maxAliados: fila.max_aliados === null ? null : Number(fila.max_aliados),
    modulos: aLista(fila.modulos_incluidos),
    imagen: fila.imagen,
    activo: Boolean(fila.activo),
  };
}

// qué módulos puede tapar un plan: los del núcleo nunca, porque sin Pagos ni
// Suscripción la institución no tendría por dónde renovar
export const catalogoModulos = () => MODULOS.filter((m) => !MODULOS_NUCLEO.includes(m));

function modulosDelPlan(valor) {
  if (valor === undefined || valor === null) return '';
  if (!Array.isArray(valor)) throw new ErrorVisible('Elegí qué módulos habilita el plan.');
  const limpios = [...new Set(valor.map((m) => String(m).trim()).filter(Boolean))];
  const ajeno = limpios.find((m) => !catalogoModulos().includes(m));
  if (ajeno) throw new ErrorVisible(`El módulo "${ajeno}" no se puede asignar a un plan.`);
  return limpios.join(String.fromCharCode(10));
}

// cero es un tope válido y quiere decir "ninguno": es lo que deja al plan Free
// sin aliados. vacío sigue queriendo decir "sin límite".
function tope(valor, campo) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Math.trunc(Number(valor));
  if (!Number.isInteger(numero) || numero < 0) throw new ErrorVisible(`El tope de ${campo} va vacío (sin límite), en cero (ninguno) o en un número entero.`);
  return numero;
}

// el plan de cada institución está cacheado: sin esto, un cambio de módulos o
// una baja recién se sentirían cuando venciera el caché. va con import diferido
// porque plan.js importa de este mismo archivo.
async function olvidarPlanesCacheados() {
  const { limpiarCachePlan } = await import('../suscripciones/plan.js');
  limpiarCachePlan(null);
}

export async function listarActivos() {
  const [filas] = await bd.query('SELECT * FROM planes WHERE activo = 1 ORDER BY orden, id');
  return filas.map(armar);
}

export async function listarTodos() {
  const [filas] = await bd.query('SELECT * FROM planes ORDER BY orden, id');
  return filas.map(armar);
}

export async function buscar(clave) {
  const [[fila]] = await bd.query('SELECT * FROM planes WHERE clave = ? AND activo = 1', [clave]);
  return fila ? armar(fila) : undefined;
}

function claveDesde(titulo) {
  return String(titulo).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 25) || 'plan';
}

export async function crear(datos, usuario, ip) {
  const titulo = String(datos?.titulo ?? '').trim();
  const precio = Math.trunc(Number(datos?.precio));
  if (!titulo) throw new ErrorVisible('El plan necesita un título.');
  if (!Number.isInteger(precio) || precio < 0) throw new ErrorVisible('El precio va en guaraníes enteros, o en cero si el plan es gratuito.');

  let clave = claveDesde(titulo);
  const [existe] = await bd.query('SELECT id FROM planes WHERE clave = ?', [clave]);
  if (existe.length > 0) clave = `${clave}-${Date.now().toString().slice(-4)}`;

  const [resultado] = await bd.query(
    `INSERT INTO planes (clave, titulo, descripcion, precio, meses, incluye, max_usuarios, max_aliados, modulos_incluidos, orden)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(o.orden), 0) + 1 FROM (SELECT orden FROM planes) o))`,
    [clave, titulo.slice(0, 80), String(datos?.descripcion ?? '').slice(0, 300) || null,
     precio, Math.max(1, Number(datos?.meses) || 1), (datos?.incluye ?? []).join('\n'),
     tope(datos?.maxUsuarios, 'usuarios'), tope(datos?.maxAliados, 'aliados'), modulosDelPlan(datos?.modulos)]
  );
  await registrarAuditoria({ usuarioId: usuario.id, accion: 'plan_creado', detalle: titulo, ip });
  return { id: resultado.insertId, valor: clave };
}

export async function editar(id, datos, usuario, ip) {
  const titulo = String(datos?.titulo ?? '').trim();
  const precio = Math.trunc(Number(datos?.precio));
  if (!titulo) throw new ErrorVisible('El plan necesita un título.');
  if (!Number.isInteger(precio) || precio < 0) throw new ErrorVisible('El precio va en guaraníes enteros, o en cero si el plan es gratuito.');

  // desactivar por edición pasa por las mismas guardas que la baja
  if (datos?.activo === false) {
    const [[actual]] = await bd.query('SELECT clave, activo FROM planes WHERE id = ?', [id]);
    if (!actual) throw new ErrorVisible('El plan no existe.', 404);
    if (actual.activo) await exigirBajaPermitida(actual.clave);
  }

  const [resultado] = await bd.query(
    `UPDATE planes SET titulo = ?, descripcion = ?, precio = ?, meses = ?, incluye = ?,
            max_usuarios = ?, max_aliados = ?, modulos_incluidos = ?, activo = ? WHERE id = ?`,
    [titulo.slice(0, 80), String(datos?.descripcion ?? '').slice(0, 300) || null, precio,
     Math.max(1, Number(datos?.meses) || 1), (datos?.incluye ?? []).join('\n'),
     tope(datos?.maxUsuarios, 'usuarios'), tope(datos?.maxAliados, 'aliados'),
     modulosDelPlan(datos?.modulos), datos?.activo === false ? 0 : 1, id]
  );
  if (resultado.affectedRows === 0) throw new ErrorVisible('El plan no existe.', 404);
  await olvidarPlanesCacheados();
  await registrarAuditoria({ usuarioId: usuario.id, accion: 'plan_editado', detalle: titulo, ip });
  return { id };
}

async function exigirBajaPermitida(clave) {
  if (clave === SUSCRIPCION.PLAN_AL_VENCER) {
    throw new ErrorVisible('No se puede dar de baja este plan: es al que cae el sistema cuando vence la suscripción.', 409);
  }
  const [[{ enUso }]] = await bd.query(
    `SELECT COUNT(*) AS enUso FROM suscripciones
      WHERE plan = ? AND estado = 'activa' AND fecha_fin > NOW()`,
    [clave]
  );
  if (Number(enUso) > 0) {
    throw new ErrorVisible(
      `Hay ${enUso} suscripción(es) usando este plan. Esperá a que venzan o pasá esas instituciones a otro plan.`,
      409
    );
  }
}

export async function apagar(id, usuario, ip) {
  const [[plan]] = await bd.query('SELECT clave FROM planes WHERE id = ?', [id]);
  if (!plan) throw new ErrorVisible('El plan no existe.', 404);
  await exigirBajaPermitida(plan.clave);
  const [resultado] = await bd.query('UPDATE planes SET activo = 0 WHERE id = ?', [id]);
  if (resultado.affectedRows === 0) throw new ErrorVisible('El plan no existe.', 404);
  await olvidarPlanesCacheados();
  await registrarAuditoria({ usuarioId: usuario.id, accion: 'plan_apagado', detalle: String(id), ip });
  return { id, activo: false };
}

export async function guardarImagen(id, archivo, usuario, ip) {
  const [resultado] = await bd.query('UPDATE planes SET imagen = ? WHERE id = ?', [archivo, id]);
  if (resultado.affectedRows === 0) throw new ErrorVisible('El plan no existe.', 404);
  await registrarAuditoria({ usuarioId: usuario.id, accion: 'plan_imagen', detalle: `plan ${id}: ${archivo}`, ip });
  return { id, imagen: archivo };
}
