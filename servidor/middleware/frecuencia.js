// control de frecuencia por dirección ip, con ventana deslizante en memoria. los frenos
// de bloqueos.js son por correo y por usuario: este cubre el hueco de quien martilla una
// ruta pública variando el correo en cada intento.
import * as ajustes from '../ajustesSistema.js';
import { SEGURIDAD } from '../../configuracion/ajustes.js';

const registros = new Map();

// limpieza perezosa: se barre al pasar el umbral, así no hace falta un temporizador
const MAXIMO_EN_MEMORIA = 5000;

function barrer(ahora) {
  for (const [clave, marcas] of registros) {
    if (marcas.length === 0 || marcas[marcas.length - 1] < ahora - 3600000) registros.delete(clave);
  }
}

export function frenoPorIp({ nombre, pedidos, segundos }) {
  return (req, res, siguiente) => {
    const tope = ajustes.leerNumero(`FRECUENCIA_${nombre.toUpperCase()}_PEDIDOS`, pedidos);
    if (tope <= 0) return siguiente(); // en 0 queda apagado
    const ventana = segundos * 1000;
    const ahora = Date.now();
    const clave = `${nombre}:${req.ip}`;
    const marcas = (registros.get(clave) ?? []).filter((marca) => marca > ahora - ventana);

    if (marcas.length >= tope) {
      const esperar = Math.ceil((marcas[0] + ventana - ahora) / 1000);
      res.set('Retry-After', String(esperar));
      return res.status(429).json({
        error: `Demasiados intentos desde esta conexión. Probá de nuevo en ${esperar} segundo(s).`,
      });
    }

    marcas.push(ahora);
    registros.set(clave, marcas);
    if (registros.size > MAXIMO_EN_MEMORIA) barrer(ahora);
    return siguiente();
  };
}

// topes por defecto de las rutas públicas, configurables desde ajustes
export const frenoIngreso = frenoPorIp({ nombre: 'ingreso', ...SEGURIDAD.FRECUENCIA_INGRESO });
export const frenoRecuperacion = frenoPorIp({ nombre: 'recuperacion', ...SEGURIDAD.FRECUENCIA_RECUPERACION });
export const frenoGeneral = frenoPorIp({ nombre: 'general', ...SEGURIDAD.FRECUENCIA_GENERAL });
