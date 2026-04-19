// ==========================================
// 📱 KEYON PADRES - TIPOS TYPESCRIPT
// ==========================================
// Actualizado para Push Notifications

// ============ ALUMNO ============
export interface Alumno {
  id: string;
  control: string;
  nombre: string;
  apellidos: string;
  grado: string;
  grupo: string;
  turno: 'Matutino' | 'Vespertino';
  foto?: string;
  especialidad?: string;
}

// ============ REGISTRO DE ACCESO ============
export interface RegistroAcceso {
  id: string;
  identificador: string;
  nombre: string;
  tipoPersona: 'Alumno' | 'Profesor' | 'Visitante';
  tipoRegistro: 'Ingreso' | 'Salida';
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:mm:ss
  modo: 'facial' | 'qr' | 'barcode' | 'manual';
  timestamp: string;
  ubicacion?: string;
}

// ============ ESTADO DEL ALUMNO ============
export interface EstadoAlumno {
  dentroDelPlantel: boolean;
  ultimoRegistro: RegistroAcceso | null;
  horaIngreso: string | null;
  tiempoEnEscuela: {
    horas: number;
    minutos: number;
    texto: string;
  };
}

// ============ ESTADÍSTICAS ============
export interface EstadisticasMensuales {
  asistencias: number;
  faltas: number;
  retardos: number;
  diasHabiles: number;
  porcentaje: number;
  tendencia: 'excelente' | 'buena' | 'regular' | 'baja';
  detalleRetardos: Array<{ fecha: string; hora: string }>;
}

export interface TiempoEscuela {
  total: {
    horas: number;
    minutos: number;
    texto: string;
  };
  promedio: {
    horas: number;
    minutos: number;
    texto: string;
  };
  diasContados: number;
}

// ============ HORARIO ============
export interface ClaseHorario {
  modulo: number;
  materia: string;
  profesor: string;
  aula: string;
  // Campos calculados en el cliente
  horaInicio?: string;
  horaFin?: string;
  estado?: 'pasada' | 'en_curso' | 'proxima' | 'pendiente';
}

export interface HorarioFirebase {
  id: string;
  grado: string;
  grupo: string;
  turno: string;
  activo: boolean;
  createdAt?: any;
  updatedAt?: any;
  updatedBy?: string;
  clases: {
    Lunes: ClaseHorario[];
    Martes: ClaseHorario[];
    Miércoles: ClaseHorario[];
    Jueves: ClaseHorario[];
    Viernes: ClaseHorario[];
  };
}

export type DiaSemana = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes';

// Módulos con horarios (turno vespertino CBTis - según PDF aSc Horarios)
export const MODULOS_HORARIO: Record<number, { inicio: string; fin: string }> = {
  1: { inicio: '13:10', fin: '14:00' },
  2: { inicio: '14:00', fin: '14:50' },
  3: { inicio: '14:50', fin: '15:40' },
  4: { inicio: '15:40', fin: '16:30' },
  // RECESO 16:30 - 16:50
  5: { inicio: '16:50', fin: '17:40' },
  6: { inicio: '17:40', fin: '18:30' },
  7: { inicio: '18:30', fin: '19:20' },
  8: { inicio: '19:20', fin: '20:10' },
};

// Módulos turno matutino (según PDF aSc Horarios)
export const MODULOS_HORARIO_MATUTINO: Record<number, { inicio: string; fin: string }> = {
  1: { inicio: '07:00', fin: '07:50' },
  2: { inicio: '07:50', fin: '08:40' },
  3: { inicio: '08:40', fin: '09:30' },
  4: { inicio: '09:30', fin: '10:20' },
  // RECESO 10:20 - 10:40
  5: { inicio: '10:40', fin: '11:30' },
  6: { inicio: '11:30', fin: '12:20' },
  7: { inicio: '12:20', fin: '13:10' },
  8: { inicio: '13:10', fin: '14:00' },
};

// ============ NOTIFICACIONES ============
export interface Notificacion {
  id: string;
  tipo: 'ingreso' | 'salida' | 'retardo' | 'falta' | 'clase' | 'permiso' | 'sistema';
  titulo: string;
  descripcion: string;
  leida: boolean;
  fechaCreacion: Date;
  datos?: Record<string, any>;
}

// ============ PERMISOS ============
export interface PermisoBano {
  id: string;
  alumnoId: string;
  fecha: string;
  horaInicio: string;
  horaFin?: string;
  duracion?: number;
  clase: string;
  profesor: string;
}

export interface PermisoEspecial {
  id: string;
  alumnoId: string;
  tipo: 'salida_anticipada' | 'llegada_tarde' | 'inasistencia';
  fecha: string;
  motivo: string;
  autorizadoPor: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
}

// ============ SESIÓN / AUTH ============
export interface SesionPadre {
  alumnoId: string;
  alumno: Alumno;
  token?: string;
  expiracion?: Date;
  // 🆕 Campo para identificar al padre (puede ser el mismo alumnoId o un ID único)
  padreId?: string;
  nombrePadre?: string;
}

export interface CredencialesLogin {
  control: string;
  codigo: string;
}

// ============ CONFIGURACIÓN ============
export interface ConfiguracionApp {
  notificacionesActivas: boolean;
  notificarIngreso: boolean;
  notificarSalida: boolean;
  notificarRetardo: boolean;
  tema: 'dark' | 'light' | 'system';
  idioma: 'es' | 'en';
}

// ============ RESPUESTAS API ============
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============ TAREAS ============
export type CategoriaTarea = 'tarea' | 'proyecto' | 'examen';
export type EstadoTarea = 'activa' | 'vencida' | 'completada';

export interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaTarea;
  puntosMaximos: number;
  fechaLimite: any; // Firestore Timestamp
  estado: EstadoTarea;
  
  // Contexto
  claseId?: string;
  grado: string;
  grupo: string;
  materia: string;
  
  // Profesor
  profesorId: string;
  profesorNombre: string;
  
  // Metadata
  fechaCreacion: any; // Firestore Timestamp
  entregasCount?: number;
  calificacionesCount?: number;
}

// Helpers para tareas
export const CATEGORIA_CONFIG: Record<CategoriaTarea, { label: string; icon: string; color: string }> = {
  tarea: { label: 'Tarea', icon: 'edit-3', color: '#3b82f6' },
  proyecto: { label: 'Proyecto', icon: 'folder', color: '#8b5cf6' },
  examen: { label: 'Examen', icon: 'file-text', color: '#ef4444' },
};

// ============ STORE ============
export interface AppState {
  // Auth
  isAuthenticated: boolean;
  sesion: SesionPadre | null;
  isLoading: boolean;
  
  // Alumno
  alumno: Alumno | null;
  estadoActual: EstadoAlumno | null;
  
  // Datos
  registrosHoy: RegistroAcceso[];
  historial: RegistroAcceso[];
  estadisticas: EstadisticasMensuales | null;
  notificaciones: Notificacion[];
  
  // Push Notifications
  pushToken?: string | null;
  pushPermisos?: boolean;
  
  // Configuración
  config: ConfiguracionApp;
  
  // Actions
  login: (credenciales: CredencialesLogin) => Promise<boolean>;
  logout: () => void;
  actualizarEstado: () => Promise<void>;
  cargarHistorial: (dias?: number) => Promise<void>;
  cargarEstadisticas: () => Promise<void>;
  marcarNotificacionLeida: (id: string) => Promise<void>;
  actualizarConfig: (config: Partial<ConfiguracionApp>) => void;
}
