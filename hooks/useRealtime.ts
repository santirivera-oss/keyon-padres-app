// ==========================================
// 🔄 HOOKS - USE REALTIME
// ==========================================

import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import attendanceService from '../services/attendance';
import notificationsService from '../services/notifications';
import { RegistroAcceso } from '../types';

/**
 * Hook para suscribirse a cambios en tiempo real
 */
export function useRealtime() {
  const { alumno, actualizarRegistrosHoy, estadoActual, config } = useStore();
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastRegistroRef = useRef<string | null>(null);

  useEffect(() => {
    if (!alumno) return;

    const hoy = new Date().toISOString().split('T')[0];

    // Suscribirse a cambios
    unsubscribeRef.current = attendanceService.suscribirseARegistros(
      alumno.id,
      hoy,
      async (registros: RegistroAcceso[]) => {
        actualizarRegistrosHoy(registros);

        // Detectar nuevo registro para notificación
        if (registros.length > 0) {
          const ultimoRegistro = registros[0]; // Más reciente
          
          if (
            config.notificacionesActivas &&
            ultimoRegistro.id !== lastRegistroRef.current
          ) {
            lastRegistroRef.current = ultimoRegistro.id;

            // Enviar notificación local
            if (ultimoRegistro.tipoRegistro === 'Ingreso' && config.notificarIngreso) {
              await notificationsService.notificarIngreso(
                alumno.nombre,
                ultimoRegistro.hora.slice(0, 5)
              );
            } else if (ultimoRegistro.tipoRegistro === 'Salida' && config.notificarSalida) {
              await notificationsService.notificarSalida(
                alumno.nombre,
                ultimoRegistro.hora.slice(0, 5)
              );
            }
          }
        }
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [alumno, config.notificacionesActivas]);

  return { isListening: !!unsubscribeRef.current };
}

/**
 * Hook para polling periódico (fallback)
 */
export function usePolling(intervalMs: number = 30000) {
  const { alumno, actualizarEstado } = useStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!alumno) return;

    // Polling cada N segundos
    intervalRef.current = setInterval(() => {
      actualizarEstado();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [alumno, intervalMs]);
}

export default { useRealtime, usePolling };
