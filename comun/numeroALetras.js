const UNIDADES = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho',
  'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco',
  'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];

const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];

const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function apocopar(texto) {
  if (texto.endsWith('veintiuno')) return `${texto.slice(0, -9)}veintiún`;
  if (texto.endsWith('uno')) return `${texto.slice(0, -3)}un`;
  return texto;
}

function hasta999(numero) {
  if (numero < 30) return UNIDADES[numero];
  if (numero < 100) {
    const decena = DECENAS[Math.floor(numero / 10)];
    const unidad = numero % 10;
    return unidad ? `${decena} y ${UNIDADES[unidad]}` : decena;
  }
  if (numero === 100) return 'cien';
  const resto = numero % 100;
  const centena = CENTENAS[Math.floor(numero / 100)];
  return resto ? `${centena} ${hasta999(resto)}` : centena;
}

function hastaMillon(numero) {
  if (numero < 1000) return hasta999(numero);
  const miles = Math.floor(numero / 1000);
  const resto = numero % 1000;
  const texto = miles === 1 ? 'mil' : `${apocopar(hasta999(miles))} mil`;
  return resto ? `${texto} ${hasta999(resto)}` : texto;
}

export function enLetras(monto) {
  const entero = Math.trunc(Math.abs(Number(monto) || 0));
  if (entero < 1000000) return hastaMillon(entero);
  const millones = Math.floor(entero / 1000000);
  const resto = entero % 1000000;
  const texto = millones === 1 ? 'un millón' : `${apocopar(hastaMillon(millones))} millones`;
  return resto ? `${texto} ${hastaMillon(resto)}` : texto;
}

export function guaraniesEnLetras(monto) {
  const texto = enLetras(monto);
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)} guaraníes`;
}
