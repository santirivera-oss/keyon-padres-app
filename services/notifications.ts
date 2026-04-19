// ==========================================
// 🔔 KEYON PADRES - SERVICIO NOTIFICACIONES
// ==========================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { 
  getDb, 
  collection, 
  doc,
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  COLLECTIONS 
} from './firebase';
import { setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Notificacion } from '../types';
import { APP_CONFIG, TIPOS_NOTIFICACION } from '../constants/Config';

// ============ CONFIGURACIÓN ============

// Configurar cómo se manejan las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ============ REGISTRO DE PUSH TOKEN ============

/**
 * Registrar dispositivo para notificaciones push
 */
export async function registrarParaPush(): Promise<string | null> {
  try {
    // En web no funcionan las push notifications
    if (Platform.OS === 'web') {
      console.log('ℹ️ Push notifications no disponibles en web');
      return null;
    }
    
    // Verificar que es un dispositivo físico
    if (!Device.isDevice) {
      console.log('⚠️ Push notifications solo funcionan en dispositivos físicos');
      return null;
    }
    
    // Solicitar permisos
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('❌ Permisos de notificación denegados');
      return null;
    }
    
    // Configurar canal en Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(APP_CONFIG.notificationChannelId, {
        name: APP_CONFIG.notificationChannelName,
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#06b6d4',
      });
    }
    
    // Obtener token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    
    console.log('✅ Push token obtenido:', token.substring(0, 20) + '...');
    return token;
    
  } catch (error) {
    console.error('Error registrando push:', error);
    return null;
  }
}

/**
 * Guardar token en Firebase para el alumno
 */
export async function guardarPushToken(alumnoId: string, token: string): Promise<void> {
  try {
    const db = getDb();
    const tokenRef = doc(db, COLLECTIONS.padresTokens, alumnoId);
    
    await setDoc(tokenRef, {
      token,
      platform: Platform.OS,
      deviceName: Device.deviceName,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    console.log('✅ Push token guardado en Firebase');
    
  } catch (error) {
    console.error('Error guardando push token:', error);
  }
}

// ============ NOTIFICACIONES LOCALES ============

/**
 * Mostrar notificación local
 */
export async function mostrarNotificacionLocal(
  titulo: string,
  cuerpo: string,
  data?: Record<string, any>
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: titulo,
      body: cuerpo,
      data: data || {},
      sound: true,
    },
    trigger: null, // Inmediato
  });
  
  return id;
}

/**
 * Mostrar notificación de ingreso
 */
export async function notificarIngreso(nombreAlumno: string, hora: string): Promise<void> {
  await mostrarNotificacionLocal(
    '✅ Ingreso al plantel',
    `${nombreAlumno} ingresó a las ${hora}`,
    { tipo: 'ingreso' }
  );
}

/**
 * Mostrar notificación de salida
 */
export async function notificarSalida(nombreAlumno: string, hora: string): Promise<void> {
  await mostrarNotificacionLocal(
    '🚪 Salida del plantel',
    `${nombreAlumno} salió a las ${hora}`,
    { tipo: 'salida' }
  );
}

/**
 * Mostrar notificación de retardo
 */
export async function notificarRetardo(nombreAlumno: string, hora: string): Promise<void> {
  await mostrarNotificacionLocal(
    '⏰ Retardo registrado',
    `${nombreAlumno} llegó tarde (${hora})`,
    { tipo: 'retardo' }
  );
}

// ============ HISTORIAL DE NOTIFICACIONES ============

/**
 * Obtener notificaciones del padre
 */
export async function obtenerNotificaciones(
  alumnoId: string,
  limite: number = 20
): Promise<Notificacion[]> {
  try {
    const db = getDb();
    const notifRef = collection(db, COLLECTIONS.notificaciones);
    
    const q = query(
      notifRef,
      where('alumnoId', '==', alumnoId),
      orderBy('fechaCreacion', 'desc'),
      limit(limite)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        tipo: data.tipo,
        titulo: data.titulo,
        descripcion: data.descripcion,
        leida: data.leida || false,
        fechaCreacion: data.fechaCreacion?.toDate?.() || new Date(),
        datos: data.datos,
      } as Notificacion;
    });
    
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    return [];
  }
}

/**
 * Obtener cantidad de notificaciones no leídas
 */
export async function contarNoLeidas(alumnoId: string): Promise<number> {
  try {
    const db = getDb();
    const notifRef = collection(db, COLLECTIONS.notificaciones);
    
    const q = query(
      notifRef,
      where('alumnoId', '==', alumnoId),
      where('leida', '==', false)
    );
    
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
export async function marcarComoLeida(notificacionId: string): Promise<void> {
  try {
    const db = getDb();
    const notifRef = doc(db, COLLECTIONS.notificaciones, notificacionId);
    
    await updateDoc(notifRef, {
      leida: true,
      fechaLectura: serverTimestamp(),
    });
    
  } catch (error) {
    console.error('Error marcando como leída:', error);
  }
}

/**
 * Marcar todas como leídas
 */
export async function marcarTodasComoLeidas(alumnoId: string): Promise<void> {
  try {
    const notificaciones = await obtenerNotificaciones(alumnoId, 100);
    
    await Promise.all(
      notificaciones
        .filter(n => !n.leida)
        .map(n => marcarComoLeida(n.id))
    );
    
  } catch (error) {
    console.error('Error marcando todas:', error);
  }
}

// ============ LISTENERS ============

/**
 * Agregar listener para notificaciones recibidas
 */
export function agregarListenerNotificacionRecibida(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Agregar listener para respuesta a notificación (tap)
 */
export function agregarListenerNotificacionTap(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Obtener última notificación que abrió la app
 */
export async function obtenerNotificacionInicial(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}

// ============ BADGE ============

/**
 * Actualizar badge de la app
 */
export async function actualizarBadge(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.log('⚠️ Badge no soportado en esta plataforma');
  }
}

/**
 * Limpiar badge
 */
export async function limpiarBadge(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
    console.log('⚠️ Badge no soportado en esta plataforma');
  }
}

// ============ EXPORT DEFAULT ============

export default {
  registrarParaPush,
  guardarPushToken,
  mostrarNotificacionLocal,
  notificarIngreso,
  notificarSalida,
  notificarRetardo,
  obtenerNotificaciones,
  contarNoLeidas,
  marcarComoLeida,
  marcarTodasComoLeidas,
  agregarListenerNotificacionRecibida,
  agregarListenerNotificacionTap,
  obtenerNotificacionInicial,
  actualizarBadge,
  limpiarBadge,
};
