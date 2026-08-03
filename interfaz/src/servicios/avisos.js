// avisos y confirmaciones con sweetalert2, teñidos según el tema
import Swal from 'sweetalert2';

// toma los colores del tema recién al mostrar el aviso
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

// devuelve true si el usuario confirma
export function confirmar({ titulo, texto, confirmar = 'Sí, continuar', peligro = false }) {
  return Swal.fire({
    ...base(),
    icon: peligro ? 'warning' : 'question',
    title: titulo,
    text: texto,
    showCancelButton: true,
    confirmButtonText: confirmar,
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
  }).then((resultado) => resultado.isConfirmed);
}

export function avisarExito(texto, titulo = 'Listo') {
  return Swal.fire({ ...base(), icon: 'success', title: titulo, text: texto });
}

export function avisarError(texto, titulo = 'No se pudo') {
  return Swal.fire({ ...base(), icon: 'error', title: titulo, text: texto });
}

// notificación chica arriba a la derecha, se va sola
const brindis = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2600, timerProgressBar: true });
export function toast(texto, icono = 'success') {
  const estilo = base();
  return brindis.fire({ background: estilo.background, color: estilo.color, icon: icono, title: texto });
}

// la clave se ve una sola vez, por eso se ofrece copiarla
// el texto lo arma quien llama y puede traer datos cargados por un usuario (un correo,
// un nombre), así que va escapado: acá se inyecta como html y no como texto
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
