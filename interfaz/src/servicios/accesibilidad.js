// preferencias de accesibilidad: se guardan por navegador y se aplican al documento
const CLAVE = 'ceipaj_accesibilidad';

export const POR_DEFECTO = {
  contraste: false,
  texto: 0, // -1 chico, 0 normal, 1 grande, 2 más grande
  daltonismo: false,
  subrayar: false,
  lado: 'derecha',
};

// cada escalón cambia la base en rem, y como todo mide en rem escala parejo
const TAMANOS = { '-1': '14px', 0: '15px', 1: '17px', 2: '19px' };

export function leer() {
  try {
    return { ...POR_DEFECTO, ...JSON.parse(localStorage.getItem(CLAVE) ?? '{}') };
  } catch {
    return { ...POR_DEFECTO };
  }
}

export function guardar(preferencias) {
  localStorage.setItem(CLAVE, JSON.stringify(preferencias));
  aplicar(preferencias);
}

export function aplicar(preferencias = leer()) {
  const raiz = document.documentElement;
  raiz.dataset.contraste = preferencias.contraste ? 'alto' : '';
  raiz.dataset.daltonismo = preferencias.daltonismo ? 'si' : '';
  raiz.dataset.subrayar = preferencias.subrayar ? 'si' : '';
  raiz.style.fontSize = TAMANOS[String(preferencias.texto)] ?? TAMANOS[0];
}
