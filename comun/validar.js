// validaciones
export function normalizarCedula(cedula) {
  return String(cedula ?? '').replace(/[.\s]/g, '');
}

// cédula paraguaya
export function validarCedula(cedula) {
  return /^\d{6,8}$/.test(normalizarCedula(cedula));
}

// los caracteres de marcado quedan afuera a propósito: el correo se muestra en avisos
// de pantalla, y con < y > se podía guardar html dentro de una dirección válida
export function validarCorreo(correo) {
  return /^[^\s@<>"'&/\\]+@[^\s@<>"'&/\\]+\.[^\s@<>"'&/\\]+$/.test(String(correo ?? '').trim());
}

export function validarTelefono(telefono) {
  const texto = String(telefono ?? '').trim();
  if (texto === '') return true; // el teléfono no es obligatorio
  return /^\+?[\d][\d\s-]{5,18}$/.test(texto);
}

// largo máximo de cada columna de texto de la base. mysql sin modo estricto
// recorta sin avisar, así que el corte tiene que ser un error visible acá.
export const LARGOS = {
  nombre: 100, correo: 150, institucion: 150, direccion: 150,
  telefono: 30, detalle: 500, concepto: 200, motivo: 200, cargo: 20,
};

export function validarLargo(valor, maximo) {
  return String(valor ?? '').trim().length <= maximo;
}
