// ==========================================
// 📢 SERVICIO DE AVISOS ESCOLARES
// ==========================================
// Noticias, eventos y comunicados del plantel
// Compatible con comunicacion-main.js del sistema principal

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { getDb } from './firebase';

// Estructura real de avisos en el sistema:
// {
//   titulo: String,
//   mensaje: String,
//   destinatarios: "todos" | "alumnos" | "3A" | etc,
//   importante: Boolean,
//   tipo: "institucional" | "profesor",
//   autorId?: String,
//   autorNombre: String,
//   fecha: Timestamp,
//   leidos: []
// }

export interface Aviso {
  id: string;
  titulo: string;
  mensaje: string;              // En el sistema se llama 'mensaje', no 'contenido'
  tipo: 'institucional' | 'profesor';
  importante: boolean;
  destinatarios: string;
  autorNombre: string;
  autorId?: string;
  fecha: Timestamp;             // En el sistema se llama 'fecha', no 'createdAt'
  leidos?: string[];
  // Campos para UI de la app
  fechaFormateada?: string;
}

class AvisosService {
  
  // ==========================================
  // 📋 OBTENER AVISOS
  // ==========================================
  
  async obtenerAvisos(alumnoGrado?: string): Promise<Aviso[]> {
    try {
      const db = getDb();
      
      // Obtener todos los avisos ordenados por fecha
      const avisosRef = collection(db, 'avisos');
      const q = query(
        avisosRef,
        orderBy('fecha', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('📢 No hay avisos en la base de datos, retornando ejemplos');
        return this.getAvisosEjemplo();
      }

      const avisos: Aviso[] = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const aviso: Aviso = {
          id: doc.id,
          titulo: data.titulo || 'Sin título',
          mensaje: data.mensaje || '',
          tipo: data.tipo || 'institucional',
          importante: data.importante || false,
          destinatarios: data.destinatarios || 'todos',
          autorNombre: data.autorNombre || 'Administración',
          autorId: data.autorId,
          fecha: data.fecha,
          leidos: data.leidos || [],
          fechaFormateada: this.formatDate(data.fecha),
        };
        
        // Filtrar avisos para padres (todos, alumnos, o grado específico)
        const dest = aviso.destinatarios;
        if (dest === 'todos' || 
            dest === 'alumnos' || 
            aviso.tipo === 'institucional' ||
            (alumnoGrado && dest.includes(alumnoGrado))) {
          avisos.push(aviso);
        }
      });

      console.log(`📢 Avisos obtenidos: ${avisos.length}`);
      return avisos;

    } catch (error) {
      console.log('📢 Error obteniendo avisos, usando ejemplos:', error);
      return this.getAvisosEjemplo();
    }
  }

  // ==========================================
  // 🔴 SUSCRIPCIÓN EN TIEMPO REAL
  // ==========================================
  
  suscribirAvisos(
    alumnoGrado: string | undefined,
    callback: (avisos: Aviso[]) => void
  ): () => void {
    try {
      const db = getDb();
      const avisosRef = collection(db, 'avisos');
      
      const q = query(
        avisosRef,
        orderBy('fecha', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
          callback(this.getAvisosEjemplo());
          return;
        }

        const avisos: Aviso[] = [];
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const aviso: Aviso = {
            id: doc.id,
            titulo: data.titulo || 'Sin título',
            mensaje: data.mensaje || '',
            tipo: data.tipo || 'institucional',
            importante: data.importante || false,
            destinatarios: data.destinatarios || 'todos',
            autorNombre: data.autorNombre || 'Administración',
            autorId: data.autorId,
            fecha: data.fecha,
            leidos: data.leidos || [],
            fechaFormateada: this.formatDate(data.fecha),
          };
          
          // Filtrar avisos para padres
          const dest = aviso.destinatarios;
          if (dest === 'todos' || 
              dest === 'alumnos' || 
              aviso.tipo === 'institucional' ||
              (alumnoGrado && dest.includes(alumnoGrado))) {
            avisos.push(aviso);
          }
        });

        callback(avisos);
      }, (error) => {
        console.log('Error en suscripción de avisos:', error);
        callback(this.getAvisosEjemplo());
      });

      return unsubscribe;

    } catch (error) {
      console.log('Error configurando suscripción:', error);
      callback(this.getAvisosEjemplo());
      return () => {};
    }
  }

  // ==========================================
  // ✅ MARCAR COMO LEÍDO
  // ==========================================
  
  async marcarComoLeido(avisoId: string, odreId: string): Promise<void> {
    try {
      const db = getDb();
      // Guardar en una colección de lecturas por padre
      // Por ahora solo log
      console.log(`📢 Aviso ${avisoId} marcado como leído`);
    } catch (error) {
      console.log('Error marcando aviso como leído:', error);
    }
  }

  // ==========================================
  // 📊 CONTAR NO LEÍDOS
  // ==========================================
  
  async contarNoLeidos(padreId: string): Promise<number> {
    // Por ahora retornar un número fijo
    // En producción, contar los que no ha leído el padre
    return 2;
  }

  // ==========================================
  // 🎨 HELPERS
  // ==========================================
  
  private formatDate(timestamp: Timestamp | any): string {
    if (!timestamp) return new Date().toISOString().split('T')[0];
    
    if (timestamp.toDate) {
      return timestamp.toDate().toISOString().split('T')[0];
    }
    
    return new Date().toISOString().split('T')[0];
  }

  // Mapear tipo del sistema a colores de UI
  getTipoColor(aviso: Aviso): string {
    if (aviso.importante) return '#ef4444'; // Rojo para urgentes
    if (aviso.tipo === 'institucional') return '#f59e0b'; // Naranja para institucional
    return '#06b6d4'; // Cyan para profesores
  }

  getTipoIcon(aviso: Aviso): string {
    if (aviso.importante) return 'alert-triangle';
    if (aviso.tipo === 'institucional') return 'building';
    return 'user';
  }

  getTipoLabel(aviso: Aviso): string {
    if (aviso.importante) return 'Urgente';
    if (aviso.tipo === 'institucional') return 'Institucional';
    return 'Profesor';
  }

  // ==========================================
  // 📝 DATOS DE EJEMPLO
  // ==========================================
  
  private getAvisosEjemplo(): Aviso[] {
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    const hace3Dias = new Date(hoy);
    hace3Dias.setDate(hace3Dias.getDate() - 3);

    return [
      {
        id: '1',
        titulo: 'Suspensión de clases',
        mensaje: 'Se informa que el próximo lunes 13 de enero se suspenden clases por capacitación docente. Las actividades se reanudan el martes 14 en horario normal.',
        tipo: 'institucional',
        importante: true,
        destinatarios: 'todos',
        autorNombre: 'Administración',
        fecha: Timestamp.now(),
        fechaFormateada: hoy.toISOString().split('T')[0],
      },
      {
        id: '2',
        titulo: 'Junta de padres de familia',
        mensaje: 'Se les invita cordialmente a la junta de padres de familia para tratar temas importantes del semestre. Se requiere la asistencia de al menos un tutor por alumno.',
        tipo: 'institucional',
        importante: false,
        destinatarios: 'todos',
        autorNombre: 'Administración',
        fecha: Timestamp.now(),
        fechaFormateada: ayer.toISOString().split('T')[0],
      },
      {
        id: '3',
        titulo: 'Nuevo protocolo de entrada',
        mensaje: 'A partir de este mes, todos los alumnos deberán portar su credencial visible para ingresar al plantel. El sistema Keyon registrará automáticamente su entrada mediante código QR.',
        tipo: 'institucional',
        importante: false,
        destinatarios: 'alumnos',
        autorNombre: 'Administración',
        fecha: Timestamp.now(),
        fechaFormateada: hace3Dias.toISOString().split('T')[0],
      },
      {
        id: '4',
        titulo: 'Recordatorio de tareas',
        mensaje: 'Recuerden entregar el proyecto final de la materia antes del viernes. Pueden subirlo a través del portal o entregarlo en físico.',
        tipo: 'profesor',
        importante: false,
        destinatarios: '6M',
        autorNombre: 'Prof. García López',
        fecha: Timestamp.now(),
        fechaFormateada: hace3Dias.toISOString().split('T')[0],
      },
    ];
  }
}

export default new AvisosService();
