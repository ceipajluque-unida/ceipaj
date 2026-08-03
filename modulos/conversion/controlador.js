import * as servicio from './servicio.js';
import * as recepcion from './recepcion.js';

export async function sincronizar(req, res) {
  res.json(await servicio.sincronizar(req.usuario.id, req.ip));
}

export async function matriculados(req, res) {
  res.json(await servicio.listarMatriculados());
}

export async function importar(req, res) {
  const { contenido } = req.body ?? {};
  res.status(201).json(await servicio.importarPlanilla(contenido, req.usuario.id, req.ip));
}

export async function ejemploCsv(req, res) {
  const filas = [
    'cedula;nombre;fecha_inscripcion',
    '4111222;María González;15/03/2026',
    '5222333;Juan Ramírez;20/03/2026',
    '3999888;Ana Benítez;02/04/2026',
  ].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="matriculados-ejemplo.csv"');

  res.send(`\ufeff${filas}\r\n`);
}

export async function recibir(req, res) {
  res.status(201).json(await recepcion.recibirMatriculados(req.body, req.ip));
}
