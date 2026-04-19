// ==========================================
// 🏠 PANTALLA DE INICIO - Con tema dinámico
// ==========================================

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useStore } from '../../store/useStore';
import { useTheme, Theme } from '../../context/ThemeContext';
import StatusCard from '../../components/home/StatusCard';
import Card from '../../components/ui/Card';
import NotificationBell from '../../components/NotificationBell';
import attendanceService from '../../services/attendance';

export default function InicioScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { 
    alumno, 
    estadoActual, 
    registrosHoy,
    estadisticas,
    actualizarEstado,
    actualizarRegistrosHoy,
    isRefreshing,
    setRefreshing 
  } = useStore();

  // Cargar datos al montar y suscribirse a tiempo real
  useEffect(() => {
    if (!alumno) return;
    
    const controlAlumno = alumno.control || alumno.id;
    
    // Usar fecha LOCAL
    const fechaObj = new Date();
    const anio = fechaObj.getFullYear();
    const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaObj.getDate()).padStart(2, '0');
    const hoy = `${anio}-${mes}-${dia}`;
    
    console.log('🔴 Suscribiendo a tiempo real para:', controlAlumno, 'fecha:', hoy);
    
    const unsubscribe = attendanceService.suscribirseARegistros(
      controlAlumno,
      hoy,
      (registros) => {
        console.log('📡 Tiempo real - registros recibidos:', registros.length);
        actualizarRegistrosHoy(registros);
        actualizarEstado();
      }
    );
    
    return () => {
      console.log('🔴 Desuscribiendo de tiempo real');
      unsubscribe();
    };
  }, [alumno?.id, alumno?.control]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await actualizarEstado();
    setRefreshing(false);
  }, []);

  if (!alumno) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <Text style={[styles.errorText, { color: colors.danger }]}>No se encontró información del alumno</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: colors.textPrimary }]}>
              {getGreeting()}
            </Text>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {formatDate(new Date())}
            </Text>
          </View>
          <NotificationBell />
        </View>

        {/* Status Card */}
        <StatusCard alumno={alumno} estado={estadoActual} colors={colors} />

        {/* Timeline del día */}
        <Card style={styles.timelineCard} colors={colors}>
          <View style={styles.cardHeader}>
            <Feather name="activity" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Actividad de hoy</Text>
          </View>

          {registrosHoy.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="clock" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Sin registros hoy
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Los movimientos aparecerán aquí en tiempo real
              </Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {[...registrosHoy]
                .sort((a, b) => b.hora.localeCompare(a.hora))
                .map((registro, index) => (
                <View key={registro.id} style={styles.timelineItem}>
                  <View style={[
                    styles.timelineDot,
                    { backgroundColor: registro.tipoRegistro === 'Ingreso' ? colors.success : colors.danger }
                  ]}>
                    <Feather 
                      name={registro.tipoRegistro === 'Ingreso' ? 'log-in' : 'log-out'} 
                      size={14} 
                      color="white" 
                    />
                  </View>
                  
                  {index < registrosHoy.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                  )}
                  
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineTitle, { color: colors.textPrimary }]}>
                      {registro.tipoRegistro}
                    </Text>
                    <Text style={[styles.timelineTime, { color: colors.primary }]}>
                      {registro.hora.slice(0, 5)}
                    </Text>
                    <Text style={[styles.timelineMode, { color: colors.textMuted }]}>
                      vía {getModoLabel(registro.modo)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <Card style={styles.statCard} colors={colors}>
            <Feather name="calendar" size={24} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {estadoActual?.tiempoEnEscuela?.texto || '0h 0m'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Tiempo hoy</Text>
          </Card>

          <Card style={styles.statCard} colors={colors}>
            <Feather name="clock" size={24} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {estadoActual?.horaIngreso?.slice(0, 5) || '--:--'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Hora ingreso</Text>
          </Card>
        </View>

        {/* Estadísticas del mes */}
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => router.push('/estadisticas')}
        >
          <Card style={styles.statsCard} colors={colors}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Feather name="bar-chart-2" size={20} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Estadísticas del Mes</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textMuted} />
            </View>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statItemValue, { color: colors.success }]}>
                  {estadisticas?.asistencias ?? 0}
                </Text>
                <Text style={[styles.statItemLabel, { color: colors.textMuted }]}>Asistencias</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statItemValue, { color: colors.danger }]}>
                  {estadisticas?.faltas ?? 0}
                </Text>
                <Text style={[styles.statItemLabel, { color: colors.textMuted }]}>Faltas</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statItemValue, { color: colors.warning }]}>
                  {estadisticas?.retardos ?? 0}
                </Text>
                <Text style={[styles.statItemLabel, { color: colors.textMuted }]}>Retardos</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statItemValue, { color: colors.primary }]}>
                  {estadisticas?.porcentaje ?? 0}%
                </Text>
                <Text style={[styles.statItemLabel, { color: colors.textMuted }]}>Asistencia</Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>

        {/* Disciplina / Prefectura */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/disciplina')}
        >
          <Card style={styles.statsCard} colors={colors}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Feather name="shield" size={20} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Prefectura</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textMuted} />
            </View>
            <Text style={[styles.date, { color: colors.textMuted, marginTop: 2 }]}>
              Reportes disciplinarios, pases de salida y citatorios
            </Text>
          </Card>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helpers
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '¡Buenos días!';
  if (hour < 18) return '¡Buenas tardes!';
  return '¡Buenas noches!';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function getModoLabel(modo: string): string {
  const modos: Record<string, string> = {
    facial: 'Reconocimiento Facial',
    qr: 'Código QR',
    barcode: 'Código de Barras',
    manual: 'Registro Manual',
  };
  return modos[modo] || modo;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Theme.spacing.md,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: Theme.fontSize.xxl,
    fontWeight: Theme.fontWeight.bold,
  },
  date: {
    fontSize: Theme.fontSize.md,
    textTransform: 'capitalize',
  },
  timelineCard: {
    marginTop: Theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  cardTitle: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.semibold,
  },
  emptyState: {
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  emptyText: {
    fontSize: Theme.fontSize.md,
    marginTop: Theme.spacing.md,
  },
  emptySubtext: {
    fontSize: Theme.fontSize.sm,
    marginTop: Theme.spacing.xs,
  },
  timeline: {
    gap: Theme.spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    position: 'relative',
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: 32,
    bottom: -Theme.spacing.sm,
    width: 2,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Theme.spacing.md,
  },
  timelineTitle: {
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.semibold,
  },
  timelineTime: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
  },
  timelineMode: {
    fontSize: Theme.fontSize.xs,
  },
  quickStats: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Theme.spacing.md,
  },
  statValue: {
    fontSize: Theme.fontSize.xl,
    fontWeight: Theme.fontWeight.bold,
    marginTop: Theme.spacing.sm,
  },
  statLabel: {
    fontSize: Theme.fontSize.xs,
    marginTop: Theme.spacing.xs,
  },
  errorText: {
    textAlign: 'center',
    marginTop: Theme.spacing.xl,
  },
  // Estadísticas card
  statsCard: {
    marginTop: Theme.spacing.lg,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: Theme.spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statItemValue: {
    fontSize: Theme.fontSize.xl,
    fontWeight: Theme.fontWeight.bold,
  },
  statItemLabel: {
    fontSize: Theme.fontSize.xs,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
});
