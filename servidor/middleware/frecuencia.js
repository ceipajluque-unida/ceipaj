import * as ajustes from '../ajustesSistema.js';
import { SEGURIDAD } from '../../configuracion/ajustes.js';

const registros = new Map();

const MAXIMO_EN_MEMORIA = 5000;

function barrer(ahora) {
  for (const [clave, marcas] of registros) {
    if (marcas.length === 0 || marcas[marcas.length - 1] < ahora - 3600000) registros.delete(clave);
  }
}

export function frenoPorIp({ nombre, pedidos, segundos }) {
  return (req, res, siguiente) => {
    const tope = ajustes.leerNumero(`FRECUENCIA_${nombre.toUpperCase()}_PEDIDOS`, pedidos);
    if (tope <= 0) return siguiente();
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

export const frenoIngreso = frenoPorIp({ nombre: 'ingreso', ...SEGURIDAD.FRECUENCIA_INGRESO });
export const frenoRecuperacion = frenoPorIp({ nombre: 'recuperacion', ...SEGURIDAD.FRECUENCIA_RECUPERACION });
export const frenoGeneral = frenoPorIp({ nombre: 'general', ...SEGURIDAD.FRECUENCIA_GENERAL });
