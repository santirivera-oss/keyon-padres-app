// =====================================================================
// 🛡️ KEYON PADRES - SERVICIO ARCO (LFPDPPP)
// =====================================================================
// Cliente para las 3 Cloud Functions callables que ejecutan derechos
// LFPDPPP del titular (Arts. 16, 17, 18, 20):
//   - arcoMisDatos             → Acceso (export JSON)
//   - arcoSolicitarCorreccion  → Rectificación (queue para admin)
//   - arcoRevocarConsentimiento → Cancelación (purga descriptor + audit)
//
// Auth model: pasa (alumnoControl, codigo) en cada call. El backend
// valida que el código exista en padres_codigos vinculado al alumno y
// esté activo. Sin custom claims, sin tokens adicionales.
// =====================================================================

import { getFunctions, httpsCallable, Functions } from 'firebase/functions';
import { initializeFirebase } from './firebase';
import { obtenerSesion } from './auth';

let functions: Functions | null = null;

function getFunctionsClient(): Functions {
  if (!functions) {
    const app = initializeFirebase();
    functions = getFunctions(app, 'us-central1');
  }
  return functions;
}

async function obtenerCredencialesARCO(): Promise<{ alumnoControl: string; codigo: string }> {
  const sesion = await obtenerSesion();
  if (!sesion) {
    throw new Error('No hay sesión activa. Vuelve a iniciar sesión.');
  }
  const alumnoControl = sesion.alumno?.control || sesion.alumnoId;
  const codigo = sesion.codigo;
  if (!alumnoControl) {
    throw new Error('Sesión sin alumno asociado.');
  }
  if (!codigo) {
    throw new Error(
      'Tu sesión es de una versión anterior y no incluye el código necesario para ARCO. ' +
      'Cierra sesión y vuelve a entrar para habilitar derechos ARCO.'
    );
  }
  return { alumnoControl, codigo };
}

// =====================================================================
// ART. 16 — ACCESO (descargar mis datos)
// =====================================================================

export interface ArcoExport {
  generadoEn: string;
  titular: string;
  versionLFPDPPP: string;
  alumno: any;
  consentimiento: any;
  asistencia: Array<{
    id: string;
    fecha: string;
    hora: string;
    tipoRegistro: string;
    modo: string;
    estadoLlegada?: string | null;
    origen?: string | null;
  }>;
  calificaciones: any[];
  reportesDisciplina: any[];
  nota: string;
}

export async function descargarMisDatos(): Promise<ArcoExport> {
  const { alumnoControl, codigo } = await obtenerCredencialesARCO();
  const fn = httpsCallable<any, ArcoExport>(getFunctionsClient(), 'arcoMisDatos');
  const result = await fn({ alumnoControl, codigo });
  return result.data;
}

// =====================================================================
// ART. 17 — RECTIFICACIÓN (solicitar corrección)
// =====================================================================

export interface SolicitudCorreccion {
  campo: string;          // ej. "whatsapp" o "email"
  valorActual?: string;
  valorPropuesto: string;
  descripcion: string;
}

export async function solicitarCorreccion(input: SolicitudCorreccion): Promise<{ success: boolean; solicitudId: string }> {
  const { alumnoControl, codigo } = await obtenerCredencialesARCO();
  if (!input.campo || !input.valorPropuesto || !input.descripcion) {
    throw new Error('Falta campo, valor propuesto o descripción.');
  }
  const fn = httpsCallable<any, { success: boolean; solicitudId: string }>(
    getFunctionsClient(),
    'arcoSolicitarCorreccion'
  );
  const result = await fn({
    alumnoControl,
    codigo,
    campo: input.campo,
    valorActual: input.valorActual || '',
    valorPropuesto: input.valorPropuesto,
    descripcion: input.descripcion,
  });
  return result.data;
}

// =====================================================================
// ART. 18 / 20 — CANCELACIÓN (revocar consentimiento biométrico)
// =====================================================================

export async function revocarConsentimiento(motivo?: string): Promise<{
  success: boolean;
  descriptorEliminado: boolean;
  mensaje: string;
}> {
  const { alumnoControl, codigo } = await obtenerCredencialesARCO();
  const fn = httpsCallable<any, { success: boolean; descriptorEliminado: boolean; mensaje: string }>(
    getFunctionsClient(),
    'arcoRevocarConsentimiento'
  );
  const result = await fn({ alumnoControl, codigo, motivo: motivo || '' });
  return result.data;
}
