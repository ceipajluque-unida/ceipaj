const CLAVE = 'ceipaj_accesibilidad';

export const POR_DEFECTO = {
  contraste: false,
  texto: 0,
  daltonismo: false,
  subrayar: false,
  lado: 'derecha',
};

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
