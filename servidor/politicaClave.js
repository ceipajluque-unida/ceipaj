import * as ajustes from './ajustesSistema.js';
import { POLITICA_CLAVE } from '../configuracion/ajustes.js';

const COMUNES = new Set([
  '12345678', '123456789', 'password', 'contrasena', 'contraseña', 'qwerty', '111111',
  '00000000', 'abcd1234', 'admin123', 'iloveyou', 'sistema', 'ceipaj', 'usuario', 'clave1234', 'password1',
]);

export function reglas() {
  return {
    largoMin: ajustes.leerNumero('CLAVE_LARGO_MIN', POLITICA_CLAVE.LARGO_MIN),
    mayus: ajustes.leerBooleano('CLAVE_MAYUS', POLITICA_CLAVE.MAYUS),
    minus: ajustes.leerBooleano('CLAVE_MINUS', POLITICA_CLAVE.MINUS),
    numero: ajustes.leerBooleano('CLAVE_NUMERO', POLITICA_CLAVE.NUMERO),
    especial: ajustes.leerBooleano('CLAVE_ESPECIAL', POLITICA_CLAVE.ESPECIAL),
    diasVigencia: ajustes.leerNumero('CLAVE_DIAS_VIGENCIA', POLITICA_CLAVE.DIAS_VIGENCIA),
  };
}

export function validar(clave) {
  const texto = String(clave ?? '');
  const r = reglas();
  if (texto.length < r.largoMin) return { valido: false, motivo: `La contraseña debe tener al menos ${r.largoMin} caracteres.` };
  if (r.mayus && !/[A-ZÁÉÍÓÚÑ]/.test(texto)) return { valido: false, motivo: 'La contraseña debe incluir al menos una letra mayúscula.' };
  if (r.minus && !/[a-záéíóúñ]/.test(texto)) return { valido: false, motivo: 'La contraseña debe incluir al menos una letra minúscula.' };
  if (r.numero && !/\d/.test(texto)) return { valido: false, motivo: 'La contraseña debe incluir al menos un número.' };
  if (r.especial && !/[^A-Za-z0-9áéíóúñÁÉÍÓÚÑ]/.test(texto)) return { valido: false, motivo: 'La contraseña debe incluir al menos un carácter especial.' };
  if (COMUNES.has(texto.toLowerCase())) return { valido: false, motivo: 'Esa contraseña es demasiado común: elegí otra.' };
  return { valido: true };
}

export function describir() {
  const r = reglas();
  const partes = [`al menos ${r.largoMin} caracteres`];
  if (r.mayus) partes.push('una mayúscula');
  if (r.minus) partes.push('una minúscula');
  if (r.numero) partes.push('un número');
  if (r.especial) partes.push('un carácter especial');
  return { reglas: r, texto: 'La contraseña debe tener ' + partes.join(', ') + '.' };
}
