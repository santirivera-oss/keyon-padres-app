// ==========================================
// 🔔 SERVICIO DE NOTIFICACIONES
// ==========================================
// Sistema híbrido preparado para Cloud Functions

import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy, 
  limit,
  onSnapshot,
  Timestamp,
  writeBatch
} from 'firebase/firestore';

// ==========================================
// 📋 TIPOS
// ==========================================

export type TipoNotificacion = 
  | 'entrada' 
  | 'salida' 
  | 'retardo' 
  | 'tarea' 
  | 'aviso' 
  | 'justificante'
  | 'calificacion'
  | 'sistema';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  alumnoId?: string;
  alumnoNombre?: string;
  leida: boolean;
  fecha: any; // Timestamp
  datos?: Record<string, any>;
}

export interface ConfigNotificaciones {
  notificarEntrada: boolean;
  notificarSalida: boolean;
  notificarRetardo: boolean;
  notificarTareas: boolean;
  notificarAvisos: boolean;
}

export const DEFAULT_CONFIG: ConfigNotificaciones = {
  notificarEntrada: true,
  notificarSalida: true,
  notificarRetardo: true,
  notificarTareas: true,
  notificarAvisos: true,
};

// ==========================================
// 🎨 CONFIGURACIÓN POR TIPO
// ==========================================

export const NOTIFICACION_CONFIG: Record<TipoNotificacion, {
  icono: string;
  color: string;
  colorBg: string;
}> = {
  entrada: { icono: 'log-in', color: '#22c55e', colorBg: '#22c55e15' },
  salida: { icono: 'log-out', color: '#f59e0b', colorBg: '#f59e0b15' },
  retardo: { icono: 'clock', color: '#ef4444', colorBg: '#ef444415' },
  tarea: { icono: 'edit-3', color: '#3b82f6', colorBg: '#3b82f615' },
  aviso: { icono: 'bell', color: '#8b5cf6', colorBg: '#8b5cf615' },
  justificante: { icono: 'file-text', color: '#06b6d4', colorBg: '#06b6d415' },
  calificacion: { icono: 'award', color: '#ec4899', colorBg: '#ec489915' },
  sistema: { icono: 'info', color: '#6b7280', colorBg: '#6b728015' },
};

// ==========================================
// 🔥 FIREBASE QUERIES
// ==========================================

/**
 * Obtener notificaciones de un padre
 */
export async function obtenerNotificaciones(
  padreId: string,
  limite: number = 50
): Promise<Notificacion[]> {
  try {
    console.log('🔔 Obteniendo notificaciones para:', padreId);
    const notifRef = collection(db, 'notificaciones', padreId, 'items');
    
    // Query simple sin orderBy (ordenamos en cliente)
    const q = query(notifRef, limit(limite));
    
    const snapshot = await getDocs(q);
    console.log('🔔 Documentos encontrados:', snapshot.size);
    
    const notificaciones = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notificacion));
    
    // Ordenar en cliente (más recientes primero)
    return notificaciones.sort((a, b) => {
      const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha || 0);
      const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha || 0);
      return fechaB.getTime() - fechaA.getTime();
    });
    
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    return [];
  }
}

/**
 * Suscribirse a notificaciones en tiempo real
 */
export function suscribirseANotificaciones(
  padreId: string,
  callback: (notificaciones: Notificacion[]) => void,
  limite: number = 50
): () => void {
  console.log('🔔 Suscribiendo a notificaciones:', padreId);
  const notifRef = collection(db, 'notificaciones', padreId, 'items');
  
  // Query simple sin orderBy
  const q = query(notifRef, limit(limite));
  
  return onSnapshot(q, (snapshot) => {
    const notificaciones = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notificacion));
    
    // Ordenar en cliente (más recientes primero)
    const ordenadas = notificaciones.sort((a, b) => {
      const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha || 0);
      const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha || 0);
      return fechaB.getTime() - fechaA.getTime();
    });
    
    callback(ordenadas);
  }, (error) => {
    console.error('Error en suscripción de notificaciones:', error);
    // Devolver array vacío en caso de error
    callback([]);
  });
}

/**
 * Contar notificaciones no leídas
 */
export async function contarNoLeidas(padreId: string): Promise<number> {
  try {
    const notifRef = collection(db, 'notificaciones', padreId, 'items');
    const q = query(notifRef, where('leida', '==', false));
    
    const snapshot = await getDocs(q);
    return snapshot.size;
    
  } catch (error) {
    console.error('Error contando no leídas:', error);
    return 0;
  }
}

/**
 * Marcar notificación como leída
 */
export async function marcarComoLeida(
  padreId: string,
  notificacionId: string
): Promise<boolean> {
  try {
    const notifDoc = doc(db, 'notificaciones', padreId, 'items', notificacionId);
    await updateDoc(notifDoc, { leida: true });
    return true;
  } catch (error) {
    console.error('Error marcando como leída:', error);
    return false;
  }
}

/**
 * Marcar todas como leídas
 */
export async function marcarTodasComoLeidas(padreId: string): Promise<boolean> {
  try {
    const notifRef = collection(db, 'notificaciones', padreId, 'items');
    const q = query(notifRef, where('leida', '==', false));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return true;
    
    const batch = writeBatch(db);
    snapshot.docs.forEach(docSnap => {
      batch.update(docSnap.ref, { leida: true });
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error marcando todas como leídas:', error);
    return false;
  }
}

/**
 * Eliminar notificación
 */
export async function eliminarNotificacion(
  padreId: string,
  notificacionId: string
): Promise<boolean> {
  try {
    const notifDoc = doc(db, 'notificaciones', padreId, 'items', notificacionId);
    await deleteDoc(notifDoc);
    return true;
  } catch (error) {
    console.error('Error eliminando notificación:', error);
    return false;
  }
}

/**
 * Limpiar notificaciones antiguas (más de 30 días)
 */
export async function limpiarNotificacionesAntiguas(padreId: string): Promise<number> {
  try {
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    
    const notifRef = collection(db, 'notificaciones', padreId, 'items');
    const q = query(
      notifRef,
      where('fecha', '<', Timestamp.fromDate(hace30Dias))
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return 0;
    
    const batch = writeBatch(db);
    snapshot.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });
    
    await batch.commit();
    return snapshot.size;
  } catch (error) {
    console.error('Error limpiando notificaciones:', error);
    return 0;
  }
}

// ==========================================
// 📝 CREAR NOTIFICACIONES (Para uso desde web/funciones)
// ==========================================

/**
 * Crear una notificación
 * Esta función se usará desde el sistema web o Cloud Functions
 */
export async function crearNotificacion(
  padreId: string,
  notificacion: Omit<Notificacion, 'id' | 'leida' | 'fecha'>
): Promise<string | null> {
  try {
    const notifRef = collection(db, 'notificaciones', padreId, 'items');
    
    const docRef = await addDoc(notifRef, {
      ...notificacion,
      leida: false,
      fecha: Timestamp.now(),
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creando notificación:', error);
    return null;
  }
}

/**
 * Crear notificación de entrada
 */
export async function notificarEntrada(
  padreId: string,
  alumnoId: string,
  alumnoNombre: string,
  hora: string
): Promise<string | null> {
  return crearNotificacion(padreId, {
    tipo: 'entrada',
    titulo: `${alumnoNombre} ingresó a la escuela`,
    mensaje: `Registro de entrada a las ${hora}`,
    alumnoId,
    alumnoNombre,
    datos: { hora }
  });
}

/**
 * Crear notificación de salida
 */
export async function notificarSalida(
  padreId: string,
  alumnoId: string,
  alumnoNombre: string,
  hora: string
): Promise<string | null> {
  return crearNotificacion(padreId, {
    tipo: 'salida',
    titulo: `${alumnoNombre} salió de la escuela`,
    mensaje: `Registro de salida a las ${hora}`,
    alumnoId,
    alumnoNombre,
    datos: { hora }
  });
}

/**
 * Crear notificación de retardo
 */
export async function notificarRetardo(
  padreId: string,
  alumnoId: string,
  alumnoNombre: string,
  hora: string,
  minutos: number
): Promise<string | null> {
  return crearNotificacion(padreId, {
    tipo: 'retardo',
    titulo: `${alumnoNombre} llegó tarde`,
    mensaje: `Ingresó ${minutos} minutos tarde a las ${hora}`,
    alumnoId,
    alumnoNombre,
    datos: { hora, minutos }
  });
}

/**
 * Crear notificación de nueva tarea
 */
export async function notificarNuevaTarea(
  padreId: string,
  materia: string,
  titulo: string,
  fechaLimite: string
): Promise<string | null> {
  return crearNotificacion(padreId, {
    tipo: 'tarea',
    titulo: `Nueva tarea de ${materia}`,
    mensaje: `${titulo} - Entrega: ${fechaLimite}`,
    datos: { materia, titulo, fechaLimite }
  });
}

/**
 * Crear notificación de aviso
 */
export async function notificarAviso(
  padreId: string,
  titulo: string,
  mensaje: string,
  avisoId: string
): Promise<string | null> {
  return crearNotificacion(padreId, {
    tipo: 'aviso',
    titulo: titulo,
    mensaje: mensaje,
    datos: { avisoId }
  });
}

// ==========================================
// ⚙️ CONFIGURACIÓN DEL PADRE
// ==========================================

/**
 * Obtener configuración de notificaciones
 */
export async function obtenerConfigNotificaciones(
  padreId: string
): Promise<ConfigNotificaciones> {
  try {
    const padreDoc = doc(db, 'padres', padreId);
    const snapshot = await getDoc(padreDoc);
    
    if (!snapshot.exists()) {
      return DEFAULT_CONFIG;
    }
    
    const data = snapshot.data();
    return {
      ...DEFAULT_CONFIG,
      ...data.configNotificaciones
    };
  } catch (error) {
    console.error('Error obteniendo config:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Actualizar configuración de notificaciones
 */
export async function actualizarConfigNotificaciones(
  padreId: string,
  config: Partial<ConfigNotificaciones>
): Promise<boolean> {
  try {
    const padreDoc = doc(db, 'padres', padreId);
    await updateDoc(padreDoc, {
      configNotificaciones: config
    });
    return true;
  } catch (error) {
    console.error('Error actualizando config:', error);
    return false;
  }
}

/**
 * Guardar FCM Token (preparado para push)
 */
export async function guardarFCMToken(
  padreId: string,
  token: string
): Promise<boolean> {
  try {
    const padreDoc = doc(db, 'padres', padreId);
    await updateDoc(padreDoc, {
      fcmToken: token,
      fcmTokenUpdated: Timestamp.now()
    });
    console.log('✅ FCM Token guardado');
    return true;
  } catch (error) {
    console.error('Error guardando FCM token:', error);
    return false;
  }
}

// ==========================================
// 🔧 HELPERS
// ==========================================

/**
 * Formatear fecha de notificación
 */
export function formatearFechaNotificacion(fecha: any): string {
  if (!fecha) return '';
  
  const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
  const ahora = new Date();
  const diff = ahora.getTime() - date.getTime();
  const minutos = Math.floor(diff / 60000);
  const horas = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);
  
  if (minutos < 1) return 'Ahora';
  if (minutos < 60) return `Hace ${minutos}m`;
  if (horas < 24) return `Hace ${horas}h`;
  if (dias < 7) return `Hace ${dias}d`;
  
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Agrupar notificaciones por fecha
 */
export function agruparPorFecha(notificaciones: Notificacion[]): {
  hoy: Notificacion[];
  ayer: Notificacion[];
  semana: Notificacion[];
  anteriores: Notificacion[];
} {
  const ahora = new Date();
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const ayer = new Date(hoy.getTime() - 86400000);
  const hace7Dias = new Date(hoy.getTime() - 7 * 86400000);
  
  return {
    hoy: notificaciones.filter(n => {
      const fecha = n.fecha?.toDate ? n.fecha.toDate() : new Date(n.fecha);
      return fecha >= hoy;
    }),
    ayer: notificaciones.filter(n => {
      const fecha = n.fecha?.toDate ? n.fecha.toDate() : new Date(n.fecha);
      return fecha >= ayer && fecha < hoy;
    }),
    semana: notificaciones.filter(n => {
      const fecha = n.fecha?.toDate ? n.fecha.toDate() : new Date(n.fecha);
      return fecha >= hace7Dias && fecha < ayer;
    }),
    anteriores: notificaciones.filter(n => {
      const fecha = n.fecha?.toDate ? n.fecha.toDate() : new Date(n.fecha);
      return fecha < hace7Dias;
    }),
  };
}

// ==========================================
// 📦 EXPORT
// ==========================================

const notificacionesService = {
  // Queries
  obtenerNotificaciones,
  suscribirseANotificaciones,
  contarNoLeidas,
  
  // Acciones
  marcarComoLeida,
  marcarTodasComoLeidas,
  eliminarNotificacion,
  limpiarNotificacionesAntiguas,
  
  // Crear (para web/functions)
  crearNotificacion,
  notificarEntrada,
  notificarSalida,
  notificarRetardo,
  notificarNuevaTarea,
  notificarAviso,
  
  // Config
  obtenerConfigNotificaciones,
  actualizarConfigNotificaciones,
  guardarFCMToken,
  
  // Helpers
  formatearFechaNotificacion,
  agruparPorFecha,
};

export default notificacionesService;
