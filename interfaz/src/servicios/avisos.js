import Swal from 'sweetalert2';

function base() {
  const css = getComputedStyle(document.documentElement);
  const leer = (nombre, porDefecto) => css.getPropertyValue(nombre).trim() || porDefecto;
  return {
    background: leer('--panel', '#ffffff'),
    color: leer('--texto', '#1f2430'),
    confirmButtonColor: leer('--acento', '#4f7cff'),
    cancelButtonColor: leer('--texto-suave', '#8a8fa3'),
  };
}

let confirmando = false;

export async function confirmar({ titulo, texto, confirmar = 'Sí, continuar', peligro = false }) {
  if (confirmando) return false;
  confirmando = true;
  try {
    return await Swal.fire({
    ...base(),
    icon: peligro ? 'warning' : 'question',
    title: titulo,
    text: texto,
    showCancelButton: true,
    confirmButtonText: confirmar,
    cancelButtonText: 'Cancelar',
      reverseButtons: true,
    }).then((resultado) => resultado.isConfirmed);
  } finally {
    confirmando = false;
  }
}

// confirmacion que ademas pide la contraseña, para las acciones que aflojan
// la seguridad de la propia cuenta
export async function pedirClave({ titulo, texto, confirmar = 'Confirmar' }) {
  const resultado = await Swal.fire({
    ...base(),
    icon: 'warning',
    title: titulo,
    text: texto,
    input: 'password',
    inputAttributes: { autocomplete: 'current-password', autocapitalize: 'off' },
    inputPlaceholder: 'Tu contraseña actual',
    showCancelButton: true,
    confirmButtonText: confirmar,
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    inputValidator: (valor) => (valor ? undefined : 'Escribí tu contraseña.'),
  });
  return resultado.isConfirmed ? resultado.value : null;
}

// igual que pedirClave, pero para escribir un motivo que queda registrado
export async function pedirTexto({ titulo, texto, marcador = '', confirmar = 'Confirmar', largo = 200 }) {
  const resultado = await Swal.fire({
    ...base(),
    icon: 'warning',
    title: titulo,
    text: texto,
    input: 'text',
    inputAttributes: { maxlength: String(largo), autocapitalize: 'sentences' },
    inputPlaceholder: marcador,
    showCancelButton: true,
    confirmButtonText: confirmar,
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    inputValidator: (valor) => (String(valor ?? '').trim() ? undefined : 'Escribí el motivo.'),
  });
  return resultado.isConfirmed ? String(resultado.value).trim() : null;
}

export function avisarExito(texto, titulo = 'Listo') {
  return Swal.fire({ ...base(), icon: 'success', title: titulo, text: texto });
}

export function avisarError(texto, titulo = 'Error') {
  return Swal.fire({ ...base(), icon: 'error', title: titulo, text: texto });
}

const brindis = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2600, timerProgressBar: true });
export function toast(texto, icono = 'success') {
  const estilo = base();
  return brindis.fire({ background: estilo.background, color: estilo.color, icon: icono, title: texto });
}

export async function exitoProcesando(texto) {
  Swal.fire({
    ...base(),
    title: 'Procesando el pago…',
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading(),
  });
  await new Promise((listo) => setTimeout(listo, 900));
  return Swal.fire({
    ...base(),
    icon: 'success',
    title: texto,
    timer: 2600,
    timerProgressBar: true,
    showConfirmButton: false,
  });
}

const escapar = (valor) => String(valor ?? '').replace(/[&<>"']/g, (caracter) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[caracter]));

export function mostrarClave(clave, texto, resaltado = '') {
  const encabezado = resaltado
    ? `${escapar(texto)} <strong>${escapar(resaltado)}</strong>`
    : escapar(texto);
  return Swal.fire({
    ...base(),
    icon: 'info',
    title: 'Clave temporal',
    html: `${encabezado}<br><br><code style="font-size:1.3rem;letter-spacing:1px">${escapar(clave)}</code>`,
    confirmButtonText: 'Copiar y cerrar',
  }).then(() => navigator.clipboard?.writeText(clave).catch(() => {}));
}
