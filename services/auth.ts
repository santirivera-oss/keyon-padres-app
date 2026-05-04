// ==========================================
// 🔐 KEYON PADRES - SERVICIO AUTH
// Con soporte para Web y Nativo
// ==========================================

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { 
  getDb, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  COLLECTIONS 
} from './firebase';
import { Alumno, SesionPadre, CredencialesLogin, ApiResponse } from '../types';
import { STORAGE_KEYS } from '../constants/Config';

// ============ STORAGE WRAPPER ============
// SecureStore no funciona en web, usamos localStorage como fallback

const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.warn('Storage getItem error:', error);
      // Fallback a localStorage si SecureStore falla
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.warn('Storage setItem error:', error);
      // Fallback a localStorage si SecureStore falla
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn('Storage removeItem error:', error);
      // Fallback a localStorage si SecureStore falla
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    }
  }
};

// ============ LOGIN ============

/**
 * Autenticar padre con número de control y código
 */
export async function login(credenciales: CredencialesLogin): Promise<ApiResponse<SesionPadre>> {
  try {
    console.log('🔍 Auth: Credenciales recibidas:', JSON.stringify(credenciales));
    
    // Extraer valores de forma súper defensiva
    let control = '';
    let codigo = '';
    
    // Si credenciales es un objeto con control y codigo
    if (credenciales && typeof credenciales === 'object') {
      // Extraer control
      if (typeof credenciales.control === 'string') {
        control = credenciales.control.trim();
      } else if (credenciales.control && typeof credenciales.control === 'object') {
        // Si control es un objeto (bug), intentar extraer el valor
        const ctrlObj = credenciales.control as any;
        control = String(ctrlObj.control || ctrlObj.value || ctrlObj || '').trim();
      }
      
      // Extraer codigo
      if (typeof credenciales.codigo === 'string') {
        codigo = credenciales.codigo.trim();
      } else if (credenciales.codigo && typeof credenciales.codigo === 'object') {
        // Si codigo es un objeto (bug), intentar extraer el valor
        const codObj = credenciales.codigo as any;
        codigo = String(codObj.codigo || codObj.value || codObj || '').trim();
      }
    }
    
    console.log('📝 Control extraído:', control, '| Length:', control.length);
    console.log('📝 Código extraído:', codigo);
    
    if (!control || !codigo) {
      return { success: false, error: 'Ingresa el número de control y código' };
    }
    
    const db = getDb();
    console.log('🔥 Firebase DB obtenida');
    
    // MÉTODO 1: Buscar alumno directamente por ID del documento (el ID ES el número de control)
    console.log('🔍 Buscando documento con ID:', control);
    const alumnoRef = doc(db, COLLECTIONS.alumnos, control);
    
    let alumnoDoc = await getDoc(alumnoRef);
    let alumnoData: any = null;
    let alumnoId = control;
    
    console.log('📄 Documento existe?:', alumnoDoc.exists());
    
    if (alumnoDoc.exists()) {
      alumnoData = alumnoDoc.data();
      console.log('✅ Alumno encontrado por ID de documento');
    } else {
      // MÉTODO 2: Buscar por campo 'control' si no se encontró por ID
      console.log('🔍 No encontrado por ID, buscando por campo control...');
      const alumnosRef = collection(db, COLLECTIONS.alumnos);
      const q = query(alumnosRef, where('control', '==', control));
      const snapshot = await getDocs(q);
      
      console.log('📊 Resultados de query por campo control:', snapshot.size);
      
      if (snapshot.empty) {
        console.log('❌ No se encontró alumno con control:', control);
        return { success: false, error: 'Número de control no encontrado' };
      }
      
      alumnoDoc = snapshot.docs[0];
      alumnoData = alumnoDoc.data();
      alumnoId = alumnoDoc.id;
      console.log('✅ Alumno encontrado por campo control, ID:', alumnoId);
    }
    
    // Verificar código del padre
    const codigoValido = await verificarCodigoPadre(alumnoId, codigo);
    
    if (!codigoValido) {
      return { success: false, error: 'Código de acceso incorrecto' };
    }
    
    // Crear sesión
    const alumno: Alumno = {
      id: alumnoId,
      control: alumnoData.control || control,
      nombre: alumnoData.nombre || '',
      apellidos: alumnoData.apellidos || '',
      grado: alumnoData.grado || '',
      grupo: alumnoData.grupo || '',
      turno: alumnoData.turno || 'Matutino',
      foto: alumnoData.foto,
      especialidad: alumnoData.especialidad,
    };
    
    const sesion: SesionPadre = {
      alumnoId: alumno.id,
      alumno,
      expiracion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      // ARCO: persistir el código (uppercase) para llamar a Cloud Functions
      // arcoMisDatos / arcoSolicitarCorreccion / arcoRevocarConsentimiento.
      codigo: codigo.toUpperCase(),
    };
    
    // Guardar sesión
    await guardarSesion(sesion);
    
    return { success: true, data: sesion };
    
  } catch (error: any) {
    console.error('Error en login:', error);
    return { success: false, error: error.message || 'Error al iniciar sesión' };
  }
}

/**
 * Verificar código del padre
 * Sistema de validación real con múltiples fuentes
 */
async function verificarCodigoPadre(alumnoId: string, codigo: string): Promise<boolean> {
  try {
    const db = getDb();
    
    // Validación básica del formato (4-8 caracteres alfanuméricos)
    if (!codigo || codigo.length < 4 || codigo.length > 8) {
      console.log('❌ Código con formato inválido');
      return false;
    }
    
    // MÉTODO 1: Buscar en colección padres_codigos (preferido)
    try {
      const codigosRef = collection(db, 'padres_codigos');
      const q = query(codigosRef, where('alumnoId', '==', alumnoId));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const codigoDoc = snapshot.docs[0].data();
        
        // Verificar si el código está activo
        if (codigoDoc.activo === false) {
          console.log('❌ Código desactivado');
          return false;
        }
        
        // Verificar si ha expirado
        if (codigoDoc.expiracion) {
          const expiracion = codigoDoc.expiracion.toDate ? 
            codigoDoc.expiracion.toDate() : new Date(codigoDoc.expiracion);
          if (expiracion < new Date()) {
            console.log('❌ Código expirado');
            return false;
          }
        }
        
        // Comparar código (case insensitive para alfanuméricos)
        const codigoGuardado = String(codigoDoc.codigo).toUpperCase();
        const codigoIngresado = String(codigo).toUpperCase();
        
        if (codigoGuardado === codigoIngresado) {
          console.log('✅ Código verificado desde padres_codigos');
          return true;
        }
        
        console.log('❌ Código no coincide');
        return false;
      }
    } catch (e) {
      console.log('⚠️ Colección padres_codigos no disponible, probando fallback...', e);
    }
    
    // MÉTODO 2: Fallback - Campo codigoPadre en documento del alumno
    const alumnoRef = doc(db, COLLECTIONS.alumnos, alumnoId);
    const alumnoDoc = await getDoc(alumnoRef);
    
    if (alumnoDoc.exists()) {
      const data = alumnoDoc.data();
      
      if (data.codigoPadre) {
        const codigoGuardado = String(data.codigoPadre).toUpperCase();
        const codigoIngresado = String(codigo).toUpperCase();
        
        if (codigoGuardado === codigoIngresado) {
          console.log('✅ Código verificado desde campo codigoPadre');
          return true;
        }
      }
    }
    
    // No se encontró código válido
    console.log('❌ No hay código de padre registrado para este alumno');
    return false;
    
  } catch (error) {
    console.error('Error verificando código:', error);
    return false;
  }
}

// ============ SESIÓN ============

/**
 * Guardar sesión
 */
export async function guardarSesion(sesion: SesionPadre): Promise<void> {
  try {
    await storage.setItem(STORAGE_KEYS.session, JSON.stringify(sesion));
    console.log('✅ Sesión guardada');
  } catch (error) {
    console.error('Error guardando sesión:', error);
    throw error;
  }
}

/**
 * Obtener sesión guardada
 */
export async function obtenerSesion(): Promise<SesionPadre | null> {
  try {
    const sesionStr = await storage.getItem(STORAGE_KEYS.session);
    
    if (!sesionStr) {
      return null;
    }
    
    const sesion: SesionPadre = JSON.parse(sesionStr);
    
    // Verificar expiración
    if (sesion.expiracion && new Date(sesion.expiracion) < new Date()) {
      await eliminarSesion();
      return null;
    }
    
    return sesion;
    
  } catch (error) {
    console.error('Error obteniendo sesión:', error);
    return null;
  }
}

/**
 * Eliminar sesión (logout)
 */
export async function eliminarSesion(): Promise<void> {
  try {
    await storage.removeItem(STORAGE_KEYS.session);
    await storage.removeItem(STORAGE_KEYS.alumno);
    await storage.removeItem(STORAGE_KEYS.lastSync);
    console.log('✅ Sesión eliminada');
  } catch (error) {
    console.error('Error eliminando sesión:', error);
  }
}

/**
 * Logout completo
 */
export async function logout(): Promise<void> {
  await eliminarSesion();
}

/**
 * Verificar si hay sesión activa
 */
export async function verificarSesion(): Promise<boolean> {
  const sesion = await obtenerSesion();
  return sesion !== null;
}

// ============ REFRESH ============

/**
 * Refrescar datos del alumno desde Firebase
 */
export async function refrescarAlumno(alumnoId: string): Promise<Alumno | null> {
  try {
    const db = getDb();
    const alumnoRef = doc(db, COLLECTIONS.alumnos, alumnoId);
    const alumnoDoc = await getDoc(alumnoRef);
    
    if (!alumnoDoc.exists()) {
      return null;
    }
    
    const data = alumnoDoc.data();
    
    return {
      id: alumnoDoc.id,
      control: data.control || '',
      nombre: data.nombre || '',
      apellidos: data.apellidos || '',
      grado: data.grado || '',
      grupo: data.grupo || '',
      turno: data.turno || 'Matutino',
      foto: data.foto,
      especialidad: data.especialidad,
    };
    
  } catch (error) {
    console.error('Error refrescando alumno:', error);
    return null;
  }
}

export default {
  login,
  logout,
  obtenerSesion,
  verificarSesion,
  refrescarAlumno,
};
