// ==========================================
// 📋 SERVICIO DE JUSTIFICANTES
// ==========================================
// Enviar justificantes de falta desde la app

import { 
  collection, 
  addDoc,
  query, 
  where, 
  orderBy, 
  getDocs,
  Timestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { getDb } from './firebase';

export type MotivoJustificante = 
  | 'enfermedad'
  | 'cita_medica'
  | 'asunto_familiar'
  | 'tramite'
  | 'otro';

export type EstadoJustificante = 
  | 'pendiente'
  | 'aprobado'
  | 'rechazado';

export interface Justificante {
  id: string;
  alumnoId: string;
  alumnoNombre: string;
  padreId: string;
  padreNombre: string;
  fecha: string; // Fecha de la falta
  motivo: MotivoJustificante;
  descripcion: string;
  evidenciaUrl?: string; // URL de imagen/documento adjunto
  estado: EstadoJustificante;
  comentarioEscuela?: string;
  escuelaId: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface NuevoJustificante {
  alumnoId: string;
  alumnoNombre: string;
  padreId: string;
  padreNombre: string;
  fecha: string;
  motivo: MotivoJustificante;
  descripcion: string;
  evidenciaBase64?: string;
}

class JustificantesService {

  // ==========================================
  // 📤 ENVIAR JUSTIFICANTE
  // ==========================================
  
  async enviarJustificante(datos: NuevoJustificante): Promise<{ success: boolean; message: string; id?: string }> {
    try {
      const db = getDb();
      
      const justificante = {
        alumnoId: datos.alumnoId,
        alumnoNombre: datos.alumnoNombre,
        padreId: datos.padreId,
        padreNombre: datos.padreNombre,
        fecha: datos.fecha,
        motivo: datos.motivo,
        descripcion: datos.descripcion,
        evidenciaUrl: datos.evidenciaBase64 || null,
        estado: 'pendiente' as EstadoJustificante,
        escuelaId: 'cbtis_233',
        createdAt: Timestamp.now(),
      };

      console.log('📋 Enviando justificante:', justificante);

      const docRef = await addDoc(collection(db, 'justificantes'), justificante);
      
      console.log('✅ Justificante enviado con ID:', docRef.id);

      return {
        success: true,
        message: 'Justificante enviado correctamente. Será revisado por la escuela.',
        id: docRef.id,
      };

    } catch (error: any) {
      console.error('❌ Error enviando justificante:', error);
      return {
        success: false,
        message: error.message || 'Error al enviar el justificante',
      };
    }
  }

  // ==========================================
  // 📋 OBTENER JUSTIFICANTES DEL ALUMNO
  // ==========================================
  
  async obtenerJustificantes(alumnoId: string): Promise<Justificante[]> {
    try {
      const db = getDb();
      
      const justificantesRef = collection(db, 'justificantes');
      const q = query(
        justificantesRef,
        where('alumnoId', '==', alumnoId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      
      const justificantes: Justificante[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Justificante));

      console.log(`📋 Justificantes obtenidos: ${justificantes.length}`);
      return justificantes;

    } catch (error) {
      console.log('Error obteniendo justificantes:', error);
      return [];
    }
  }

  // ==========================================
  // 🎨 HELPERS
  // ==========================================
  
  getMotivoLabel(motivo: MotivoJustificante): string {
    switch (motivo) {
      case 'enfermedad': return 'Enfermedad';
      case 'cita_medica': return 'Cita médica';
      case 'asunto_familiar': return 'Asunto familiar';
      case 'tramite': return 'Trámite';
      case 'otro': return 'Otro';
      default: return 'Sin especificar';
    }
  }

  getMotivoIcon(motivo: MotivoJustificante): string {
    switch (motivo) {
      case 'enfermedad': return 'thermometer';
      case 'cita_medica': return 'activity';
      case 'asunto_familiar': return 'users';
      case 'tramite': return 'file-text';
      case 'otro': return 'help-circle';
      default: return 'file';
    }
  }

  getEstadoColor(estado: EstadoJustificante): string {
    switch (estado) {
      case 'pendiente': return '#f59e0b';
      case 'aprobado': return '#10b981';
      case 'rechazado': return '#ef4444';
      default: return '#64748b';
    }
  }

  getEstadoLabel(estado: EstadoJustificante): string {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'aprobado': return 'Aprobado';
      case 'rechazado': return 'Rechazado';
      default: return 'Desconocido';
    }
  }

  getMotivos(): { value: MotivoJustificante; label: string; icon: string }[] {
    return [
      { value: 'enfermedad', label: 'Enfermedad', icon: 'thermometer' },
      { value: 'cita_medica', label: 'Cita médica', icon: 'activity' },
      { value: 'asunto_familiar', label: 'Asunto familiar', icon: 'users' },
      { value: 'tramite', label: 'Trámite', icon: 'file-text' },
      { value: 'otro', label: 'Otro motivo', icon: 'help-circle' },
    ];
  }
}

export default new JustificantesService();
