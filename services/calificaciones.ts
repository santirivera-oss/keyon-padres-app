// ==========================================
// 📊 SERVICIO DE CALIFICACIONES
// ==========================================
// Colección: calificaciones
// Doc shape: alumnoId, alumnoNombre, profesorId, profesorNombre, materia,
//            grupo, grado, periodo (P1|P2|P3|ORD|EXT), cicloEscolar,
//            calificacion (number), comentario, updatedAt, createdAt

import { db } from './firebase';
import { collection, query, where, getDocs, onSnapshot, Unsubscribe } from 'firebase/firestore';

export type PeriodoId = 'P1' | 'P2' | 'P3' | 'ORD' | 'EXT';

export interface CalificacionDoc {
  id: string;
  tipo?: 'periodo' | 'tarea';
  alumnoId: string;
  alumnoNombre?: string;
  profesorId: string;
  profesorNombre?: string;
  materia: string;
  grupo?: string;
  grado?: string;
  periodo?: PeriodoId;
  cicloEscolar?: string;
  calificacion: number;
  comentario?: string;
  // Sólo en docs tipo 'tarea'
  tareaId?: string;
  puntosMaximos?: number;
  fechaCalificacion?: any;
  updatedAt?: any;
  createdAt?: any;
}

export interface CalificacionTareaUI {
  tareaId: string;
  titulo: string;
  materia: string;
  profesorNombre: string;
  calificacion: number;
  puntosMaximos: number;
  en10: number;
}

export interface MateriaTareas {
  materia: string;
  profesorNombre: string;
  tareas: CalificacionTareaUI[];
  promedio: number | null;
}

export interface MateriaCalificaciones {
  materia: string;
  profesorNombre: string;
  periodos: Partial<Record<PeriodoId, { calificacion: number; comentario: string }>>;
  promedio: number | null;
}

export const PERIODOS: { id: PeriodoId; label: string; largo: string }[] = [
  { id: 'P1', label: 'P1', largo: 'Parcial 1' },
  { id: 'P2', label: 'P2', largo: 'Parcial 2' },
  { id: 'P3', label: 'P3', largo: 'Parcial 3' },
  { id: 'ORD', label: 'Ord', largo: 'Ordinario' },
  { id: 'EXT', label: 'Ext', largo: 'Extraordinario' },
];

function promedioDe(valores: (number | null | undefined)[]): number | null {
  const nums = valores.filter((v): v is number => typeof v === 'number' && !isNaN(v));
  if (!nums.length) return null;
  const s = nums.reduce((a, b) => a + b, 0);
  return Math.round((s / nums.length) * 10) / 10;
}

// Filtra los docs que son de tipo 'periodo' (calificación final por parcial)
export function esDocPeriodo(c: CalificacionDoc): boolean {
  if (c.tipo === 'tarea' || c.tareaId) return false;
  return c.tipo === 'periodo' || !!c.periodo;
}

// Filtra los docs que son de tipo 'tarea'
export function esDocTarea(c: CalificacionDoc): boolean {
  return c.tipo === 'tarea' || !!c.tareaId;
}

export function agruparPorMateria(docs: CalificacionDoc[]): MateriaCalificaciones[] {
  const map: Record<string, MateriaCalificaciones> = {};

  docs.filter(esDocPeriodo).forEach((c) => {
    const key = c.materia || 'Sin materia';
    if (!map[key]) {
      map[key] = {
        materia: key,
        profesorNombre: c.profesorNombre || '',
        periodos: {},
        promedio: null,
      };
    }
    if (c.periodo) {
      const cal = typeof c.calificacion === 'number' ? c.calificacion : parseFloat(c.calificacion as any);
      if (!isNaN(cal)) {
        map[key].periodos[c.periodo] = {
          calificacion: cal,
          comentario: c.comentario || '',
        };
      }
    }
  });

  const result = Object.values(map).map((m) => {
    const vals = Object.values(m.periodos).map((p) => p!.calificacion);
    return { ...m, promedio: promedioDe(vals) };
  });

  return result.sort((a, b) => a.materia.localeCompare(b.materia, 'es'));
}

// Agrupa calificaciones de tareas (normalizadas a escala 10) por materia.
// Necesita un map de tareasInfo (tareaId -> {titulo, materia, puntosMaximos, profesorNombre})
// para enriquecer docs antiguos que no tienen materia/titulo en el doc de calificación.
export function agruparTareasPorMateria(
  docs: CalificacionDoc[],
  tareasInfo: Record<string, { titulo: string; materia: string; puntosMaximos: number; profesorNombre: string }>
): MateriaTareas[] {
  const map: Record<string, MateriaTareas> = {};

  docs.filter(esDocTarea).forEach((c) => {
    const info = (c.tareaId && tareasInfo[c.tareaId]) || ({} as any);
    const materia: string = info.materia || c.materia || 'Sin materia';
    const titulo: string = info.titulo || 'Tarea';
    const puntosMaximos: number = info.puntosMaximos || c.puntosMaximos || 10;
    const profesorNombre: string = info.profesorNombre || c.profesorNombre || '';
    const cal = typeof c.calificacion === 'number' ? c.calificacion : parseFloat(c.calificacion as any);
    if (isNaN(cal)) return;
    const en10 = puntosMaximos === 10 ? cal : (cal / puntosMaximos) * 10;

    if (!map[materia]) {
      map[materia] = { materia, profesorNombre, tareas: [], promedio: null };
    }
    map[materia].tareas.push({
      tareaId: c.tareaId || c.id,
      titulo,
      materia,
      profesorNombre,
      calificacion: cal,
      puntosMaximos,
      en10: Math.round(en10 * 10) / 10
    });
  });

  Object.values(map).forEach((m) => {
    m.promedio = promedioDe(m.tareas.map((t) => t.en10));
  });

  return Object.values(map).sort((a, b) => a.materia.localeCompare(b.materia, 'es'));
}

// Resuelve info de tareas (titulo, materia) en lotes de hasta 30 ids
import { documentId, getDoc, doc as docRef } from 'firebase/firestore';
export async function resolverInfoTareas(
  tareaIds: string[]
): Promise<Record<string, { titulo: string; materia: string; puntosMaximos: number; profesorNombre: string }>> {
  const out: Record<string, any> = {};
  if (!tareaIds.length) return out;

  // getDoc en paralelo (más simple que armar in-queries por chunk)
  const promesas = tareaIds.map(async (id) => {
    try {
      const ref = docRef(db, 'tareas', id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const t = snap.data() as any;
        out[id] = {
          titulo: t.titulo || 'Tarea',
          materia: t.materia || '',
          puntosMaximos: t.puntosMaximos || 10,
          profesorNombre: t.profesorNombre || ''
        };
      }
    } catch (e) {
      console.warn('resolverInfoTareas error:', id, e);
    }
  });
  await Promise.all(promesas);
  return out;
}

export function calcularPromedioGeneral(materias: MateriaCalificaciones[]): number | null {
  return promedioDe(materias.map((m) => m.promedio));
}

export function contarAprobadasReprobadas(materias: MateriaCalificaciones[]): { aprobadas: number; reprobadas: number } {
  let aprobadas = 0;
  let reprobadas = 0;
  materias.forEach((m) => {
    if (m.promedio == null) return;
    if (m.promedio >= 6) aprobadas++;
    else reprobadas++;
  });
  return { aprobadas, reprobadas };
}

export function colorPorCalificacion(n: number | null | undefined): 'success' | 'emerald' | 'primary' | 'danger' | 'muted' {
  if (n == null || isNaN(n)) return 'muted';
  if (n >= 9) return 'success';
  if (n >= 8) return 'emerald';
  if (n >= 6) return 'primary';
  return 'danger';
}

export async function obtenerCalificaciones(alumnoId: string): Promise<CalificacionDoc[]> {
  try {
    const ref = collection(db, 'calificaciones');
    const q = query(ref, where('alumnoId', '==', alumnoId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as CalificacionDoc[];
  } catch (error) {
    console.error('Error obteniendo calificaciones:', error);
    return [];
  }
}

export function escucharCalificaciones(
  alumnoId: string,
  onData: (docs: CalificacionDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const ref = collection(db, 'calificaciones');
  const q = query(ref, where('alumnoId', '==', alumnoId));
  return onSnapshot(
    q,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as CalificacionDoc[];
      onData(docs);
    },
    (err) => {
      console.error('Listener calificaciones:', err);
      if (onError) onError(err as Error);
    }
  );
}

const calificacionesService = {
  PERIODOS,
  obtenerCalificaciones,
  escucharCalificaciones,
  agruparPorMateria,
  agruparTareasPorMateria,
  resolverInfoTareas,
  esDocPeriodo,
  esDocTarea,
  calcularPromedioGeneral,
  contarAprobadasReprobadas,
  colorPorCalificacion,
};

export default calificacionesService;
