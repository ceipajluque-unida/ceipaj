// error pensado para mostrarse al usuario, con mensaje claro y código http
export class ErrorVisible extends Error {
  constructor(mensaje, estadoHttp = 400) {
    super(mensaje);
    this.estadoHttp = estadoHttp;
  }
}
