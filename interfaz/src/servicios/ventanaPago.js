let ventana = null;

export function abrirVentanaPago() {
  const ancho = 480;
  const alto = 760;
  const izquierda = Math.max(0, Math.round((window.screen.width - ancho) / 2));
  const arriba = Math.max(0, Math.round((window.screen.height - alto) / 2));
  ventana = window.open('', 'ventana-pago', `popup=yes,width=${ancho},height=${alto},left=${izquierda},top=${arriba}`);
  if (!ventana) return false;
  try {
    ventana.opener = null;
    ventana.document.title = 'Pago seguro';
    ventana.document.body.style.cssText = 'font-family: system-ui, sans-serif; display: grid; place-items: center; height: 90vh; color: #444;';
    ventana.document.body.textContent = 'Conectando con la pasarela…';
  } catch { }
  return true;
}

export function llevarVentanaPagoA(url) {
  if (!ventana || ventana.closed) return false;
  ventana.location = url;
  ventana.focus();
  return true;
}

export function cerrarVentanaPago() {
  if (ventana && !ventana.closed) ventana.close();
  ventana = null;
}

export function hayVentanaPago() {
  return Boolean(ventana && !ventana.closed);
}
