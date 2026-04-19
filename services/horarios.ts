// ==========================================
// 📅 SERVICIO DE HORARIOS
// ==========================================
// Obtiene horarios de clases desde Firebase

import { db } from './firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { 
  HorarioFirebase, 
  ClaseHorario, 
  DiaSemana,
  MODULOS_HORARIO,
  MODULOS_HORARIO_MATUTINO 
} from '../types';

// ==========================================
// 🔧 HELPERS
// ==========================================

/**
 * Obtener el día de la semana en español
 */
export function getDiaActual(): DiaSemana | null {
  const dias: (DiaSemana | null)[] = [
    null, // Domingo
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    null, // Sábado
  ];
  return dias[new Date().getDay()];
}

/**
 * Obtener nombre del día por índice (0 = Lunes)
 */
export function getNombreDia(index: number): DiaSemana {
  const dias: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  return dias[index] || 'Lunes';
}

/**
 * Obtener índice del día actual (0 = Lunes, 4 = Viernes)
 */
export function getIndiceDiaActual(): number {
  const dia = new Date().getDay();
  // Domingo = 0, queremos Lunes = 0
  if (dia === 0) return -1; // Domingo
  if (dia === 6) return -1; // Sábado
  return dia - 1;
}

/**
 * Obtener los módulos de horario según turno
 */
export function getModulosHorario(turno: string): Record<number, { inicio: string; fin: string }> {
  if (turno.toLowerCase().includes('matutino')) {
    return MODULOS_HORARIO_MATUTINO;
  }
  return MODULOS_HORARIO;
}

/**
 * Obtener hora de inicio y fin de un módulo
 */
export function getHorasModulo(modulo: number, turno: string): { inicio: string; fin: string } {
  const modulos = getModulosHorario(turno);
  return modulos[modulo] || { inicio: '--:--', fin: '--:--' };
}

/**
 * Determinar el estado de una clase basado en la hora actual
 */
export function getEstadoClase(
  modulo: number, 
  turno: string
): 'pasada' | 'en_curso' | 'proxima' | 'pendiente' {
  const now = new Date();
  const horaActual = now.getHours() * 60 + now.getMinutes(); // Minutos desde medianoche
  
  const { inicio, fin } = getHorasModulo(modulo, turno);
  const [horaInicio, minInicio] = inicio.split(':').map(Number);
  const [horaFin, minFin] = fin.split(':').map(Number);
  
  const minutosInicio = horaInicio * 60 + minInicio;
  const minutosFin = horaFin * 60 + minFin;
  
  if (horaActual >= minutosFin) return 'pasada';
  if (horaActual >= minutosInicio && horaActual < minutosFin) return 'en_curso';
  if (horaActual >= minutosInicio - 30) return 'proxima'; // 30 min antes
  return 'pendiente';
}

/**
 * Obtener la próxima clase del día
 */
export function getProximaClase(
  clases: ClaseHorario[], 
  turno: string
): ClaseHorario | null {
  if (!clases || clases.length === 0) return null;
  
  const now = new Date();
  const horaActual = now.getHours() * 60 + now.getMinutes();
  
  // Ordenar por módulo
  const clasesOrdenadas = [...clases].sort((a, b) => a.modulo - b.modulo);
  
  for (const clase of clasesOrdenadas) {
    const { inicio } = getHorasModulo(clase.modulo, turno);
    const [hora, min] = inicio.split(':').map(Number);
    const minutosInicio = hora * 60 + min;
    
    // Si la clase aún no ha empezado o está en curso
    if (horaActual < minutosInicio + 50) { // 50 min es la duración
      return clase;
    }
  }
  
  return null;
}

/**
 * Obtener la clase actual (si hay alguna en curso)
 */
export function getClaseActual(
  clases: ClaseHorario[], 
  turno: string
): ClaseHorario | null {
  if (!clases || clases.length === 0) return null;
  
  const now = new Date();
  const horaActual = now.getHours() * 60 + now.getMinutes();
  
  for (const clase of clases) {
    const { inicio, fin } = getHorasModulo(clase.modulo, turno);
    const [horaInicio, minInicio] = inicio.split(':').map(Number);
    const [horaFin, minFin] = fin.split(':').map(Number);
    
    const minutosInicio = horaInicio * 60 + minInicio;
    const minutosFin = horaFin * 60 + minFin;
    
    if (horaActual >= minutosInicio && horaActual < minutosFin) {
      return clase;
    }
  }
  
  return null;
}

// ==========================================
// 🔥 FIREBASE QUERIES
// ==========================================

/**
 * Obtener horario de un alumno por grado y grupo
 */
export async function obtenerHorario(
  grado: string, 
  grupo: string
): Promise<HorarioFirebase | null> {
  try {
    const horariosRef = collection(db, 'horarios');
    const q = query(
      horariosRef,
      where('grado', '==', grado),
      where('grupo', '==', grupo),
      where('activo', '==', true)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log(`No hay horario activo para ${grado}° ${grupo}`);
      return null;
    }
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as HorarioFirebase;
    
  } catch (error) {
    console.error('Error obteniendo horario:', error);
    return null;
  }
}

/**
 * Obtener clases de un día específico
 */
export async function obtenerClasesDia(
  grado: string, 
  grupo: string, 
  dia: DiaSemana
): Promise<ClaseHorario[]> {
  const horario = await obtenerHorario(grado, grupo);
  
  if (!horario || !horario.clases || !horario.clases[dia]) {
    return [];
  }
  
  return horario.clases[dia];
}

/**
 * Obtener clases de hoy
 */
export async function obtenerClasesHoy(
  grado: string, 
  grupo: string
): Promise<ClaseHorario[]> {
  const diaActual = getDiaActual();
  
  if (!diaActual) {
    console.log('Hoy es fin de semana');
    return [];
  }
  
  return obtenerClasesDia(grado, grupo, diaActual);
}

// ==========================================
// 📦 SERVICIO EXPORTADO
// ==========================================

const horariosService = {
  // Queries
  obtenerHorario,
  obtenerClasesDia,
  obtenerClasesHoy,
  
  // Helpers
  getDiaActual,
  getNombreDia,
  getIndiceDiaActual,
  getModulosHorario,
  getHorasModulo,
  getEstadoClase,
  getProximaClase,
  getClaseActual,
};

export default horariosService;
