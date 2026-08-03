// capa http del módulo de configuración
import * as servicio from './servicio.js';
import { guardar as guardarImagen } from '../planes/imagen.js';
import { ErrorVisible } from '../../servidor/errores.js';

export async function obtener(req, res) {
  res.json(await servicio.obtenerConfiguracion(req.usuario.rol));
}

export async function guardar(req, res) {
  res.json(await servicio.guardarConfiguracion(req.body?.cambios, req.usuario, req.ip));
}

export async function probarCorreo(req, res) {
  const { para } = req.body ?? {};
  if (!para?.trim()) throw new ErrorVisible('Indicá un correo de destino para la prueba.');
  res.json(await servicio.probarCorreo(para.trim()));
}

export async function probarSms(req, res) {
  const { para } = req.body ?? {};
  if (!para?.trim()) throw new ErrorVisible('Indicá un número de destino para la prueba.');
  res.json(await servicio.probarSms(para.trim()));
}

// los textos legales los ve cualquiera, incluso sin sesión: van en el pie del sistema
export async function legales(req, res) {
  res.json(servicio.textosLegales());
}

// el fondo del ingreso: se guarda el archivo y en el ajuste queda solo su nombre
export async function guardarFondo(req, res) {
  const archivo = await guardarImagen(req.body?.imagen, 'fondo');
  await servicio.guardarConfiguracion({ IMAGEN_FONDO_INGRESO: archivo }, req.usuario, req.ip);
  res.json({ imagen: archivo });
}
