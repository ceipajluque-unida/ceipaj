// revisa que lo que llega a configuración tenga el tipo y el rango que declara el
// catálogo. sin esto el backend aceptaba cualquier cosa: un texto en el mínimo de la
// contraseña dejaba la política en NaN y la apagaba entera.
import { CATALOGO } from './ajustesSistema.js';
import { ErrorVisible } from './errores.js';

const POR_CLAVE = new Map(CATALOGO.flatMap((grupo) => grupo.ajustes.map((a) => [a.clave, a])));

// tope de caracteres según el tipo de campo
const LARGO_MAXIMO = { texto: 300, secreto: 300, parrafo: 2000, documento: 50000 };

export function validarAjuste(clave, valor) {
  const ajuste = POR_CLAVE.get(clave);
  if (!ajuste) throw new ErrorVisible(`El ajuste "${clave}" no existe.`);
  const texto = valor == null ? '' : String(valor);

  if (ajuste.tipo === 'numero') {
    const numero = Number(texto);
    if (texto.trim() === '' || !Number.isInteger(numero)) {
      throw new ErrorVisible(`"${ajuste.etiqueta}" tiene que ser un número entero.`);
    }
    const min = ajuste.min ?? 0;
    const max = ajuste.max ?? Number.MAX_SAFE_INTEGER;
    if (numero < min || numero > max) {
      throw new ErrorVisible(`"${ajuste.etiqueta}" va entre ${min} y ${max}.`);
    }
    return String(numero);
  }

  if (ajuste.tipo === 'booleano') {
    if (texto !== '1' && texto !== '0') throw new ErrorVisible(`"${ajuste.etiqueta}" solo acepta sí o no.`);
    return texto;
  }

  if (ajuste.tipo === 'opcion') {
    // las opciones vienen como {valor, texto} o como cadenas sueltas, según el ajuste
    const admitidos = (ajuste.opciones ?? []).map((o) => (typeof o === 'string' ? o : o.valor));
    if (!admitidos.includes(texto)) throw new ErrorVisible(`"${ajuste.etiqueta}" no admite ese valor.`);
    return texto;
  }

  const maximo = LARGO_MAXIMO[ajuste.tipo] ?? 300;
  if (texto.length > maximo) {
    throw new ErrorVisible(`"${ajuste.etiqueta}" se pasa de ${maximo.toLocaleString('es-PY')} caracteres (tiene ${texto.length.toLocaleString('es-PY')}).`);
  }
  return texto;
}
