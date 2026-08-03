// abm de las instituciones cliente. lo usa solo el proveedor del servicio: cada alta
// abre un inquilino nuevo con su propio administrador, sus datos y su suscripción.
import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { validarCorreo, validarTelefono, validarLargo, LARGOS } from '../../comun/validar.js';
import * as ajustes from '../../servidor/ajustesSistema.js';

const CAMPOS = 'id, nombre, ciudad, correo_contacto, telefono, direccion, activo, creado_en';

// el nombre vive en esta tabla, pero el resto del sistema (la barra, los correos, el
// recibo) lo lee de los ajustes de la institución. si solo se guardara acá, renombrar un
// colegio no cambiaba nada en ninguna pantalla: se copia para que no haya dos verdades.
async function copiarAAjustes(institucionId, datos) {
  await ajustes.guardar(
    { INSTITUCION_NOMBRE: datos.nombre, INSTITUCION_CIUDAD: datos.ciudad ?? '' },
    institucionId
  );
}

function datosValidados(cuerpo) {
  const nombre = String(cuerpo?.nombre ?? '').trim();
  const ciudad = String(cuerpo?.ciudad ?? '').trim();
  const correo = String(cuerpo?.correoContacto ?? '').trim().toLowerCase();
  const telefono = String(cuerpo?.telefono ?? '').trim();
  const direccion = String(cuerpo?.direccion ?? '').trim();
  if (!nombre) throw new ErrorVisible('El nombre de la institución es obligatorio.');
  if (!validarLargo(nombre, LARGOS.institucion)) throw new ErrorVisible(`El nombre no puede pasar de ${LARGOS.institucion} caracteres.`);
  if (correo && !validarCorreo(correo)) throw new ErrorVisible('El correo de contacto no es válido.');
  if (!validarTelefono(telefono)) throw new ErrorVisible('El teléfono no tiene un formato válido.');
  if (!validarLargo(direccion, 200)) throw new ErrorVisible('La dirección no puede pasar de 200 caracteres.');
  return { nombre, ciudad: ciudad || null, correo: correo || null, telefono: telefono || null, direccion: direccion || null };
}

export async function listar() {
  const [filas] = await bd.query(
    `SELECT ${CAMPOS},
            (SELECT COUNT(*) FROM usuarios u WHERE u.institucion_id = i.id AND u.activo = 1) AS usuarios,
            (SELECT COUNT(*) FROM leads l WHERE l.institucion_id = i.id) AS interesados,
            (SELECT s.plan FROM suscripciones s
              WHERE s.institucion_id = i.id AND s.estado = 'activa'
                AND s.fecha_inicio <= NOW() AND s.fecha_fin > NOW()
              ORDER BY s.fecha_inicio DESC LIMIT 1) AS plan_vigente
       FROM instituciones i ORDER BY i.creado_en DESC`
  );
  return filas;
}

export async function obtener(id) {
  const [[fila]] = await bd.query(`SELECT ${CAMPOS} FROM instituciones WHERE id = ?`, [id]);
  if (!fila) throw new ErrorVisible('Institución no encontrada.', 404);
  return fila;
}

export async function crear(cuerpo, solicitante, ip) {
  const datos = datosValidados(cuerpo);
  const [resultado] = await bd.query(
    'INSERT INTO instituciones (nombre, ciudad, correo_contacto, telefono, direccion) VALUES (?, ?, ?, ?, ?)',
    [datos.nombre, datos.ciudad, datos.correo, datos.telefono, datos.direccion]
  );
  await copiarAAjustes(resultado.insertId, datos);
  await registrarAuditoria({ usuarioId: solicitante.id, accion: 'institucion_creada', detalle: datos.nombre, ip });
  return obtener(resultado.insertId);
}

export async function editar(id, cuerpo, solicitante, ip) {
  const antes = await obtener(id);
  const datos = datosValidados(cuerpo);
  await bd.query(
    'UPDATE instituciones SET nombre = ?, ciudad = ?, correo_contacto = ?, telefono = ?, direccion = ? WHERE id = ?',
    [datos.nombre, datos.ciudad, datos.correo, datos.telefono, datos.direccion, id]
  );
  await copiarAAjustes(Number(id), datos);
  await registrarAuditoria({ usuarioId: solicitante.id, accion: 'institucion_editada', detalle: `${antes.nombre} → ${datos.nombre}`, ip });
  return obtener(id);
}

// no se borra: tiene usuarios, interesados y pagos colgando. al desactivarla, su gente
// deja de poder entrar (lo corta el middleware de autenticación).
export async function cambiarActivo(id, activo, solicitante, ip) {
  const institucion = await obtener(id);
  await bd.query('UPDATE instituciones SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
  await registrarAuditoria({
    usuarioId: solicitante.id,
    accion: activo ? 'institucion_activada' : 'institucion_desactivada',
    detalle: institucion.nombre,
    ip,
  });
  return { id: Number(id), activo: Boolean(activo) };
}

