// ==========================================
// 🔒 SERVICIO DE CONSENTIMIENTO BIOMÉTRICO
// ==========================================
// Compatible con sistema web de Keyon
// Estructura DB: alumnos/{control}, consentimientos/{control}

import { getDb } from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  deleteField,
  addDoc,
  collection,
  serverTimestamp
} from 'firebase/firestore';
import * as Location from 'expo-location';
import * as Crypto from 'expo-crypto';

// Tipos
export interface DatosTutor {
  nombre: string;
  parentesco: 'Padre' | 'Madre' | 'Tutor Legal' | 'Abuelo/a' | string;
  telefono: string;
  email?: string;
}

export interface Aceptaciones {
  tratamientoDatos: boolean;
  reconocimientoFacial: boolean;
  revocacion: boolean;
  notificaciones: boolean;
}

export interface UbicacionConsentimiento {
  lat: number;
  lng: number;
  ciudad?: string;
  region?: string;
  pais?: string;
}

export interface ConsentimientoData {
  alumnoId: string;
  aceptado: boolean;
  fechaConsentimiento: any;
  tutor: DatosTutor;
  aceptaciones: Aceptaciones;
  ubicacion?: UbicacionConsentimiento | null;
  ip?: string | null;
  userAgent: string;
  version: string;
}

export interface AlumnoBasico {
  id: string;
  control: string;
  nombre: string;
  apellidos: string;
  grado: string;
  grupo: string;
  turno?: string;
  consentimientoBiometrico?: boolean;
}

// ==========================================
// FUNCIONES DE UBICACIÓN
// ==========================================

/**
 * Solicitar permiso de ubicación
 */
export async function solicitarPermisoUbicacion(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    console.log('📍 Permiso de ubicación:', status);
    return status === 'granted';
  } catch (error) {
    console.log('⚠️ Error solicitando permiso de ubicación:', error);
    return false;
  }
}

/**
 * Obtener ubicación GPS del dispositivo
 */
export async function obtenerUbicacionGPS(): Promise<UbicacionConsentimiento | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('📍 Permiso de ubicación no otorgado');
      return null;
    }
    
    console.log('📍 Obteniendo ubicación GPS...');
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    
    // Intentar obtener la dirección (reverse geocoding)
    let ciudad = '';
    let region = '';
    let pais = 'Mexico';
    
    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      if (address) {
        ciudad = address.city || address.subregion || '';
        region = address.region || '';
        pais = address.country || 'Mexico';
      }
      console.log('📍 Dirección obtenida:', ciudad, region, pais);
    } catch (geoError) {
      console.log('⚠️ Reverse geocoding no disponible');
    }
    
    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      ciudad,
      region,
      pais,
    };
  } catch (error) {
    console.log('⚠️ Error obteniendo ubicación GPS:', error);
    return null;
  }
}

/**
 * Obtener IP pública con múltiples servicios de respaldo
 */
export async function obtenerIP(): Promise<string | null> {
  const servicios = [
    { url: 'https://api.ipify.org?format=json', tipo: 'json', campo: 'ip' },
    { url: 'https://api64.ipify.org?format=json', tipo: 'json', campo: 'ip' },
    { url: 'https://httpbin.org/ip', tipo: 'json', campo: 'origin' },
    { url: 'https://icanhazip.com', tipo: 'text', campo: null },
  ];
  
  for (const servicio of servicios) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(servicio.url, { 
        headers: { 'Accept': 'application/json, text/plain' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) continue;
      
      if (servicio.tipo === 'json') {
        const data = await response.json();
        const ip = data[servicio.campo!];
        if (ip) {
          console.log('✅ IP obtenida:', ip);
          return ip.split(',')[0].trim(); // Por si viene con proxy
        }
      } else {
        const text = await response.text();
        const ip = text.trim();
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip) || ip.includes(':')) {
          console.log('✅ IP obtenida:', ip);
          return ip;
        }
      }
    } catch (error) {
      console.log(`⚠️ Servicio ${servicio.url} no disponible`);
      continue;
    }
  }
  
  console.log('⚠️ No se pudo obtener IP');
  return null;
}

/**
 * Obtener ubicación completa (GPS + IP) en paralelo
 */
export async function obtenerUbicacionCompleta(): Promise<{
  ubicacion: UbicacionConsentimiento | null;
  ip: string | null;
}> {
  console.log('🔄 Obteniendo ubicación e IP...');
  
  const [ubicacion, ip] = await Promise.all([
    obtenerUbicacionGPS(),
    obtenerIP(),
  ]);
  
  console.log('📍 Resultado ubicación:', ubicacion ? 'OK' : 'null');
  console.log('🌐 Resultado IP:', ip || 'null');
  
  return { ubicacion, ip };
}

// ==========================================
// FUNCIONES PRINCIPALES
// ==========================================

/**
 * Verificar si un alumno tiene consentimiento
 */
export async function verificarConsentimiento(control: string): Promise<boolean> {
  try {
    if (!control) {
      console.log('⚠️ verificarConsentimiento: control vacío');
      return false;
    }
    
    const db = getDb();
    
    // Primero intentar en colección consentimientos
    const consentRef = doc(db, 'consentimientos', control);
    const consentDoc = await getDoc(consentRef);
    
    if (consentDoc.exists()) {
      const data = consentDoc.data();
      return data.aceptado === true;
    }
    
    // Si no existe en consentimientos, verificar en el documento del alumno
    const alumnoRef = doc(db, 'alumnos', control);
    const alumnoDoc = await getDoc(alumnoRef);
    
    if (alumnoDoc.exists()) {
      const data = alumnoDoc.data();
      return data.consentimientoBiometrico === true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error verificando consentimiento:', error);
    return false;
  }
}

/**
 * Obtener datos del consentimiento existente
 */
export async function obtenerConsentimiento(control: string): Promise<ConsentimientoData | null> {
  try {
    if (!control) return null;
    
    const db = getDb();
    const consentRef = doc(db, 'consentimientos', control);
    const consentDoc = await getDoc(consentRef);
    
    if (consentDoc.exists()) {
      return consentDoc.data() as ConsentimientoData;
    }
    return null;
  } catch (error) {
    console.error('❌ Error obteniendo consentimiento:', error);
    return null;
  }
}

/**
 * Obtener datos básicos del alumno
 */
export async function obtenerAlumnoBasico(control: string): Promise<AlumnoBasico | null> {
  try {
    if (!control) return null;
    
    const db = getDb();
    const alumnoRef = doc(db, 'alumnos', control);
    const alumnoDoc = await getDoc(alumnoRef);
    
    if (alumnoDoc.exists()) {
      const data = alumnoDoc.data();
      return {
        id: alumnoDoc.id,
        control: data.control || alumnoDoc.id,
        nombre: data.nombre || '',
        apellidos: data.apellidos || '',
        grado: data.grado || '',
        grupo: data.grupo || '',
        turno: data.turno || 'Matutino',
        consentimientoBiometrico: data.consentimientoBiometrico || false
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error obteniendo alumno:', error);
    return null;
  }
}

/**
 * Guardar consentimiento (formato idéntico al web - sin plataforma)
 */
export async function guardarConsentimiento(
  control: string,
  tutor: DatosTutor,
  aceptaciones: Aceptaciones,
  userAgent: string,
  ubicacion: UbicacionConsentimiento | null,
  ip: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!control) {
      return { success: false, error: 'Número de control no válido' };
    }
    
    console.log('💾 Guardando consentimiento para:', control);
    
    const db = getDb();
    
    // Datos del consentimiento (formato IDÉNTICO al web)
    const consentimientoData = {
      alumnoId: control,
      aceptado: true,
      fechaConsentimiento: serverTimestamp(),
      tutor: {
        nombre: tutor.nombre,
        parentesco: tutor.parentesco,
        telefono: tutor.telefono,
        email: tutor.email || null
      },
      aceptaciones: {
        tratamientoDatos: aceptaciones.tratamientoDatos,
        reconocimientoFacial: aceptaciones.reconocimientoFacial,
        revocacion: aceptaciones.revocacion,
        notificaciones: aceptaciones.notificaciones
      },
      ubicacion: ubicacion ? {
        lat: ubicacion.lat,
        lng: ubicacion.lng,
        ciudad: ubicacion.ciudad || '',
        region: ubicacion.region || '',
        pais: ubicacion.pais || 'Mexico'
      } : null,
      ip: ip,
      userAgent: userAgent,
      version: '1.0'
    };
    
    // Guardar en colección consentimientos
    const consentRef = doc(db, 'consentimientos', control);
    await setDoc(consentRef, consentimientoData);
    console.log('✅ Guardado en consentimientos/', control);
    
    // Actualizar documento del alumno
    try {
      const alumnoRef = doc(db, 'alumnos', control);
      await updateDoc(alumnoRef, {
        consentimientoBiometrico: true,
        fechaConsentimiento: serverTimestamp(),
        tutorAutoriza: tutor.nombre
      });
      console.log('✅ Actualizado alumnos/', control);
    } catch (updateError) {
      console.warn('⚠️ No se pudo actualizar alumno:', updateError);
    }
    
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ Error guardando consentimiento:', error);
    return { 
      success: false, 
      error: error.message || 'Error desconocido al guardar' 
    };
  }
}

// ==========================================
// VERIFICACIÓN POR CÓDIGO (WhatsApp)
// ==========================================

/**
 * Generar código de 6 dígitos
 */
function generarCodigo(): string {
  const min = 100000;
  const max = 999999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

/**
 * Hash del código usando expo-crypto
 */
async function hashCodigo(codigo: string): Promise<string> {
  const data = codigo + '_KEYON_CONSENT_SALT_V2';
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data
  );
  return hash;
}

/**
 * Solicitar verificación - Crea solicitud para que admin envíe código por WhatsApp
 */
export async function solicitarVerificacion(
  control: string,
  tutor: DatosTutor
): Promise<{ success: boolean; message: string; pending?: boolean }> {
  try {
    if (!control) {
      return { success: false, message: 'Número de control no válido' };
    }
    
    const db = getDb();
    
    // Limpiar teléfono
    let cleanPhone = tutor.telefono.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '52' + cleanPhone;
    }
    
    // Verificar si ya hay solicitud pendiente
    const existingRef = doc(db, 'consent_codes', control);
    const existingDoc = await getDoc(existingRef);
    
    if (existingDoc.exists()) {
      const data = existingDoc.data();
      const now = new Date();
      
      // Verificar bloqueo
      if (data.lockedUntil) {
        const lockedUntil = data.lockedUntil.toDate();
        if (now < lockedUntil) {
          const waitMinutes = Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000);
          return { success: false, message: `Demasiados intentos. Espera ${waitMinutes} minutos.` };
        }
      }
      
      // Verificar si hay código válido pendiente
      const expiresAt = data.expiresAt?.toDate();
      if (expiresAt && now < expiresAt && !data.used) {
        return { 
          success: true, 
          message: 'Ya hay una solicitud pendiente. El administrador te enviará el código por WhatsApp.',
          pending: true 
        };
      }
    }
    
    // Generar nuevo código
    const codigo = generarCodigo();
    const codigoHash = await hashCodigo(codigo);
    const expiresAt = new Date(Date.now() + 30 * 60000); // 30 minutos
    
    // Obtener datos del alumno
    let alumnoNombre = 'Alumno';
    let alumnoGrado = '';
    try {
      const alumnoDoc = await getDoc(doc(db, 'alumnos', control));
      if (alumnoDoc.exists()) {
        const alumno = alumnoDoc.data();
        alumnoNombre = `${alumno.nombre || ''} ${alumno.apellidos || ''}`.trim();
        alumnoGrado = `${alumno.grado || ''}° ${alumno.grupo || ''}`;
      }
    } catch (e) {
      console.warn('No se pudo obtener datos del alumno');
    }
    
    // Guardar código (hash) para verificación
    await setDoc(doc(db, 'consent_codes', control), {
      alumnoId: control,
      codeHash: codigoHash,
      tutorPhone: cleanPhone,
      tutorNombre: tutor.nombre,
      tutorParentesco: tutor.parentesco,
      tutorEmail: tutor.email || null,
      createdAt: serverTimestamp(),
      expiresAt: expiresAt,
      attempts: 0,
      used: false,
      lockedUntil: null
    });
    
    // Crear solicitud pendiente para el ADMIN (código visible)
    await setDoc(doc(db, 'consent_pending', control), {
      alumnoId: control,
      alumnoNombre,
      alumnoGrado,
      tutorNombre: tutor.nombre,
      tutorParentesco: tutor.parentesco,
      tutorPhone: cleanPhone,
      tutorEmail: tutor.email || null,
      codigo: codigo, // Código visible para admin
      createdAt: serverTimestamp(),
      expiresAt: expiresAt,
      estado: 'pendiente',
      enviadoPor: null,
      enviadoAt: null,
      plataforma: 'app' // Marcar que viene de la app
    });
    
    console.log('📝 Solicitud de verificación creada para:', control);
    
    return { 
      success: true, 
      message: 'Solicitud enviada. Un administrador te enviará el código por WhatsApp.',
      pending: true
    };
    
  } catch (error: any) {
    console.error('❌ Error solicitando verificación:', error);
    return { success: false, message: error.message || 'Error al procesar la solicitud' };
  }
}

/**
 * Verificar código ingresado por el padre
 */
export async function verificarCodigo(
  control: string,
  codigoIngresado: string
): Promise<{ valid: boolean; message: string; remainingAttempts?: number }> {
  try {
    const db = getDb();
    const docRef = doc(db, 'consent_codes', control);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return { valid: false, message: 'No hay solicitud de verificación activa' };
    }
    
    const data = docSnap.data();
    const now = new Date();
    
    // Verificar bloqueo
    if (data.lockedUntil) {
      const lockedUntil = data.lockedUntil.toDate();
      if (now < lockedUntil) {
        const waitMinutes = Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000);
        return { valid: false, message: `Cuenta bloqueada. Espera ${waitMinutes} minutos.` };
      }
    }
    
    // Verificar expiración
    const expiresAt = data.expiresAt?.toDate();
    if (!expiresAt || now > expiresAt) {
      return { valid: false, message: 'El código ha expirado. Solicita uno nuevo.' };
    }
    
    // Verificar si ya fue usado
    if (data.used) {
      return { valid: false, message: 'Este código ya fue utilizado' };
    }
    
    // Verificar código
    const inputHash = await hashCodigo(codigoIngresado.trim());
    
    if (inputHash === data.codeHash) {
      // ✅ Código correcto
      await updateDoc(docRef, {
        used: true,
        usedAt: serverTimestamp()
      });
      
      // Actualizar estado en consent_pending
      try {
        await updateDoc(doc(db, 'consent_pending', control), {
          estado: 'verificado',
          verificadoAt: serverTimestamp()
        });
      } catch (e) {}
      
      return { valid: true, message: 'Código verificado correctamente' };
    } else {
      // ❌ Código incorrecto
      const newAttempts = (data.attempts || 0) + 1;
      const maxAttempts = 3;
      const remainingAttempts = maxAttempts - newAttempts;
      
      const updateData: any = { attempts: newAttempts };
      
      if (newAttempts >= maxAttempts) {
        // Bloquear por 30 minutos
        updateData.lockedUntil = new Date(Date.now() + 30 * 60000);
      }
      
      await updateDoc(docRef, updateData);
      
      return {
        valid: false,
        message: remainingAttempts > 0 
          ? `Código incorrecto. Te quedan ${remainingAttempts} intentos.`
          : 'Demasiados intentos. Espera 30 minutos.',
        remainingAttempts
      };
    }
    
  } catch (error: any) {
    console.error('❌ Error verificando código:', error);
    return { valid: false, message: 'Error al verificar código' };
  }
}

/**
 * Revocar consentimiento y eliminar datos biométricos
 */
export async function revocarConsentimiento(
  control: string,
  motivo?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!control) {
      return { success: false, error: 'Número de control no válido' };
    }
    
    const db = getDb();
    const timestamp = serverTimestamp();
    
    // 1. Actualizar documento de consentimiento
    const consentRef = doc(db, 'consentimientos', control);
    await updateDoc(consentRef, {
      aceptado: false,
      fechaRevocacion: timestamp,
      motivoRevocacion: motivo || 'Revocado por el tutor desde la app',
      datosEliminados: true
    });
    
    // 2. Actualizar alumno Y ELIMINAR datos biométricos
    try {
      const alumnoRef = doc(db, 'alumnos', control);
      await updateDoc(alumnoRef, {
        consentimientoBiometrico: false,
        fechaRevocacion: timestamp,
        // Eliminar campo de reconocimiento facial
        reconocimientoFacial: deleteField()
      });
    } catch (e) {
      console.warn('⚠️ No se pudo actualizar alumno:', e);
    }
    
    // 3. Intentar eliminar de colecciones separadas (si existen)
    try {
      await deleteDoc(doc(db, 'datos_faciales', control));
    } catch (e) { /* No existía */ }
    
    try {
      await deleteDoc(doc(db, 'biometricos', control));
    } catch (e) { /* No existía */ }
    
    // 4. Registrar en log de seguridad (LFPDPPP compliance)
    try {
      const ip = await obtenerIP();
      await addDoc(collection(db, 'security_logs'), {
        tipo: 'BIOMETRIC_DATA_DELETED',
        alumnoId: control,
        accion: 'Eliminación de datos biométricos por revocación de consentimiento',
        ejecutadoPor: 'Padre/Tutor (App)',
        timestamp: timestamp,
        datosEliminados: [
          'reconocimientoFacial.descriptor',
          'reconocimientoFacial.fechaRegistro'
        ],
        ipCliente: ip || 'No disponible',
        plataforma: 'KeyonPadresApp',
        cumplimiento: 'LFPDPPP Art. 11 - Derecho de Cancelación'
      });
    } catch (logError) {
      console.warn('⚠️ No se pudo registrar en security_logs:', logError);
    }
    
    console.log('✅ Consentimiento revocado y datos biométricos eliminados');
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ Error revocando consentimiento:', error);
    return { 
      success: false, 
      error: error.message || 'Error al revocar' 
    };
  }
}

// Textos legales
export const TEXTOS_LEGALES = {
  titulo: 'Consentimiento Biométrico',
  subtitulo: 'Keyon Access System - CBTis',
  
  seccion1: {
    titulo: '📋 1. Datos que Recopilamos',
    items: [
      { label: 'Datos biométricos faciales:', desc: 'Para identificación' },
      { label: 'Registros de asistencia:', desc: 'Fecha y hora' },
      { label: 'Datos de identificación:', desc: 'Nombre, control' }
    ]
  },
  
  seccion2: {
    titulo: '🎯 2. Finalidad',
    items: [
      'Control de acceso seguro al plantel',
      'Registro automático de asistencia',
      'Notificaciones a padres',
      'Seguridad de los estudiantes'
    ]
  },
  
  seccion3: {
    titulo: '⚖️ 3. Base Legal (México)',
    items: [
      'LFPDPPP - Arts. 5, 7, 8, 9',
      'Ley General de Derechos de NNA',
      'Código Civil Federal - Art. 23'
    ]
  },
  
  seccion4: {
    titulo: '🛡️ 4. Derechos ARCO',
    descripcion: 'Acceso, Rectificación, Cancelación, Oposición',
    contacto: 'privacidad@keyon.app'
  },
  
  checkboxes: [
    'He leído y entiendo el tratamiento de datos biométricos de mi hijo/a.',
    'Autorizo el uso del reconocimiento facial para control de acceso.',
    'Entiendo que puedo revocar este consentimiento en cualquier momento.',
    'Acepto recibir notificaciones sobre la asistencia de mi hijo/a.'
  ],
  
  firmaDigital: {
    titulo: '✍️ Firma Digital',
    texto: 'Declaro bajo protesta de decir verdad que soy el padre, madre o tutor legal del alumno y otorgo mi consentimiento expreso. Esta acción tiene validez legal según el Art. 8 de la LFPDPPP.'
  }
};

export const PARENTESCOS = [
  { value: 'Padre', label: 'Padre' },
  { value: 'Madre', label: 'Madre' },
  { value: 'Tutor Legal', label: 'Tutor Legal' },
  { value: 'Abuelo/a', label: 'Abuelo/a' }
];
