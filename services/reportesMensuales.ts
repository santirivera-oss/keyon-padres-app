// ==========================================
// 📄 SERVICIO DE REPORTES MENSUALES (v1.2)
// ==========================================
// Lee la colección `reportes_mensuales` que la Cloud Function
// `generarReportesMensuales` (SCANER-V3 v3.22.0) genera el día 1
// de cada mes. Cada reporte tiene shape:
//
// {
//   alumnoId, alumnoControl, alumnoNombre, grado, grupo, turno,
//   año, mes, periodoId,
//   asistencia: { diasAsistidos, retardos, ausencias, diasHabiles, porcentajeAsistencia },
//   calificaciones: { lista[], promedio, total },
//   disciplina: { lista[], negativos, positivos, totalPuntos },
//   tareas: { asignadas, entregadas, pctEntrega },
//   generadoEn: Timestamp,
// }

import { db } from './firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';

export interface CalificacionReporte {
  materia: string;
  periodo: string;
  calificacion: number;
  profesorNombre: string;
}

export interface ReporteDisciplinario {
  tipo: 'positivo' | 'negativo' | string;
  categoria: string;
  descripcion: string;
  gravedad: 'leve' | 'moderada' | 'grave' | string;
  puntos: number;
  fecha: string;
  reportadoPor: string;
}

export interface ReporteMensual {
  id: string;
  alumnoId: string;
  alumnoControl: string;
  alumnoNombre: string;
  grado: string;
  grupo: string;
  turno: string;
  año: number;
  mes: number;
  periodoId: string;
  asistencia: {
    diasAsistidos: number;
    retardos: number;
    ausencias: number;
    diasHabiles: number;
    porcentajeAsistencia: number;
  };
  calificaciones: {
    lista: CalificacionReporte[];
    promedio: number | null;
    total: number;
  };
  disciplina: {
    lista: ReporteDisciplinario[];
    negativos: number;
    positivos: number;
    totalPuntos: number;
  };
  tareas: {
    asignadas: number;
    entregadas: number;
    pctEntrega: number;
  };
  generadoEn: any;
}

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function nombreMes(mes: number): string {
  return NOMBRES_MES[(mes - 1) % 12] || '';
}

/**
 * Obtiene los últimos N reportes mensuales del alumno (por control).
 * Ordenados por periodoId descendente (mes más reciente primero).
 */
export async function obtenerReportesMensualesPorAlumno(
  alumnoControl: string,
  cantidad: number = 12
): Promise<ReporteMensual[]> {
  if (!alumnoControl) return [];

  try {
    const q = query(
      collection(db, 'reportes_mensuales'),
      where('alumnoControl', '==', alumnoControl),
      orderBy('periodoId', 'desc'),
      limit(cantidad)
    );
    const snap = await getDocs(q);
    const reportes: ReporteMensual[] = [];
    snap.forEach(doc => {
      reportes.push({ id: doc.id, ...(doc.data() as any) });
    });
    return reportes;
  } catch (e: any) {
    console.error('[reportesMensuales] error:', e?.message || e);
    // Si no hay índice, fallback a getDocs sin orderBy + ordenar en cliente
    if (e?.code === 'failed-precondition' || /index/i.test(e?.message || '')) {
      try {
        const q2 = query(
          collection(db, 'reportes_mensuales'),
          where('alumnoControl', '==', alumnoControl)
        );
        const snap2 = await getDocs(q2);
        const reportes: ReporteMensual[] = [];
        snap2.forEach(doc => {
          reportes.push({ id: doc.id, ...(doc.data() as any) });
        });
        reportes.sort((a, b) => (b.periodoId || '').localeCompare(a.periodoId || ''));
        return reportes.slice(0, cantidad);
      } catch (e2: any) {
        console.error('[reportesMensuales] fallback falló:', e2?.message);
        return [];
      }
    }
    return [];
  }
}

/**
 * Genera HTML del reporte mensual listo para imprimir/PDF.
 * Reusa la convención del pdfExport.ts existente.
 */
export function generarHTMLReporte(reporte: ReporteMensual): string {
  const m = nombreMes(reporte.mes);
  const colorAsist = reporte.asistencia.porcentajeAsistencia >= 90 ? '#22c55e' :
                     reporte.asistencia.porcentajeAsistencia >= 80 ? '#f59e0b' : '#ef4444';
  const colorProm = reporte.calificaciones.promedio === null ? '#7a7870' :
                    reporte.calificaciones.promedio >= 8 ? '#22c55e' :
                    reporte.calificaciones.promedio >= 7 ? '#f59e0b' : '#ef4444';

  const calificacionesHTML = reporte.calificaciones.lista.length
    ? reporte.calificaciones.lista.map(c => `
        <tr>
          <td>${escape(c.materia)}</td>
          <td>${escape(c.periodo)}</td>
          <td style="text-align:center;font-weight:600;color:${c.calificacion >= 7 ? '#22c55e' : '#ef4444'};">${c.calificacion}</td>
          <td>${escape(c.profesorNombre)}</td>
        </tr>`).join('')
    : `<tr><td colspan="4" style="text-align:center;color:#7a7870;padding:16px;">Sin calificaciones registradas en el mes</td></tr>`;

  const reportesHTML = reporte.disciplina.lista.length
    ? reporte.disciplina.lista.map(r => `
        <tr>
          <td>${escape(r.fecha)}</td>
          <td><span class="${r.tipo === 'positivo' ? 'pos' : 'neg'}">${r.tipo === 'positivo' ? '✓ Positivo' : '✗ Negativo'}</span></td>
          <td>${escape(r.categoria)}</td>
          <td>${escape(r.descripcion)}</td>
          <td style="text-align:center;">${r.tipo === 'positivo' ? '+' : ''}${r.puntos}</td>
        </tr>`).join('')
    : `<tr><td colspan="5" style="text-align:center;color:#7a7870;padding:16px;">Sin reportes en el mes</td></tr>`;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte Mensual · ${escape(reporte.alumnoNombre)} · ${m} ${reporte.año}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #191919; padding: 32px; max-width: 760px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #191919; }
  .subtitle { color: #7a7870; font-size: 13px; margin-bottom: 24px; }
  .header-card { background: #f7f6f2; border: 1px solid #e5e3dd; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; }
  .header-card .alumno { font-size: 18px; font-weight: 600; }
  .header-card .meta { color: #7a7870; font-size: 12px; margin-top: 4px; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 24px; }
  .stat-card { background: #f7f6f2; border: 1px solid #e5e3dd; border-radius: 10px; padding: 12px; }
  .stat-label { font-size: 10px; color: #7a7870; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .stat-value { font-size: 22px; font-weight: 700; }
  .stat-sub { font-size: 11px; color: #7a7870; margin-top: 2px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #7a7870; margin: 24px 0 8px; border-bottom: 1px solid #e5e3dd; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
  th { background: #f7f6f2; padding: 8px 10px; text-align: left; font-weight: 600; border-bottom: 1px solid #e5e3dd; color: #7a7870; font-size: 11px; text-transform: uppercase; }
  td { padding: 8px 10px; border-bottom: 1px solid #f0eee9; }
  .pos { color: #22c55e; font-weight: 600; font-size: 11px; }
  .neg { color: #ef4444; font-weight: 600; font-size: 11px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e3dd; font-size: 11px; color: #7a7870; text-align: center; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <h1>📄 Reporte Mensual</h1>
  <div class="subtitle">${m} ${reporte.año} · CBTis No. 001</div>

  <div class="header-card">
    <div class="alumno">${escape(reporte.alumnoNombre)}</div>
    <div class="meta">
      ${escape(reporte.grado)}° ${escape(reporte.grupo)} · Turno ${escape(reporte.turno || '—')} · Control ${escape(reporte.alumnoControl)}
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Asistencia</div>
      <div class="stat-value" style="color:${colorAsist};">${reporte.asistencia.porcentajeAsistencia}%</div>
      <div class="stat-sub">${reporte.asistencia.diasAsistidos} de ${reporte.asistencia.diasHabiles} días</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Retardos</div>
      <div class="stat-value" style="color:${reporte.asistencia.retardos >= 3 ? '#ef4444' : '#191919'};">${reporte.asistencia.retardos}</div>
      <div class="stat-sub">${reporte.asistencia.ausencias} ausencias</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Promedio</div>
      <div class="stat-value" style="color:${colorProm};">${reporte.calificaciones.promedio !== null ? reporte.calificaciones.promedio.toFixed(1) : '—'}</div>
      <div class="stat-sub">${reporte.calificaciones.total} calificación(es)</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Tareas</div>
      <div class="stat-value">${reporte.tareas.entregadas}/${reporte.tareas.asignadas}</div>
      <div class="stat-sub">${reporte.tareas.pctEntrega}% entrega</div>
    </div>
  </div>

  <h2>Calificaciones del mes</h2>
  <table>
    <thead><tr><th>Materia</th><th>Periodo</th><th style="text-align:center;">Calif.</th><th>Profesor</th></tr></thead>
    <tbody>${calificacionesHTML}</tbody>
  </table>

  <h2>Reportes de conducta</h2>
  <table>
    <thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th style="text-align:center;">Pts</th></tr></thead>
    <tbody>${reportesHTML}</tbody>
  </table>

  <div class="footer">
    Generado por Keyon · CBTis No. 001 — DGETI Registro 26-AT2099<br>
    ${reporte.disciplina.positivos} méritos · ${reporte.disciplina.negativos} faltas · Total puntos: ${reporte.disciplina.totalPuntos}
  </div>
</body>
</html>`;
}

function escape(s: any): string {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c] as string));
}

export default {
  obtenerReportesMensualesPorAlumno,
  generarHTMLReporte,
  nombreMes,
};
