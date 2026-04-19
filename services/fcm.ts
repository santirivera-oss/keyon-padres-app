// ==========================================
// 📱 SERVICIO FCM (Firebase Cloud Messaging)
// ==========================================
// Push notifications nativas con Firebase
// Compatible con Cloud Functions de SCANER V3

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';

// ==========================================
// ⚙️ CONFIGURACIÓN
// ==========================================

// Colección donde se guardan los tokens (debe coincidir con Cloud Functions)
const TOKENS_COLLECTION = 'padres_tokens';

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // SIEMPRE mostrar alerta
    shouldPlaySound: true,   // SIEMPRE reproducir sonido
    shouldSetBadge: true,    // Actualizar badge
  }),
});

// ==========================================
// 🔑 OBTENER TOKEN FCM NATIVO
// ==========================================

/**
 * Registrar para notificaciones push y obtener token FCM NATIVO
 * @returns Token FCM nativo o null si falla
 */
export async function registrarParaPush(): Promise<string | null> {
  let token: string | null = null;
  
  // Verificar que es un dispositivo físico
// En emulador, intentar de todos modos si tiene Google Play Services
  if (!Device.isDevice) {
   console.log('⚠️ Ejecutando en emulador - intentando obtener token de todos modos...');
  }
  
  try {
    // Verificar permisos existentes
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    // Solicitar permisos si no los tiene
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('❌ Permisos de notificaciones denegados');
      return null;
    }
    
    // ⚠️ IMPORTANTE: Obtener token FCM NATIVO (no Expo token)
    // Este es el token que Firebase Cloud Messaging necesita
    const tokenData = await Notifications.getDevicePushTokenAsync();
    token = tokenData.data;
    
    console.log('✅ Token FCM nativo obtenido:', token?.substring(0, 30) + '...');
    console.log('📱 Tipo de token:', tokenData.type); // 'fcm' para Android, 'apn' para iOS
    
    // Configuración específica para Android
    if (Platform.OS === 'android') {
      await configurarCanalesAndroid();
    }
    
    return token;
    
  } catch (error) {
    console.error('Error registrando push:', error);
    return null;
  }
}

/**
 * Configurar canales de notificaciones en Android
 */
async function configurarCanalesAndroid() {
  // Canal general
  await Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#3b82f6',
    sound: 'default',
  });
  
  // Canal para entradas/salidas - ALTA PRIORIDAD
  await Notifications.setNotificationChannelAsync('asistencia', {
    name: 'Asistencia',
    description: 'Notificaciones de entrada y salida de tu hijo',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500],
    lightColor: '#22c55e',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  });
  
  // Canal para tareas
  await Notifications.setNotificationChannelAsync('tareas', {
    name: 'Tareas',
    description: 'Nuevas tareas y recordatorios',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#3b82f6',
    sound: 'default',
  });
  
  // Canal para avisos
  await Notifications.setNotificationChannelAsync('avisos', {
    name: 'Avisos',
    description: 'Avisos de la escuela',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#8b5cf6',
    sound: 'default',
  });
  
  // Canal para reportes disciplinarios (métrica/demérito)
  // Nombre coincide con channelId usado por Cloud Function notificarReporteDisciplina
  await Notifications.setNotificationChannelAsync('reportes', {
    name: 'Reportes disciplinarios',
    description: 'Méritos y deméritos capturados por profesor o prefectura',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500, 250, 500],
    lightColor: '#ef4444',
    sound: 'default',
    showBadge: true,
  });

  // Canal para pases de salida (salió / regresó / cancelado)
  await Notifications.setNotificationChannelAsync('pases', {
    name: 'Pases de salida',
    description: 'Salidas y regresos de la escuela',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 300, 200, 300],
    lightColor: '#f59e0b',
    sound: 'default',
    showBadge: true,
  });

  // Canal para chat admin <-> padre
  await Notifications.setNotificationChannelAsync('chat', {
    name: 'Mensajes de la Escuela',
    description: 'Chat con administracion',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#d97757',
    sound: 'default',
    showBadge: true,
  });

  // Canal para calificaciones publicadas por profesores
  await Notifications.setNotificationChannelAsync('calificaciones', {
    name: 'Calificaciones',
    description: 'Notas publicadas por los profesores',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#10b981',
    sound: 'default',
    showBadge: true,
  });

  // Canal para citatorios a padres/tutores
  await Notifications.setNotificationChannelAsync('citatorios', {
    name: 'Citatorios',
    description: 'Citas convocadas por prefectura',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400, 200, 400],
    lightColor: '#8b5cf6',
    sound: 'default',
    showBadge: true,
  });

  console.log('✅ Canales de Android configurados');
}

// ==========================================
// 💾 GUARDAR TOKEN EN FIRESTORE
// ==========================================

/**
 * Guardar token FCM en Firestore para recibir notificaciones de un alumno
 * Esta función guarda en la colección `padres_tokens` con el formato
 * que espera la Cloud Function `notificarAsistencia`
 */
export async function guardarTokenParaAlumno(
  padreId: string,
  alumnoControl: string,
  grado: string,
  grupo: string,
  token: string
): Promise<{ success: boolean; docId?: string; error?: string }> {
  try {
    if (!token || !padreId || !alumnoControl) {
      return { success: false, error: 'Faltan datos requeridos' };
    }
    
    // Generar ID único para el documento
    const platform = Platform.OS; // 'android' o 'ios'
    const docId = `${padreId}_${platform}_${alumnoControl}`;
    
    // Datos del token (formato compatible con Cloud Functions)
    const tokenData = {
      padreId,
      alumnoControl,
      grado: grado || '',
      grupo: grupo || '',
      fcmToken: token,
      platform,
      activo: true,
      ultimaActualizacion: serverTimestamp(),
      deviceInfo: {
        brand: Device.brand,
        modelName: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
      }
    };
    
    // Guardar en Firestore
    const docRef = doc(db, TOKENS_COLLECTION, docId);
    await setDoc(docRef, tokenData, { merge: true });
    
    console.log('✅ Token guardado para alumno:', alumnoControl);
    console.log('📄 Doc ID:', docId);
    
    return { success: true, docId };
    
  } catch (error: any) {
    console.error('Error guardando token:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Guardar tokens para TODOS los hijos de un padre
 * Llamar después del login cuando se tienen los datos de los hijos
 */
export async function guardarTokenParaTodosLosHijos(
  padreId: string,
  hijos: Array<{ id: string; grado?: string; grupo?: string }>,
  token: string
): Promise<{ success: boolean; registrados: number; errores: number }> {
  let registrados = 0;
  let errores = 0;
  
  for (const hijo of hijos) {
    const result = await guardarTokenParaAlumno(
      padreId,
      hijo.id, // El ID del alumno es su número de control
      hijo.grado || '',
      hijo.grupo || '',
      token
    );
    
    if (result.success) {
      registrados++;
    } else {
      errores++;
      console.warn(`Error registrando token para alumno ${hijo.id}:`, result.error);
    }
  }
  
  console.log(`✅ Tokens registrados: ${registrados}/${hijos.length}`);
  
  return { success: errores === 0, registrados, errores };
}

/**
 * Eliminar token de un alumno específico
 */
export async function eliminarTokenDeAlumno(
  padreId: string,
  alumnoControl: string
): Promise<boolean> {
  try {
    const platform = Platform.OS;
    const docId = `${padreId}_${platform}_${alumnoControl}`;
    
    await deleteDoc(doc(db, TOKENS_COLLECTION, docId));
    console.log('✅ Token eliminado para alumno:', alumnoControl);
    
    return true;
  } catch (error) {
    console.error('Error eliminando token:', error);
    return false;
  }
}

/**
 * Eliminar TODOS los tokens de un padre (al cerrar sesión)
 */
export async function eliminarTodosLosTokens(padreId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, TOKENS_COLLECTION),
      where('padreId', '==', padreId)
    );
    
    const snapshot = await getDocs(q);
    
    const deletePromises = snapshot.docs.map(docSnap => 
      deleteDoc(docSnap.ref)
    );
    
    await Promise.all(deletePromises);
    
    console.log(`✅ ${snapshot.size} tokens eliminados para padre:`, padreId);
    return true;
    
  } catch (error) {
    console.error('Error eliminando tokens:', error);
    return false;
  }
}

// ==========================================
// 🔔 NOTIFICACIONES LOCALES
// ==========================================

/**
 * Mostrar notificación local inmediata
 */
export async function mostrarNotificacionLocal(
  titulo: string,
  mensaje: string,
  datos?: Record<string, any>,
  canal: string = 'default'
): Promise<string | null> {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: mensaje,
        data: datos || {},
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId: canal }),
      },
      trigger: null, // Inmediato
    });
    
    return id;
  } catch (error) {
    console.error('Error mostrando notificación local:', error);
    return null;
  }
}

/**
 * Programar notificación para recordatorio de tarea
 */
export async function programarRecordatorioTarea(
  tareaId: string,
  titulo: string,
  materia: string,
  fechaLimite: Date,
  horasAntes: number = 24
): Promise<string | null> {
  try {
    const fechaRecordatorio = new Date(fechaLimite.getTime() - horasAntes * 60 * 60 * 1000);
    
    // No programar si ya pasó
    if (fechaRecordatorio <= new Date()) {
      return null;
    }
    
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `📚 Recordatorio: ${materia}`,
        body: `"${titulo}" vence en ${horasAntes} horas`,
        data: { tipo: 'tarea', tareaId },
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId: 'tareas' }),
      },
      trigger: {
        date: fechaRecordatorio,
      },
    });
    
    console.log(`✅ Recordatorio programado para ${fechaRecordatorio.toLocaleString()}`);
    return id;
    
  } catch (error) {
    console.error('Error programando recordatorio:', error);
    return null;
  }
}

/**
 * Cancelar notificación programada
 */
export async function cancelarNotificacion(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancelar todas las notificaciones programadas
 */
export async function cancelarTodasLasNotificaciones(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Obtener notificaciones programadas
 */
export async function obtenerNotificacionesProgramadas() {
  return await Notifications.getAllScheduledNotificationsAsync();
}

// ==========================================
// 📡 LISTENERS
// ==========================================

/**
 * Listener para cuando se recibe una notificación (app en primer plano)
 */
export function onNotificacionRecibida(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Listener para cuando el usuario toca una notificación
 */
export function onNotificacionTocada(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// ==========================================
// 🔄 INICIALIZACIÓN COMPLETA
// ==========================================

/**
 * Inicializar sistema de notificaciones para un padre
 * Llamar después del login con los datos de los hijos
 * 
 * @param padreId - UID del padre en Firebase Auth
 * @param hijos - Array de hijos con { id (control), grado, grupo }
 */
export async function inicializarNotificaciones(
  padreId: string,
  hijos: Array<{ id: string; grado?: string; grupo?: string }>
): Promise<{
  token: string | null;
  permisos: boolean;
  hijosRegistrados: number;
}> {
  console.log('🔔 Inicializando sistema de notificaciones...');
  console.log('👨‍👩‍👧 Hijos a registrar:', hijos.length);
  
  // Obtener token FCM nativo
  const token = await registrarParaPush();
  
  let hijosRegistrados = 0;
  
  // Guardar token para cada hijo
  if (token && padreId && hijos.length > 0) {
    const result = await guardarTokenParaTodosLosHijos(padreId, hijos, token);
    hijosRegistrados = result.registrados;
  }
  
  // Verificar permisos
  const { status } = await Notifications.getPermissionsAsync();
  
  console.log('✅ Notificaciones inicializadas');
  console.log('  - Token:', token ? 'Obtenido' : 'No disponible');
  console.log('  - Permisos:', status);
  console.log('  - Hijos registrados:', hijosRegistrados);
  
  return {
    token,
    permisos: status === 'granted',
    hijosRegistrados,
  };
}

/**
 * Actualizar badge de la app
 */
export async function actualizarBadge(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    // Ignorar errores (puede fallar en algunos dispositivos)
  }
}

/**
 * Limpiar badge
 */
export async function limpiarBadge(): Promise<void> {
  await actualizarBadge(0);
}

// ==========================================
// 📦 EXPORT
// ==========================================

const fcmService = {
  // Setup
  registrarParaPush,
  inicializarNotificaciones,
  
  // Tokens
  guardarTokenParaAlumno,
  guardarTokenParaTodosLosHijos,
  eliminarTokenDeAlumno,
  eliminarTodosLosTokens,
  
  // Locales
  mostrarNotificacionLocal,
  programarRecordatorioTarea,
  cancelarNotificacion,
  cancelarTodasLasNotificaciones,
  obtenerNotificacionesProgramadas,
  
  // Listeners
  onNotificacionRecibida,
  onNotificacionTocada,
  
  // Utils
  actualizarBadge,
  limpiarBadge,
};

export default fcmService;
