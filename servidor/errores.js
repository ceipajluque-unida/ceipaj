export class ErrorVisible extends Error {
  constructor(mensaje, estadoHttp = 400) {
    super(mensaje);
    this.estadoHttp = estadoHttp;
  }
}
