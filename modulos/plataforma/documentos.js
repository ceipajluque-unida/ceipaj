import { aCsv, aXlsx, aPdf } from '../../comun/tablaExportable.js';
import * as servicio from './servicio.js';
import { PLATAFORMA } from '../../configuracion/ajustes.js';
import { fechaLocal } from '../../comun/fechas.js';

// los tres reportes del negocio del proveedor. no reusan el modulo de reportes
// porque aquel filtra por institucion y estos miran todas juntas.

const fecha = (v) => fechaLocal(v, 'dia');
const ESTADO_PLAN = { vigente: 'Vigente', vencido: 'Vencido', sin_plan: 'Nunca contrató' };

const REPORTES = {
  planes: {
    titulo: 'Ingresos por plan',
    encabezados: ['Plan', 'Precio mensual (Gs.)', 'Instituciones con el plan',
      'Períodos vendidos', 'Cobrado (Gs.)', 'Ingreso mensual aproximado (Gs.)', 'Participación (%)'],
    async filas() {
      return (await servicio.porPlan()).map((p) => [
        p.titulo, Number(p.precio), Number(p.institucionesVigentes), Number(p.periodosVendidos),
        Number(p.recaudado), Number(p.ingresoMensual), p.participacion,
      ]);
    },
  },
  instituciones: {
    titulo: 'Instituciones',
    encabezados: ['Institución', 'Ciudad', 'Estado', 'Plan', 'Situación del plan',
      'Vence o venció', 'Usuarios', 'Aliados', 'Interesados', 'Pagado (Gs.)', 'Alta'],
    async filas() {
      return (await servicio.porInstitucion()).map((i) => [
        i.nombre, i.ciudad ?? '', i.activo ? 'Activa' : 'Suspendida',
        i.planVigente ?? i.ultimoPlan ?? '', ESTADO_PLAN[i.estadoPlan],
        fecha(i.venceEl ?? i.vencioEl), Number(i.usuarios), Number(i.aliados),
        Number(i.interesados), Number(i.pagado), fecha(i.creado_en),
      ]);
    },
  },
  meses: {
    titulo: 'Recaudación por mes',
    encabezados: ['Mes', 'Pagos acreditados', 'Instituciones que pagaron', 'Recaudado (Gs.)'],
    async filas() {
      return (await servicio.porMes(36)).map((m) => [
        m.mes, Number(m.pagos), Number(m.instituciones), Number(m.recaudado),
      ]);
    },
  },
};

export const REPORTES_DISPONIBLES = Object.keys(REPORTES);
export const tituloDe = (clave) => REPORTES[clave]?.titulo ?? clave;

async function datos(clave) {
  const reporte = REPORTES[clave];
  return { titulo: reporte.titulo, encabezados: reporte.encabezados, filas: await reporte.filas() };
}

export async function generarCsv(clave) {
  return aCsv(await datos(clave));
}

export async function generarXlsx(clave) {
  const { titulo, encabezados, filas } = await datos(clave);
  return aXlsx({ titulo, autor: PLATAFORMA.NOMBRE, encabezados, filas });
}

export async function generarPdf(clave) {
  const { titulo, encabezados, filas } = await datos(clave);
  return aPdf({ titulo: `${PLATAFORMA.NOMBRE}: ${titulo}`, encabezados, filas });
}
