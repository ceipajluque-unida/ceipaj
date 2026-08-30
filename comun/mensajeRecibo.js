// el mensaje que acompaña al pdf es el mismo para el recibo del pago y el de la comisión,
// así que se arma en un solo lugar y se puede probar sin salir a la red
export function armarMensajeDeRecibo({ numero, asunto, saludo, lineas = [], firma }) {
  const detalle = lineas
    .filter(([, valor]) => valor !== undefined && valor !== null && valor !== '')
    .map(([etiqueta, valor]) => `${etiqueta}: ${valor}`);

  return {
    asunto,
    archivo: `recibo-${numero}.pdf`,
    texto: [`${saludo}:`, '', `Adjuntamos el recibo ${numero}.`, '', ...detalle, '', firma].join('\n'),
  };
}
