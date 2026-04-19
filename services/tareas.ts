// ==========================================
// 📝 SERVICIO DE TAREAS
// ==========================================
// Obtiene tareas asignadas desde Firebase

import { db } from './firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { Tarea, CategoriaTarea } from '../types';

// ==========================================
// 🔧 HELPERS
// ==========================================

/**
 * Calcular días restantes hasta la fecha límite
 */
export function getDiasRestantes(fechaLimite: any): number {
  if (!fechaLimite) return 0;
  
  const limite = fechaLimite.toDate ? fechaLimite.toDate() : new Date(fechaLimite);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  limite.setHours(0, 0, 0, 0);
  
  const diff = limite.getTime() - hoy.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Obtener texto de tiempo restante
 */
export function getTextoTiempoRestante(fechaLimite: any): string {
  const dias = getDiasRestantes(fechaLimite);
  
  if (dias < 0) return `Venció hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`;
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  if (dias <= 7) return `Vence en ${dias} días`;
  if (dias <= 14) return 'Vence en 1 semana';
  return `Vence en ${Math.floor(dias / 7)} semanas`;
}

/**
 * Obtener color según urgencia
 */
export function getColorUrgencia(fechaLimite: any): 'danger' | 'warning' | 'success' | 'muted' {
  const dias = getDiasRestantes(fechaLimite);
  
  if (dias < 0) return 'danger';      // Vencida
  if (dias === 0) return 'danger';    // Hoy
  if (dias <= 2) return 'warning';    // Urgente
  if (dias <= 7) return 'success';    // Esta semana
  return 'muted';                     // Más de una semana
}

/**
 * Formatear fecha para mostrar
 */
export function formatearFecha(fecha: any): string {
  if (!fecha) return '--';
  
  const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
  return date.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Formatear fecha completa
 */
export function formatearFechaCompleta(fecha: any): string {
  if (!fecha) return '--';
  
  const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ==========================================
// 🔥 FIREBASE QUERIES
// ==========================================

/**
 * Obtener tareas activas de un grupo
 */
export async function obtenerTareas(
  grado: string,
  grupo: string
): Promise<Tarea[]> {
  try {
    const tareasRef = collection(db, 'tareas');
    
    // Query simple sin orderBy para evitar necesitar índice compuesto
    const q = query(
      tareasRef,
      where('grado', '==', grado),
      where('grupo', '==', grupo),
      where('estado', '==', 'activa')
    );
    
    const snapshot = await getDocs(q);
    
    console.log(`📝 Tareas encontradas para ${grado}° ${grupo}:`, snapshot.size);
    
    if (snapshot.empty) {
      console.log(`No hay tareas activas para ${grado}° ${grupo}`);
      return [];
    }
    
    // Mapear y ordenar en cliente
    const tareas = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log('📝 Tarea:', doc.id, data.titulo);
      return {
        id: doc.id,
        ...data
      } as Tarea;
    });
    
    // Ordenar por fecha límite (ascendente)
    return tareas.sort((a, b) => {
      const fechaA = a.fechaLimite?.toDate ? a.fechaLimite.toDate() : new Date(a.fechaLimite);
      const fechaB = b.fechaLimite?.toDate ? b.fechaLimite.toDate() : new Date(b.fechaLimite);
      return fechaA.getTime() - fechaB.getTime();
    });
    
  } catch (error) {
    console.error('Error obteniendo tareas:', error);
    return [];
  }
}

/**
 * Obtener todas las tareas (activas y vencidas recientes)
 */
export async function obtenerTodasLasTareas(
  grado: string,
  grupo: string
): Promise<Tarea[]> {
  try {
    const tareasRef = collection(db, 'tareas');
    
    // Query simple sin orderBy
    const q = query(
      tareasRef,
      where('grado', '==', grado),
      where('grupo', '==', grupo)
    );
    
    const snapshot = await getDocs(q);
    
    const tareas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Tarea));
    
    // Ordenar en cliente (más recientes primero)
    return tareas.sort((a, b) => {
      const fechaA = a.fechaLimite?.toDate ? a.fechaLimite.toDate() : new Date(a.fechaLimite);
      const fechaB = b.fechaLimite?.toDate ? b.fechaLimite.toDate() : new Date(b.fechaLimite);
      return fechaB.getTime() - fechaA.getTime();
    });
    
  } catch (error) {
    console.error('Error obteniendo tareas:', error);
    return [];
  }
}

/**
 * Obtener tareas pendientes (próximas a vencer)
 */
export async function obtenerTareasPendientes(
  grado: string,
  grupo: string
): Promise<Tarea[]> {
  const tareas = await obtenerTareas(grado, grupo);
  
  // Filtrar solo las que no han vencido
  return tareas.filter(t => getDiasRestantes(t.fechaLimite) >= 0);
}

/**
 * Obtener tareas vencidas
 */
export async function obtenerTareasVencidas(
  grado: string,
  grupo: string
): Promise<Tarea[]> {
  const tareas = await obtenerTodasLasTareas(grado, grupo);
  
  // Filtrar solo las vencidas
  return tareas.filter(t => getDiasRestantes(t.fechaLimite) < 0);
}

/**
 * Obtener tareas por materia
 */
export async function obtenerTareasPorMateria(
  grado: string,
  grupo: string,
  materia: string
): Promise<Tarea[]> {
  try {
    const tareasRef = collection(db, 'tareas');
    const q = query(
      tareasRef,
      where('grado', '==', grado),
      where('grupo', '==', grupo),
      where('materia', '==', materia),
      where('estado', '==', 'activa')
    );
    
    const snapshot = await getDocs(q);
    
    const tareas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Tarea));
    
    // Ordenar en cliente
    return tareas.sort((a, b) => {
      const fechaA = a.fechaLimite?.toDate ? a.fechaLimite.toDate() : new Date(a.fechaLimite);
      const fechaB = b.fechaLimite?.toDate ? b.fechaLimite.toDate() : new Date(b.fechaLimite);
      return fechaA.getTime() - fechaB.getTime();
    });
    
  } catch (error) {
    console.error('Error obteniendo tareas por materia:', error);
    return [];
  }
}

/**
 * Obtener materias únicas de las tareas
 */
export async function obtenerMaterias(
  grado: string,
  grupo: string
): Promise<string[]> {
  const tareas = await obtenerTodasLasTareas(grado, grupo);
  const materiasSet = new Set(tareas.map(t => t.materia));
  return Array.from(materiasSet).sort();
}

/**
 * Contar tareas pendientes
 */
export async function contarTareasPendientes(
  grado: string,
  grupo: string
): Promise<number> {
  const tareas = await obtenerTareasPendientes(grado, grupo);
  return tareas.length;
}

// ==========================================
// 📦 SERVICIO EXPORTADO
// ==========================================

const tareasService = {
  // Queries
  obtenerTareas,
  obtenerTodasLasTareas,
  obtenerTareasPendientes,
  obtenerTareasVencidas,
  obtenerTareasPorMateria,
  obtenerMaterias,
  contarTareasPendientes,
  
  // Helpers
  getDiasRestantes,
  getTextoTiempoRestante,
  getColorUrgencia,
  formatearFecha,
  formatearFechaCompleta,
};

export default tareasService;
