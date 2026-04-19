// ==========================================
// ⚙️ KEYON PADRES - CONFIGURACIÓN
// ==========================================

// 🔥 FIREBASE CONFIG - TUS CREDENCIALES
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDD4DbbZzT6Mm1guTJUYE-HEtG4hq1qaP8",
  authDomain: "scanner-v3.firebaseapp.com",
  databaseURL: "https://scanner-v3-default-rtdb.firebaseio.com",
  projectId: "scanner-v3",
  storageBucket: "scanner-v3.firebasestorage.app",
  messagingSenderId: "547241024349",
  appId: "1:547241024349:web:5665e19ce04c5e658ba6b4",
  measurementId: "G-0BEPYTG88V"
};

// 📱 APP CONFIG
export const APP_CONFIG = {
  name: 'Keyon Padres',
  version: '1.0.0',
  buildNumber: 1,
  
  // Horarios por turno (según PDF aSc Horarios CBTis)
  turnos: {
    matutino: {
      horaInicio: '07:00',
      horaFin: '14:00',
      toleranciaRetardo: '07:15',
      receso: { inicio: '10:20', fin: '10:40' }
    },
    vespertino: {
      horaInicio: '13:10',
      horaFin: '20:10',
      toleranciaRetardo: '13:25',
      receso: { inicio: '16:30', fin: '16:50' }
    }
  },
  
  // Horarios legacy (matutino por defecto)
  horaInicioClases: '07:00',
  horaLimiteRetardo: '07:15',
  horaFinClases: '14:00',
  
  // Días laborales (0 = Domingo, 6 = Sábado)
  diasLaborales: [1, 2, 3, 4, 5], // Lunes a Viernes
  
  // Caché
  cacheExpiration: 5 * 60 * 1000, // 5 minutos
  historialDiasDefault: 30,
  
  // Notificaciones
  notificationChannelId: 'keyon-padres-main',
  notificationChannelName: 'Notificaciones Keyon',
};

// 🗄️ COLECCIONES FIRESTORE
export const COLLECTIONS = {
  alumnos: 'alumnos',
  ingresos: 'ingresos_cbtis',
  padresTokens: 'padres_tokens',
  notificaciones: 'notificaciones_padres',
  horarios: 'horarios',
  sesiones: 'sesiones',
  permisosBano: 'permisos_bano',
  permisosEspeciales: 'permisos',
  configuracion: 'configuracion_padres',
};

// 🔐 STORAGE KEYS (sin @ para compatibilidad web)
export const STORAGE_KEYS = {
  session: 'keyon_session',
  alumno: 'keyon_alumno',
  config: 'keyon_config',
  lastSync: 'keyon_last_sync',
  pushToken: 'keyon_push_token',
  onboarded: 'keyon_onboarded',
};

// 📊 UMBRALES
export const THRESHOLDS = {
  asistenciaExcelente: 95,
  asistenciaBuena: 85,
  asistenciaRegular: 75,
  
  retardoMaxMinutos: 15,
  tiempoMinimoClase: 45,
};

// 🎨 ICONOS POR TIPO DE REGISTRO
export const ICONOS_REGISTRO = {
  Ingreso: {
    name: 'log-in',
    color: '#10b981',
  },
  Salida: {
    name: 'log-out',
    color: '#ef4444',
  },
};

// 📍 MODOS DE REGISTRO
export const MODOS_REGISTRO = {
  facial: { label: 'Reconocimiento Facial', icon: 'scan' },
  qr: { label: 'Código QR', icon: 'qr-code' },
  barcode: { label: 'Código de Barras', icon: 'maximize' },
  manual: { label: 'Registro Manual', icon: 'edit' },
};

// 🔔 TIPOS DE NOTIFICACIÓN
export const TIPOS_NOTIFICACION = {
  ingreso: { icon: 'log-in', color: '#10b981', title: 'Ingreso al plantel' },
  salida: { icon: 'log-out', color: '#ef4444', title: 'Salida del plantel' },
  retardo: { icon: 'clock', color: '#f59e0b', title: 'Retardo' },
  falta: { icon: 'x-circle', color: '#ef4444', title: 'Inasistencia' },
  clase: { icon: 'book-open', color: '#3b82f6', title: 'Información de clase' },
  permiso: { icon: 'file-text', color: '#8b5cf6', title: 'Permiso' },
  sistema: { icon: 'bell', color: '#64748b', title: 'Sistema' },
};

export default APP_CONFIG;
