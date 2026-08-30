let ventana = null;

export function abrirVentanaPago() {
  // a pantalla completa: el checkout de la pasarela necesita espacio y una
  // ventana chica obliga a desplazarse para llegar al boton de pagar
  const ancho = window.screen.availWidth;
  const alto = window.screen.availHeight;
  ventana = window.open('', 'ventana-pago', `popup=yes,width=${ancho},height=${alto},left=0,top=0`);
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
