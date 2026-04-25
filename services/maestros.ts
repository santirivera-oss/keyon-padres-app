// ==========================================
// 👨‍🏫 SERVICIO DE MAESTROS
// ==========================================
// Devuelve los maestros que dan clase al grupo del alumno.
// Maneja tanto profesor.grupos como array (v3.20.0+) como string legacy
// ("2A, 4B"). Filtro en cliente porque array-contains no aplica al string.
//
// Doc shape `profesores/{id}`:
//   { nombre, apellidos, telefono?, whatsapp?, email?,
//     materias: string | string[],   // CSV legacy o array
//     grupos: string | string[],     // CSV legacy o array (v3.20.0)
//     activo? }

import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

export interface Maestro {
  id: string;
  nombre: string;
  apellidos: string;
  nombreCompleto: string;
  iniciales: string;
  materias: string[];
  grupos: string[];
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  activo: boolean;
}

/** Normaliza un grupo a formato canónico "5A". */
export function normalizarGrupo(raw: any): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toUpperCase();
  if (!s) return null;
  const limpio = s.replace(/[°º]|TO|DO|RO|MO/g, '').replace(/\s+/g, '');
  const m = limpio.match(/^(\d+)([A-Z]+)$/);
  if (m) return m[1] + m[2];
  const m2 = limpio.match(/^([A-Z]+)(\d+)$/);
  if (m2) return m2[2] + m2[1];
  return null;
}

/** Parsea profesor.grupos (array o CSV string) a Set normalizado. */
function parsearGrupos(raw: any): Set<string> {
  if (!raw) return new Set();
  let items: any[] = [];
  if (Array.isArray(raw)) items = raw;
  else if (typeof raw === 'string') items = raw.split(/[,;|/]+/);
  const normalizados = items
    .map((g) => normalizarGrupo(g))
    .filter((g): g is string => !!g);
  return new Set(normalizados);
}

/** Parsea profesor.materias (array o CSV string) a array de strings limpios. */
function parsearMaterias(raw: any): string[] {
  if (!raw) return [];
  let items: any[] = [];
  if (Array.isArray(raw)) items = raw;
  else if (typeof raw === 'string') items = raw.split(/[,;|/]+/);
  return items
    .map((m) => String(m || '').trim())
    .filter((m) => m.length > 0);
}

function obtenerIniciales(nombre: string, apellidos: string): string {
  const n = (nombre || '').trim().charAt(0).toUpperCase();
  const a = (apellidos || '').trim().charAt(0).toUpperCase();
  return (n + a) || '--';
}

/**
 * Obtiene la lista de maestros que dan clase al grupo `${grado}${grupo}`.
 *
 * Filtra en cliente porque `profesor.grupos` puede ser array (formato
 * v3.20.0+) o string CSV legacy ("2A, 4B"). `where(..., 'array-contains', ...)`
 * no funcionaría con el string legacy.
 *
 * Para escuelas chicas (~50 profesores en CBTis) esto es eficiente: 1 query
 * + filtro en memoria.
 */
export async function obtenerMaestrosDelGrupo(
  grado: string | number,
  grupo: string
): Promise<Maestro[]> {
  const grupoBuscado = normalizarGrupo(`${grado}${grupo}`);
  if (!grupoBuscado) {
    console.warn('[maestros] grupo inválido:', grado, grupo);
    return [];
  }

  try {
    const snap = await getDocs(collection(db, 'profesores'));
    const maestros: Maestro[] = [];

    snap.forEach((docSnap) => {
      const d: any = docSnap.data() || {};

      // Excluir profesores marcados explícitamente como inactivos
      if (d.activo === false) return;

      const gruposSet = parsearGrupos(d.grupos);
      if (!gruposSet.has(grupoBuscado)) return;

      const nombre = d.nombre || '';
      const apellidos = d.apellidos || '';
      maestros.push({
        id: docSnap.id,
        nombre,
        apellidos,
        nombreCompleto: `${nombre} ${apellidos}`.trim() || 'Sin nombre',
        iniciales: obtenerIniciales(nombre, apellidos),
        materias: parsearMaterias(d.materias),
        grupos: [...gruposSet].sort(),
        telefono: d.telefono || null,
        whatsapp: d.whatsapp || d.telefono || null,
        email: d.email || null,
        activo: d.activo !== false,
      });
    });

    // Ordenar alfabéticamente por nombre completo
    maestros.sort((a, b) =>
      a.nombreCompleto.localeCompare(b.nombreCompleto, 'es', { sensitivity: 'base' })
    );

    return maestros;
  } catch (error: any) {
    console.error('[maestros] error obteniendo maestros:', error);
    throw error;
  }
}

/** Limpia un teléfono: solo dígitos. Ej. "492 123 4567" → "4921234567" */
export function telefonoSoloDigitos(tel: string | null | undefined): string {
  if (!tel) return '';
  return String(tel).replace(/\D/g, '');
}

/** Construye URL de WhatsApp con texto opcional. */
export function urlWhatsApp(telefono: string | null | undefined, mensaje?: string): string | null {
  const tel = telefonoSoloDigitos(telefono);
  if (!tel) return null;
  // Si no tiene LADA México, asumimos +52
  const conLada = tel.length === 10 ? `52${tel}` : tel;
  const base = `https://wa.me/${conLada}`;
  if (mensaje) {
    return `${base}?text=${encodeURIComponent(mensaje)}`;
  }
  return base;
}

export default {
  obtenerMaestrosDelGrupo,
  normalizarGrupo,
  telefonoSoloDigitos,
  urlWhatsApp,
};
