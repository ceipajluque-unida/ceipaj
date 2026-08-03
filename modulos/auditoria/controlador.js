import * as servicio from './servicio.js';

export async function listar(req, res) {
  const { buscar, accion, pagina } = req.query ?? {};
  res.json(await servicio.listarAuditoria({ buscar, accion, pagina }));
}
