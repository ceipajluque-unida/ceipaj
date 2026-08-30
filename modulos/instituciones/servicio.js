import { bd } from '../../servidor/bd/conexion.js';
import { registrarAuditoria } from '../../servidor/auditoria.js';
import { ErrorVisible } from '../../servidor/errores.js';
import { validarCorreo, validarTelefono, validarLargo, LARGOS } from '../../comun/validar.js';
import * as ajustes from '../../servidor/ajustesSistema.js';
import { correoConfigurado } from '../../servidor/correo.js';
import { conInstitucion } from '../../servidor/contexto.js';
import { listar as listarRoles } from '../roles/servicio.js';
import { ROLES } from '../../configuracion/ajustes.js';
import { planEnVigor, moduloIncluido } from '../suscripciones/plan.js';

const CAMPOS = 'id, nombre, ciudad, correo_contacto, telefono, direccion, activo, creado_en';

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
            (SELECT COUNT(*) FROM usuarios u WHERE u.institucion_id = i.id AND u.rol = ? AND u.activo = 1) AS administradores,
            (SELECT s.plan FROM suscripciones s
              WHERE s.institucion_id = i.id AND s.estado = 'activa'
                AND s.fecha_inicio <= NOW() AND s.fecha_fin > NOW()
              ORDER BY s.fecha_inicio DESC LIMIT 1) AS plan_vigente
       FROM instituciones i ORDER BY i.creado_en DESC`,
    [ROLES.ADMINISTRADOR]
  );
  // el smtp es un ajuste de cada colegio: se resuelve con su contexto, no con el del proveedor
  return filas.map((fila) => ({ ...fila, correoActivo: conInstitucion(fila.id, correoConfigurado) }));
}

export async function obtener(id) {
  const [[fila]] = await bd.query(`SELECT ${CAMPOS} FROM instituciones WHERE id = ?`, [id]);
  if (!fila) throw new ErrorVisible('Institución no encontrada.', 404);
  return fila;
}

export async function crear(cuerpo, solicitante, ip) {
  const datos = datosValidados(cuerpo);
  const [[{ total }]] = await bd.query('SELECT COUNT(*) AS total FROM instituciones');
  if (Number(total) > 0) {
    throw new ErrorVisible('Solo se permite una institución y ya hay una registrada.', 409);
  }
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
  await registrarAuditoria({ usuarioId: solicitante.id, accion: 'institucion_editada', detalle: `cambió el nombre de ${antes.nombre} a ${datos.nombre}`, ip });
  return obtener(id);
}

export async function detalleRoles(id) {
  await obtener(id);
  const [filas] = await bd.query(
    'SELECT rol, COUNT(*) AS total, SUM(activo = 1) AS activos FROM usuarios WHERE institucion_id = ? GROUP BY rol',
    [id]
  );
  const porRol = new Map(filas.map((fila) => [fila.rol, fila]));
  const plan = await conInstitucion(Number(id), () => planEnVigor());

  const activosDe = (rol) => Number(porRol.get(rol)?.activos ?? 0);
  const internos = [ROLES.ADMINISTRADOR, ROLES.COMERCIAL, ROLES.DIRECCION].reduce((suma, rol) => suma + activosDe(rol), 0);

  return {
    plan: plan.vigente ? plan.clave : null,
    // cupos del plan, para que la pantalla muestre cuánto queda y no solo cuánto hay
    cupo: {
      plan: plan.texto,
      usuarios: internos,
      maxUsuarios: plan.maxUsuarios ?? null,
      aliados: activosDe(ROLES.ALIADO),
      maxAliados: plan.maxAliados ?? null,
    },
    roles: (await listarRoles())
      .filter((r) => r.activo && r.clave !== ROLES.SUPERADMINISTRADOR)
      .map((r) => {
        const fila = porRol.get(r.clave);
        return {
          rol: r.clave,
          titulo: r.titulo,
          usuarios: Number(fila?.total ?? 0),
          activos: Number(fila?.activos ?? 0),
          modulos: r.modulos.filter((modulo) => moduloIncluido(plan, modulo)),
        };
      }),
  };
}

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
