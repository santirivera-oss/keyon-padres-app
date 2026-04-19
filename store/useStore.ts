// ==========================================
// 🗄️ KEYON PADRES - STORE (ZUSTAND)
// ==========================================
// Con soporte para Push Notifications FCM

import { create } from 'zustand';
import { router } from 'expo-router';
import {
  AppState,
  Alumno,
  SesionPadre,
  EstadoAlumno,
  RegistroAcceso,
  EstadisticasMensuales,
  Notificacion,
  ConfiguracionApp,
  CredencialesLogin
} from '../types';
import authService from '../services/auth';
import attendanceService from '../services/attendance';
import notificationsService from '../services/notifications';
import fcmService from '../services/fcm';

// ============ HELPERS ============

/**
 * Obtener fecha local en formato YYYY-MM-DD
 * IMPORTANTE: No usar toISOString() porque devuelve UTC
 */
function obtenerFechaHoy(): string {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

// Configuración inicial
const defaultConfig: ConfiguracionApp = {
  notificacionesActivas: true,
  notificarIngreso: true,
  notificarSalida: true,
  notificarRetardo: true,
  tema: 'dark',
  idioma: 'es',
};

// Estado inicial
const initialState = {
  // Auth
  isAuthenticated: false,
  sesion: null as SesionPadre | null,
  isLoading: true,
  
  // Alumno
  alumno: null as Alumno | null,
  estadoActual: null as EstadoAlumno | null,
  
  // Datos
  registrosHoy: [] as RegistroAcceso[],
  historial: [] as RegistroAcceso[],
  estadisticas: null as EstadisticasMensuales | null,
  notificaciones: [] as Notificacion[],
  notificacionesNoLeidas: 0,
  
  // Push Notifications
  pushToken: null as string | null,
  pushPermisos: false,
  
  // Configuración
  config: defaultConfig,
  
  // UI
  isRefreshing: false,
  error: null as string | null,
};

// ============ STORE ============

export const useStore = create<AppState & typeof initialState & {
  // Actions adicionales
  inicializar: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setRefreshing: (refreshing: boolean) => void;
  actualizarRegistrosHoy: (registros: RegistroAcceso[]) => void;
  cargarNotificaciones: () => Promise<void>;
  inicializarPushNotifications: () => Promise<void>;
}>((set, get) => ({
  ...initialState,

  // ============ INICIALIZACIÓN ============
  
  inicializar: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // Verificar si hay sesión guardada
      const sesion = await authService.obtenerSesion();
      
      if (sesion) {
        console.log('✅ Sesión encontrada:', sesion.nombrePadre);
        
        set({
          isAuthenticated: true,
          sesion,
          alumno: sesion.alumno,
        });
        
        // Cargar datos iniciales
        await get().actualizarEstado();
        await get().cargarEstadisticas();
        await get().cargarNotificaciones();
        
        // Inicializar push notifications
        await get().inicializarPushNotifications();
      }
      
    } catch (error: any) {
      console.error('Error inicializando:', error);
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  // ============ PUSH NOTIFICATIONS ============
  
  /**
   * Inicializar push notifications FCM
   * Registra el token para recibir notificaciones del alumno
   */
  inicializarPushNotifications: async () => {
    const { sesion, alumno } = get();
    
    if (!sesion || !alumno) {
      console.log('⚠️ No hay sesión para inicializar push');
      return;
    }
    
    try {
      console.log('🔔 Inicializando push notifications...');
      
      // Obtener token FCM nativo
      const token = await fcmService.registrarParaPush();
      
      if (token) {
        // Guardar token para el alumno
        // El padreId debe ser único, usamos el ID del padre de la sesión
        const padreId = sesion.padreId || sesion.alumnoId;
        const alumnoControl = alumno.control || alumno.id;
        
        const result = await fcmService.guardarTokenParaAlumno(
          padreId,
          alumnoControl,
          alumno.grado?.toString() || '',
          alumno.grupo || '',
          token
        );
        
        if (result.success) {
          console.log('✅ Push notifications activadas para:', alumnoControl);
          set({ 
            pushToken: token,
            pushPermisos: true 
          });
        } else {
          console.warn('⚠️ Error guardando token:', result.error);
        }
      } else {
        console.log('⚠️ No se pudo obtener token push');
        set({ pushPermisos: false });
      }
      
      // Configurar listener para notificaciones recibidas
      fcmService.onNotificacionRecibida((notification) => {
        console.log('🔔 Notificación recibida:', notification.request.content.title);
        
        // Actualizar contador de no leídas
        set(state => ({
          notificacionesNoLeidas: state.notificacionesNoLeidas + 1
        }));
        
        // Recargar notificaciones
        get().cargarNotificaciones();
      });
      
      // Listener para cuando tocan una notificación
      fcmService.onNotificacionTocada((response) => {
        console.log('👆 Notificación tocada:', response.notification.request.content);
        
        // Aquí podrías navegar a una pantalla específica según el tipo
        const data = response.notification.request.content.data;
        
        if (data?.tipo === 'asistencia') {
          // Navegar a historial o inicio
          console.log('📍 Navegando a asistencia...');
        } else if (data?.tipo === 'tarea') {
          // Navegar a tareas
          console.log('📍 Navegando a tareas...');
        } else if (data?.tipo === 'chat_admin') {
          console.log('📍 Navegando a mensajes...');
          try {
            router.push('/(tabs)/mensajes');
          } catch (e) {
            console.warn('No se pudo navegar a mensajes:', e);
          }
        } else if (data?.tipo === 'reporte_disciplina' || data?.tipo === 'pase_salida' || data?.tipo === 'citatorio') {
          console.log('📍 Navegando a disciplina...');
          try {
            router.push('/(tabs)/disciplina');
          } catch (e) {
            console.warn('No se pudo navegar a disciplina:', e);
          }
        }
      });
      
    } catch (error) {
      console.error('Error inicializando push:', error);
    }
  },

  // ============ AUTH ============
  
  login: async (credenciales: CredencialesLogin) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await authService.login(credenciales);
      
      if (result.success && result.data) {
        set({
          isAuthenticated: true,
          sesion: result.data,
          alumno: result.data.alumno,
        });
        
        // Cargar datos iniciales
        await get().actualizarEstado();
        await get().cargarEstadisticas();
        
        // 🔔 IMPORTANTE: Inicializar push notifications después del login
        await get().inicializarPushNotifications();
        
        set({ isLoading: false });
        return true;
      } else {
        set({ error: result.error || 'Error al iniciar sesión', isLoading: false });
        return false;
      }
      
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    const { sesion, alumno } = get();
    
    // Eliminar tokens push antes de cerrar sesión
    if (sesion) {
      const padreId = sesion.padreId || sesion.alumnoId;
      await fcmService.eliminarTodosLosTokens(padreId);
    }
    
    await authService.logout();
    await fcmService.limpiarBadge();
    
    set({
      ...initialState,
      isLoading: false,
    });
  },

  // ============ DATOS ============
  
  actualizarEstado: async () => {
    const { alumno } = get();
    if (!alumno) return;
    
    // CORREGIDO: Usar alumno.control (número de control) para buscar registros
    const identificador = alumno.control || alumno.id;
    
    console.log('📊 Actualizando estado para:', identificador);
    
    try {
      // Obtener estado actual (dentro/fuera, tiempo en escuela, etc.)
      const estadoActual = await attendanceService.obtenerEstadoActual(identificador);
      
      // CORREGIDO: Solo actualizar estadoActual, NO sobrescribir registrosHoy
      // Los registrosHoy se actualizan desde el listener de tiempo real en inicio.tsx
      set({ estadoActual });
      
      console.log('✅ Estado actualizado');
      
    } catch (error: any) {
      console.error('Error actualizando estado:', error);
    }
  },

  cargarHistorial: async (dias: number = 30) => {
    const { alumno } = get();
    if (!alumno) return;
    
    // CORREGIDO: Usar alumno.control
    const identificador = alumno.control || alumno.id;
    
    set({ isRefreshing: true });
    
    try {
      const historial = await attendanceService.obtenerHistorial(identificador, dias);
      set({ historial });
      
    } catch (error: any) {
      console.error('Error cargando historial:', error);
    } finally {
      set({ isRefreshing: false });
    }
  },

  cargarEstadisticas: async () => {
    const { alumno } = get();
    if (!alumno) return;
    
    // CORREGIDO: Usar alumno.control
    const identificador = alumno.control || alumno.id;
    // CORREGIDO: Pasar turno del alumno para cálculo correcto de retardos
    const turno = alumno.turno || 'Matutino';
    
    try {
      const estadisticas = await attendanceService.calcularEstadisticasMensuales(identificador, turno);
      set({ estadisticas });
      
    } catch (error: any) {
      console.error('Error cargando estadísticas:', error);
    }
  },

  cargarNotificaciones: async () => {
    const { alumno } = get();
    if (!alumno) return;
    
    try {
      const notificaciones = await notificationsService.obtenerNotificaciones(alumno.id);
      const noLeidas = await notificationsService.contarNoLeidas(alumno.id);
      
      set({ notificaciones, notificacionesNoLeidas: noLeidas });
      await fcmService.actualizarBadge(noLeidas);
      
    } catch (error: any) {
      console.error('Error cargando notificaciones:', error);
    }
  },

  marcarNotificacionLeida: async (id: string) => {
    try {
      await notificationsService.marcarComoLeida(id);
      
      // Actualizar estado local
      const { notificaciones, notificacionesNoLeidas } = get();
      const actualizadas = notificaciones.map(n => 
        n.id === id ? { ...n, leida: true } : n
      );
      
      const nuevasNoLeidas = Math.max(0, notificacionesNoLeidas - 1);
      
      set({ 
        notificaciones: actualizadas,
        notificacionesNoLeidas: nuevasNoLeidas
      });
      
      await fcmService.actualizarBadge(nuevasNoLeidas);
      
    } catch (error: any) {
      console.error('Error marcando notificación:', error);
    }
  },

  // ============ CONFIG ============
  
  actualizarConfig: (newConfig: Partial<ConfiguracionApp>) => {
    const { config } = get();
    set({ config: { ...config, ...newConfig } });
  },

  // ============ UI HELPERS ============
  
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
  setRefreshing: (isRefreshing: boolean) => set({ isRefreshing }),
  
  actualizarRegistrosHoy: (registros: RegistroAcceso[]) => {
    console.log('📝 Store: Actualizando registrosHoy con', registros.length, 'registros');
    set({ registrosHoy: registros });
    
    // Actualizar estado basado en registros
    if (registros.length > 0) {
      const ordenados = [...registros].sort((a, b) => b.hora.localeCompare(a.hora));
      const ultimo = ordenados[0];
      
      // Obtener primer ingreso del día
      const primerIngreso = [...registros]
        .sort((a, b) => a.hora.localeCompare(b.hora))
        .find(r => r.tipoRegistro === 'Ingreso');
      
      set(state => ({
        estadoActual: state.estadoActual ? {
          ...state.estadoActual,
          dentroDelPlantel: ultimo.tipoRegistro === 'Ingreso',
          ultimoRegistro: ultimo,
          horaIngreso: primerIngreso?.hora || state.estadoActual.horaIngreso,
        } : {
          dentroDelPlantel: ultimo.tipoRegistro === 'Ingreso',
          ultimoRegistro: ultimo,
          horaIngreso: primerIngreso?.hora || null,
          tiempoEnEscuela: { horas: 0, minutos: 0, texto: '0h 0m' },
        }
      }));
    }
  },
}));

// ============ HOOKS SELECTORES ============

export const useAuth = () => useStore(state => ({
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
  error: state.error,
  login: state.login,
  logout: state.logout,
}));

export const useAlumno = () => useStore(state => ({
  alumno: state.alumno,
  estadoActual: state.estadoActual,
  registrosHoy: state.registrosHoy,
  actualizarEstado: state.actualizarEstado,
}));

export const useHistorial = () => useStore(state => ({
  historial: state.historial,
  isRefreshing: state.isRefreshing,
  cargarHistorial: state.cargarHistorial,
}));

export const useEstadisticas = () => useStore(state => ({
  estadisticas: state.estadisticas,
  cargarEstadisticas: state.cargarEstadisticas,
}));

export const useNotificaciones = () => useStore(state => ({
  notificaciones: state.notificaciones,
  noLeidas: state.notificacionesNoLeidas,
  cargarNotificaciones: state.cargarNotificaciones,
  marcarLeida: state.marcarNotificacionLeida,
}));

export const usePushNotifications = () => useStore(state => ({
  pushToken: state.pushToken,
  pushPermisos: state.pushPermisos,
  inicializarPush: state.inicializarPushNotifications,
}));

export const useConfig = () => useStore(state => ({
  config: state.config,
  actualizarConfig: state.actualizarConfig,
}));

export default useStore;
