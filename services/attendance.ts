// ==========================================
// 📊 KEYON PADRES - SERVICIO DE ASISTENCIA
// ==========================================

import { 
  getDb, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  timestampToDate,
  COLLECTIONS 
} from './firebase';
import { 
  RegistroAcceso, 
  EstadoAlumno, 
  EstadisticasMensuales,
  TiempoEscuela 
} from '../types';
import { APP_CONFIG, THRESHOLDS } from '../constants/Config';

// ============ ESTADO ACTUAL ============

/**
 * Obtener estado actual del alumno (dentro/fuera del plantel)
 */
export async function obtenerEstadoActual(alumnoId: string): Promise<EstadoAlumno> {
  try {
    console.log('📊 Obteniendo estado actual para:', alumnoId);
    const hoy = obtenerFechaLocal();
    const registrosHoy = await obtenerRegistrosDia(alumnoId, hoy);
    
    // Determinar si está dentro del plantel
    let dentroDelPlantel = false;
    let ultimoRegistro: RegistroAcceso | null = null;
    let horaIngreso: string | null = null;
    
    if (registrosHoy.length > 0) {
      // Ordenar por hora (más reciente primero)
      const registrosOrdenados = [...registrosHoy].sort((a, b) => 
        b.hora.localeCompare(a.hora)
      );
      
      ultimoRegistro = registrosOrdenados[0];
      dentroDelPlantel = ultimoRegistro.tipoRegistro === 'Ingreso';
      
      // Obtener primer ingreso del día
      const primerIngreso = registrosHoy.find(r => r.tipoRegistro === 'Ingreso');
      if (primerIngreso) {
        horaIngreso = primerIngreso.hora;
      }
    }
    
    // Calcular tiempo en la escuela
    const tiempoEnEscuela = calcularTiempoEnEscuelaDia(registrosHoy);
    
    console.log('✅ Estado actual:', { dentroDelPlantel, horaIngreso, registros: registrosHoy.length });
    
    return {
      dentroDelPlantel,
      ultimoRegistro,
      horaIngreso,
      tiempoEnEscuela,
    };
    
  } catch (error) {
    console.error('Error obteniendo estado actual:', error);
    return {
      dentroDelPlantel: false,
      ultimoRegistro: null,
      horaIngreso: null,
      tiempoEnEscuela: { horas: 0, minutos: 0, texto: '0h 0m' },
    };
  }
}

// ============ REGISTROS ============

/**
 * Obtener registros de un día específico
 */
export async function obtenerRegistrosDia(alumnoId: string, fecha: string): Promise<RegistroAcceso[]> {
  try {
    const db = getDb();
    const ingresosRef = collection(db, COLLECTIONS.ingresos);
    
    console.log('🔍 Buscando registros para:', alumnoId, 'fecha:', fecha);
    
    const q = query(
      ingresosRef,
      where('identificador', '==', alumnoId),
      where('fecha', '==', fecha),
      orderBy('hora', 'asc')
    );
    
    const snapshot = await getDocs(q);
    
    console.log('📋 Registros encontrados:', snapshot.docs.length);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as RegistroAcceso));
    
  } catch (error) {
    console.error('Error obteniendo registros del día:', error);
    return [];
  }
}

/**
 * Obtener historial de registros
 */
export async function obtenerHistorial(
  alumnoId: string, 
  diasAtras: number = 30
): Promise<RegistroAcceso[]> {
  try {
    const db = getDb();
    const fechaInicio = obtenerFechaLocal(-diasAtras);
    const fechaFin = obtenerFechaLocal();
    
    const ingresosRef = collection(db, COLLECTIONS.ingresos);
    
    const q = query(
      ingresosRef,
      where('identificador', '==', alumnoId),
      where('fecha', '>=', fechaInicio),
      where('fecha', '<=', fechaFin),
      orderBy('fecha', 'desc'),
      orderBy('hora', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as RegistroAcceso));
    
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    return [];
  }
}

/**
 * Obtener registros de un mes específico (para historial)
 */
export async function obtenerRegistrosMes(
  alumnoId: string,
  anio: number,
  mes: number
): Promise<RegistroAcceso[]> {
  try {
    const db = getDb();
    
    // Calcular primer y último día del mes
    const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const ultimaFecha = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
    
    console.log(`📅 Buscando registros del mes: ${primerDia} a ${ultimaFecha}`);
    
    const ingresosRef = collection(db, COLLECTIONS.ingresos);
    
    const q = query(
      ingresosRef,
      where('identificador', '==', alumnoId),
      where('fecha', '>=', primerDia),
      where('fecha', '<=', ultimaFecha),
      orderBy('fecha', 'desc'),
      orderBy('hora', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    const registros = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as RegistroAcceso));
    
    console.log(`📋 Registros del mes encontrados: ${registros.length}`);
    
    return registros;
    
  } catch (error) {
    console.error('Error obteniendo registros del mes:', error);
    return [];
  }
}

/**
 * Suscribirse a cambios en tiempo real
 * CORREGIDO: Ignora snapshots vacíos del cache local
 */
export function suscribirseARegistros(
  alumnoId: string,
  fecha: string,
  callback: (registros: RegistroAcceso[]) => void
): () => void {
  console.log('🔴 TIEMPO REAL: Iniciando suscripción');
  console.log('   - Alumno ID (control):', alumnoId);
  console.log('   - Fecha:', fecha);
  console.log('   - Colección:', COLLECTIONS.ingresos);
  
  const db = getDb();
  const ingresosRef = collection(db, COLLECTIONS.ingresos);
  
  const q = query(
    ingresosRef,
    where('identificador', '==', alumnoId),
    where('fecha', '==', fecha),
    orderBy('hora', 'desc')
  );
  
  let primeraLlamada = true;
  let registrosPrevios: RegistroAcceso[] = [];
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const registros = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as RegistroAcceso));
    
    console.log('📡 TIEMPO REAL: Cambio detectado!');
    console.log('   - Registros:', registros.length);
    console.log('   - Desde cache:', snapshot.metadata.fromCache);
    
    // CORREGIDO: Si viene del cache y está vacío, ignorar (esperar datos del servidor)
    // Pero si ya teníamos registros y ahora hay menos, es un cambio real
    if (snapshot.metadata.fromCache && registros.length === 0 && primeraLlamada) {
      console.log('   ⏳ Esperando datos del servidor...');
      return;
    }
    
    primeraLlamada = false;
    registrosPrevios = registros;
    
    if (registros.length > 0) {
      console.log('   - Último:', registros[0].tipoRegistro, registros[0].hora);
    }
    
    callback(registros);
  }, (error) => {
    console.error('❌ Error en suscripción tiempo real:', error);
  });
  
  return unsubscribe;
}

// ============ ESTADÍSTICAS ============

/**
 * Calcular estadísticas mensuales
 * @param alumnoId - ID o número de control del alumno
 * @param turno - 'Matutino' | 'Vespertino' (opcional, default: 'Matutino')
 */
export async function calcularEstadisticasMensuales(
  alumnoId: string,
  turno: string = 'Matutino'
): Promise<EstadisticasMensuales> {
  try {
    const ahora = new Date();
    const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const fechaInicio = formatearFecha(primerDia);
    const fechaFin = obtenerFechaLocal();
    
    console.log('📈 Calculando estadísticas:', fechaInicio, 'a', fechaFin, '| Turno:', turno);
    
    const db = getDb();
    const ingresosRef = collection(db, COLLECTIONS.ingresos);
    
    const q = query(
      ingresosRef,
      where('identificador', '==', alumnoId),
      where('fecha', '>=', fechaInicio),
      where('fecha', '<=', fechaFin)
    );
    
    const snapshot = await getDocs(q);
    
    // Agrupar por día
    const diasConIngreso = new Set<string>();
    const primerosIngresos: Record<string, string> = {};
    const retardos: Array<{ fecha: string; hora: string }> = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      if (data.tipoRegistro === 'Ingreso') {
        diasConIngreso.add(data.fecha);
        
        // Guardar primer ingreso del día
        if (!primerosIngresos[data.fecha] || data.hora < primerosIngresos[data.fecha]) {
          primerosIngresos[data.fecha] = data.hora;
        }
      }
    });
    
    // Detectar retardos (ahora con turno)
    Object.entries(primerosIngresos).forEach(([fecha, hora]) => {
      if (esRetardo(hora, turno)) {
        retardos.push({ fecha, hora });
      }
    });
    
    // Calcular días hábiles del mes
    const diasHabiles = calcularDiasHabiles(primerDia, ahora);
    const asistencias = diasConIngreso.size;
    const faltas = Math.max(0, diasHabiles - asistencias);
    const porcentaje = diasHabiles > 0 
      ? Math.round((asistencias / diasHabiles) * 100) 
      : 100;
    
    // Determinar tendencia
    let tendencia: 'excelente' | 'buena' | 'regular' | 'baja';
    if (porcentaje >= THRESHOLDS.asistenciaExcelente) tendencia = 'excelente';
    else if (porcentaje >= THRESHOLDS.asistenciaBuena) tendencia = 'buena';
    else if (porcentaje >= THRESHOLDS.asistenciaRegular) tendencia = 'regular';
    else tendencia = 'baja';
    
    console.log('✅ Estadísticas:', { asistencias, faltas, retardos: retardos.length, porcentaje, turno });
    
    return {
      asistencias,
      faltas,
      retardos: retardos.length,
      diasHabiles,
      porcentaje,
      tendencia,
      detalleRetardos: retardos,
    };
    
  } catch (error) {
    console.error('Error calculando estadísticas:', error);
    return {
      asistencias: 0,
      faltas: 0,
      retardos: 0,
      diasHabiles: 0,
      porcentaje: 0,
      tendencia: 'baja',
      detalleRetardos: [],
    };
  }
}

/**
 * Calcular tiempo en la escuela (últimos N días)
 */
export async function calcularTiempoEscuela(
  alumnoId: string,
  diasAtras: number = 7
): Promise<TiempoEscuela> {
  try {
    const historial = await obtenerHistorial(alumnoId, diasAtras);
    
    // Agrupar por día
    const porDia: Record<string, RegistroAcceso[]> = {};
    historial.forEach(reg => {
      if (!porDia[reg.fecha]) porDia[reg.fecha] = [];
      porDia[reg.fecha].push(reg);
    });
    
    let tiempoTotalMs = 0;
    let diasContados = 0;
    
    Object.entries(porDia).forEach(([fecha, registros]) => {
      const tiempoDia = calcularTiempoEnEscuelaDia(registros);
      const tiempoMs = (tiempoDia.horas * 60 + tiempoDia.minutos) * 60 * 1000;
      
      if (tiempoMs > 0) {
        tiempoTotalMs += tiempoMs;
        diasContados++;
      }
    });
    
    const promedioMs = diasContados > 0 ? tiempoTotalMs / diasContados : 0;
    
    return {
      total: msToTiempo(tiempoTotalMs),
      promedio: msToTiempo(promedioMs),
      diasContados,
    };
    
  } catch (error) {
    console.error('Error calculando tiempo:', error);
    return {
      total: { horas: 0, minutos: 0, texto: '0h 0m' },
      promedio: { horas: 0, minutos: 0, texto: '0h 0m' },
      diasContados: 0,
    };
  }
}

// ============ HELPERS ============

function calcularTiempoEnEscuelaDia(registros: RegistroAcceso[]): { horas: number; minutos: number; texto: string } {
  let tiempoTotalMs = 0;
  let ultimoIngreso: Date | null = null;
  
  // Ordenar por hora
  const ordenados = [...registros].sort((a, b) => a.hora.localeCompare(b.hora));
  
  ordenados.forEach(reg => {
    if (reg.tipoRegistro === 'Ingreso') {
      ultimoIngreso = new Date(`${reg.fecha}T${reg.hora}`);
    } else if (reg.tipoRegistro === 'Salida' && ultimoIngreso) {
      const salida = new Date(`${reg.fecha}T${reg.hora}`);
      tiempoTotalMs += salida.getTime() - ultimoIngreso.getTime();
      ultimoIngreso = null;
    }
  });
  
  // Si aún está dentro, calcular hasta ahora
  if (ultimoIngreso) {
    tiempoTotalMs += new Date().getTime() - ultimoIngreso.getTime();
  }
  
  return msToTiempo(tiempoTotalMs);
}

function msToTiempo(ms: number): { horas: number; minutos: number; texto: string } {
  const horas = Math.floor(ms / 3600000);
  const minutos = Math.floor((ms % 3600000) / 60000);
  return {
    horas,
    minutos,
    texto: `${horas}h ${minutos}m`,
  };
}

/**
 * Determina si una hora de ingreso es retardo según el turno
 * @param hora - Hora en formato HH:mm:ss o HH:mm
 * @param turno - 'Matutino' | 'Vespertino' (default: 'Matutino')
 */
function esRetardo(hora: string, turno: string = 'Matutino'): boolean {
  const [h, m] = hora.split(':').map(Number);
  
  // Obtener tolerancia según turno
  const turnoKey = turno.toLowerCase().includes('vespertino') ? 'vespertino' : 'matutino';
  const tolerancia = APP_CONFIG.turnos[turnoKey]?.toleranciaRetardo || APP_CONFIG.horaLimiteRetardo;
  
  const [limiteH, limiteM] = tolerancia.split(':').map(Number);
  
  // Es retardo si llegó después de la tolerancia
  return h > limiteH || (h === limiteH && m > limiteM);
}

function calcularDiasHabiles(inicio: Date, fin: Date): number {
  let dias = 0;
  const actual = new Date(inicio);
  
  while (actual <= fin) {
    const diaSemana = actual.getDay();
    if (APP_CONFIG.diasLaborales.includes(diaSemana)) {
      dias++;
    }
    actual.setDate(actual.getDate() + 1);
  }
  
  return dias;
}

function obtenerFechaLocal(diasOffset: number = 0): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + diasOffset);
  return formatearFecha(fecha);
}

function formatearFecha(fecha: Date): string {
  // CORREGIDO: Usar fecha LOCAL, no UTC
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export default {
  obtenerEstadoActual,
  obtenerRegistrosDia,
  obtenerHistorial,
  obtenerRegistrosMes,
  suscribirseARegistros,
  calcularEstadisticasMensuales,
  calcularTiempoEscuela,
};
