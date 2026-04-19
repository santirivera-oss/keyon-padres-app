// ==========================================
// 🛡️ SERVICIO DE PREFECTURA / DISCIPLINA
// ==========================================
// Colecciones:
//   reportes       — reportes disciplinarios (meritos + deméritos)
//   pases_salida   — pases de salida digitales
//   citatorios     — citatorios a padres/tutores
//
// Los docs usan 'alumnoId' que puede ser el docId del alumno o su número
// de control; preferimos buscar por 'alumnoControl' cuando está presente.

import { db } from './firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  Unsubscribe,
  Timestamp,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

// ==========================================
// Tipos
// ==========================================

export type TipoReporte = 'positivo' | 'negativo';
export type GravedadReporte = 'leve' | 'moderada' | 'grave' | null;
export type EstadoPase = 'aprobado' | 'en_uso' | 'completado' | 'cancelado';
export type EstadoCitatorio = 'pendiente' | 'completado' | 'cancelado';

export interface ReporteDoc {
  id: string;
  alumnoId?: string;
  alumnoControl?: string;
  alumnoNombre?: string;
  alumnoGrado?: string;
  alumnoGrupo?: string;
  tipo: TipoReporte;
  categoria?: string;
  descripcion?: string;
  gravedad?: GravedadReporte;
  puntos: number;
  reportadoPor?: string;
  reportadoPorTipo?: string;
  fecha?: Timestamp;
  estado?: string;
}

export interface PaseSalidaDoc {
  id: string;
  codigoPase: string;
  alumnoId?: string;
  alumnoControl?: string;
  alumnoNombre: string;
  alumnoGrado?: string;
  alumnoGrupo?: string;
  motivo: string;
  motivoLabel: string;
  horaEstimadaRegreso?: string;
  observaciones?: string;
  estado: EstadoPase;
  autorizadoPor?: string;
  fecha: string;        // YYYY-MM-DD
  horaCreacion: string;
  horaSalida?: string | null;
  horaRegreso?: string | null;
}

export type RespuestaCitatorio = 'confirmado' | 'reagendar' | null;

export interface CitatorioDoc {
  id: string;
  alumnoId?: string;
  alumnoControl?: string;
  alumnoNombre: string;
  motivo: string;
  reporteId?: string;
  fechaCita: Timestamp | Date;
  estado: EstadoCitatorio;
  solicitadoPor?: string;
  respuestaTutor?: RespuestaCitatorio;
  notaTutor?: string;
  fechaRespuesta?: Timestamp | Date | null;
}

export interface DisciplinaResumen {
  puntos: number;        // base 100 + sum(puntos)
  meritos: number;       // suma de puntos positivos
  demeritos: number;     // suma absoluta de puntos negativos
  totalReportes: number;
  positivos: number;
  negativos: number;
  estado: 'Normal' | 'Alerta' | 'Crítico';
}

// ==========================================
// Helpers
// ==========================================

export function estadoPorPuntos(puntos: number): 'Normal' | 'Alerta' | 'Crítico' {
  if (puntos < 50) return 'Crítico';
  if (puntos < 70) return 'Alerta';
  return 'Normal';
}

export function resumirDisciplina(reportes: ReporteDoc[]): DisciplinaResumen {
  let meritos = 0, demeritos = 0, positivos = 0, negativos = 0;
  reportes.forEach(r => {
    const p = r.puntos || 0;
    if (r.tipo === 'positivo') { meritos += Math.abs(p); positivos++; }
    else { demeritos += Math.abs(p); negativos++; }
  });
  const puntos = 100 + meritos - demeritos;
  return {
    puntos,
    meritos,
    demeritos,
    totalReportes: reportes.length,
    positivos,
    negativos,
    estado: estadoPorPuntos(puntos),
  };
}

function tsMillis(t: any): number {
  if (!t) return 0;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (t instanceof Date) return t.getTime();
  if (typeof t === 'string' || typeof t === 'number') return new Date(t).getTime();
  return 0;
}

export function ordenarPorFechaDesc<T extends { fecha?: any; fechaCita?: any; fechaCreacion?: any }>(
  items: T[],
  campo: 'fecha' | 'fechaCita' | 'fechaCreacion' = 'fecha'
): T[] {
  return [...items].sort((a, b) => tsMillis((b as any)[campo]) - tsMillis((a as any)[campo]));
}

// ==========================================
// Reportes (disciplina)
// ==========================================

// Por compatibilidad con docs antiguos, escuchamos tanto alumnoControl
// como alumnoId. Como Firestore no soporta OR nativo en web v9, hacemos
// dos listeners y mergeamos localmente.
export function escucharReportes(
  alumnoControl: string,
  alumnoId: string | null,
  onData: (docs: ReporteDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const ref = collection(db, 'reportes');
  const byControl = query(ref, where('alumnoControl', '==', alumnoControl));
  const map: Record<string, ReporteDoc> = {};

  const emit = () => onData(ordenarPorFechaDesc(Object.values(map)));

  const u1 = onSnapshot(
    byControl,
    (snap) => {
      snap.docChanges().forEach(c => {
        const d = { id: c.doc.id, ...(c.doc.data() as any) } as ReporteDoc;
        if (c.type === 'removed') delete map[d.id]; else map[d.id] = d;
      });
      emit();
    },
    (err) => onError?.(err as Error)
  );

  // Fallback para reportes antiguos sin alumnoControl
  let u2: Unsubscribe | null = null;
  if (alumnoId) {
    const byId = query(ref, where('alumnoId', '==', alumnoId));
    u2 = onSnapshot(
      byId,
      (snap) => {
        snap.docChanges().forEach(c => {
          const d = { id: c.doc.id, ...(c.doc.data() as any) } as ReporteDoc;
          // Si el doc tiene alumnoControl y no coincide, ignorar
          if (d.alumnoControl && d.alumnoControl !== alumnoControl) return;
          if (c.type === 'removed') delete map[d.id]; else map[d.id] = d;
        });
        emit();
      },
      (err) => onError?.(err as Error)
    );
  }

  return () => {
    u1();
    u2?.();
  };
}

// ==========================================
// Pases de salida
// ==========================================

export function escucharPasesAlumno(
  alumnoControl: string,
  alumnoId: string | null,
  onData: (docs: PaseSalidaDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const ref = collection(db, 'pases_salida');
  const q1 = query(ref, where('alumnoControl', '==', alumnoControl));
  const map: Record<string, PaseSalidaDoc> = {};

  const emit = () => {
    const arr = Object.values(map).sort((a, b) => {
      // fecha DESC, luego horaCreacion DESC
      if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
      return (b.horaCreacion || '').localeCompare(a.horaCreacion || '');
    });
    onData(arr);
  };

  const u1 = onSnapshot(
    q1,
    (snap) => {
      snap.docChanges().forEach(c => {
        const d = { id: c.doc.id, ...(c.doc.data() as any) } as PaseSalidaDoc;
        if (c.type === 'removed') delete map[d.id]; else map[d.id] = d;
      });
      emit();
    },
    (err) => onError?.(err as Error)
  );

  let u2: Unsubscribe | null = null;
  if (alumnoId) {
    const q2 = query(ref, where('alumnoId', '==', alumnoId));
    u2 = onSnapshot(
      q2,
      (snap) => {
        snap.docChanges().forEach(c => {
          const d = { id: c.doc.id, ...(c.doc.data() as any) } as PaseSalidaDoc;
          if (d.alumnoControl && d.alumnoControl !== alumnoControl) return;
          if (c.type === 'removed') delete map[d.id]; else map[d.id] = d;
        });
        emit();
      },
      (err) => onError?.(err as Error)
    );
  }

  return () => { u1(); u2?.(); };
}

export function paseActivoHoy(pases: PaseSalidaDoc[]): PaseSalidaDoc | null {
  const hoy = new Date();
  const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;
  return pases.find(p => p.fecha === fechaHoy && (p.estado === 'aprobado' || p.estado === 'en_uso')) || null;
}

// ==========================================
// Citatorios
// ==========================================

export function escucharCitatorios(
  alumnoControl: string,
  alumnoId: string | null,
  onData: (docs: CitatorioDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const ref = collection(db, 'citatorios');
  const map: Record<string, CitatorioDoc> = {};

  const emit = () => onData(ordenarPorFechaDesc(Object.values(map), 'fechaCita' as any));

  // citatorios no suelen tener alumnoControl (modelo viejo) — buscar por alumnoId es lo usual
  const qs: Array<[string, any]> = [];
  if (alumnoId) qs.push(['alumnoId', alumnoId]);
  // compat futuro: si algún día se agrega alumnoControl
  qs.push(['alumnoControl', alumnoControl]);

  const unsubs = qs.map(([field, value]) =>
    onSnapshot(
      query(ref, where(field, '==', value)),
      (snap) => {
        snap.docChanges().forEach(c => {
          const d = { id: c.doc.id, ...(c.doc.data() as any) } as CitatorioDoc;
          if (c.type === 'removed') delete map[d.id]; else map[d.id] = d;
        });
        emit();
      },
      (err) => onError?.(err as Error)
    )
  );

  return () => unsubs.forEach(u => u());
}

/**
 * Tutor responde al citatorio (confirma asistencia o solicita reagendar).
 * El doc queda como pendiente para que prefectura lo vea y actúe.
 */
export async function responderCitatorio(
  citatorioId: string,
  respuesta: 'confirmado' | 'reagendar',
  nota: string = ''
): Promise<void> {
  const ref = doc(db, 'citatorios', citatorioId);
  await updateDoc(ref, {
    respuestaTutor: respuesta,
    notaTutor: nota || '',
    fechaRespuesta: serverTimestamp(),
  });
}

export function colorPuntos(puntos: number): 'success' | 'warning' | 'danger' {
  if (puntos < 50) return 'danger';
  if (puntos < 70) return 'warning';
  return 'success';
}

export function colorEstadoPase(estado: EstadoPase): 'success' | 'warning' | 'muted' | 'danger' {
  switch (estado) {
    case 'aprobado': return 'success';
    case 'en_uso': return 'warning';
    case 'completado': return 'muted';
    case 'cancelado': return 'danger';
  }
}

export function labelEstadoPase(estado: EstadoPase): string {
  switch (estado) {
    case 'aprobado': return 'Aprobado';
    case 'en_uso': return 'Fuera';
    case 'completado': return 'Completado';
    case 'cancelado': return 'Cancelado';
  }
}

const prefecturaService = {
  escucharReportes,
  escucharPasesAlumno,
  escucharCitatorios,
  responderCitatorio,
  resumirDisciplina,
  paseActivoHoy,
  estadoPorPuntos,
  colorPuntos,
  colorEstadoPase,
  labelEstadoPase,
  ordenarPorFechaDesc,
};

export default prefecturaService;
