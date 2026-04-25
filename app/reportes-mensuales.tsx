// ==========================================
// 📄 REPORTES MENSUALES (v1.2)
// ==========================================
// Lista de reportes mensuales del alumno generados automáticamente
// el día 1 de cada mes por la Cloud Function `generarReportesMensuales`
// (SCANER-V3 v3.22.0).
//
// Cada item muestra resumen + botón "Descargar PDF" que abre el share
// nativo (expo-print + expo-sharing).

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useStore } from '../store/useStore';
import { useTheme } from '../context/ThemeContext';
import reportesMensualesService, {
  ReporteMensual,
  generarHTMLReporte,
  nombreMes,
} from '../services/reportesMensuales';

const AnimatedView = Animated.createAnimatedComponent(View);

// ==========================================
// 🧱 CARD DE REPORTE
// ==========================================
interface ReporteCardProps {
  reporte: ReporteMensual;
  index: number;
  colors: any;
  onDescargar: (r: ReporteMensual) => void;
  descargandoId: string | null;
}

function ReporteCard({ reporte, index, colors, onDescargar, descargandoId }: ReporteCardProps) {
  const m = nombreMes(reporte.mes);
  const colorAsist =
    reporte.asistencia.porcentajeAsistencia >= 90 ? colors.success :
    reporte.asistencia.porcentajeAsistencia >= 80 ? '#f59e0b' : colors.danger;
  const colorProm =
    reporte.calificaciones.promedio === null ? colors.textMuted :
    reporte.calificaciones.promedio >= 8 ? colors.success :
    reporte.calificaciones.promedio >= 7 ? '#f59e0b' : colors.danger;

  const isDescargando = descargandoId === reporte.id;

  return (
    <AnimatedView
      entering={FadeInDown.delay(index * 50).duration(400)}
      style={[
        styles.card,
        { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle },
      ]}
    >
      {/* Header del reporte */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconBadge, { backgroundColor: colors.primary + '15' }]}>
          <Feather name="file-text" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            {m} {reporte.año}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
            {reporte.grado}° {reporte.grupo}
          </Text>
        </View>
      </View>

      {/* Stats compactas */}
      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: colorAsist }]}>
            {reporte.asistencia.porcentajeAsistencia}%
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Asistencia</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: colorProm }]}>
            {reporte.calificaciones.promedio !== null
              ? reporte.calificaciones.promedio.toFixed(1)
              : '—'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Promedio</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />
        <View style={styles.statBlock}>
          <Text
            style={[
              styles.statValue,
              { color: reporte.asistencia.retardos >= 3 ? colors.danger : colors.textPrimary },
            ]}
          >
            {reporte.asistencia.retardos}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Retardos</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />
        <View style={styles.statBlock}>
          <Text
            style={[
              styles.statValue,
              { color: reporte.disciplina.negativos > 0 ? colors.danger : colors.textPrimary },
            ]}
          >
            {reporte.disciplina.negativos}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Reportes</Text>
        </View>
      </View>

      {/* Botón descargar */}
      <TouchableOpacity
        style={[
          styles.downloadBtn,
          {
            backgroundColor: colors.primary + '15',
            borderColor: colors.primary + '40',
            opacity: isDescargando ? 0.6 : 1,
          },
        ]}
        onPress={() => onDescargar(reporte)}
        disabled={isDescargando}
      >
        {isDescargando ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Feather name="download" size={16} color={colors.primary} />
        )}
        <Text style={[styles.downloadText, { color: colors.primary }]}>
          {isDescargando ? 'Generando PDF...' : 'Descargar PDF'}
        </Text>
      </TouchableOpacity>
    </AnimatedView>
  );
}

// ==========================================
// 📭 EMPTY STATE
// ==========================================
function EmptyState({ colors, mensaje, sugerencia }: { colors: any; mensaje: string; sugerencia: string }) {
  return (
    <AnimatedView entering={FadeIn.duration(400)} style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
        <Feather name="file-text" size={40} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{mensaje}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>{sugerencia}</Text>
    </AnimatedView>
  );
}

// ==========================================
// 📱 PANTALLA PRINCIPAL
// ==========================================
export default function ReportesMensualesScreen() {
  const { colors } = useTheme();
  const { alumno } = useStore();

  const [reportes, setReportes] = useState<ReporteMensual[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descargandoId, setDescargandoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!alumno?.control && !alumno?.id) {
      setError('No se pudo identificar al alumno.');
      setIsLoading(false);
      return;
    }
    setError(null);
    try {
      const control = (alumno as any).control || alumno.id;
      const data = await reportesMensualesService.obtenerReportesMensualesPorAlumno(control, 12);
      setReportes(data);
    } catch (e: any) {
      setError(e?.message || 'No se pudieron cargar los reportes.');
    } finally {
      setIsLoading(false);
    }
  }, [alumno]);

  useEffect(() => {
    setIsLoading(true);
    cargar();
  }, [cargar]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await cargar();
    setIsRefreshing(false);
  };

  const onDescargar = async (reporte: ReporteMensual) => {
    setDescargandoId(reporte.id);
    try {
      const html = generarHTMLReporte(reporte);
      const tituloArchivo = `Reporte_${reporte.alumnoNombre.replace(/\s+/g, '_')}_${nombreMes(reporte.mes)}_${reporte.año}`;

      if (Platform.OS === 'web') {
        // En web: abrir ventana de impresión
        const ventana = window.open('', '_blank');
        if (!ventana) {
          Alert.alert('Bloqueador', 'Permite ventanas emergentes para descargar el PDF.');
          return;
        }
        ventana.document.write(html);
        ventana.document.close();
        setTimeout(() => {
          try {
            ventana.print();
          } catch (_) {}
        }, 500);
      } else {
        // Import estático arriba del archivo. El dynamic import() falla en
        // Expo SDK 52 con Hermes/Metro: "Requiring unknown module 4203".
        const result = await Print.printToFileAsync({ html, base64: false });
        if (!result?.uri) {
          Alert.alert('PDF', 'No se pudo generar el PDF.');
          return;
        }
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri, {
            mimeType: 'application/pdf',
            dialogTitle: tituloArchivo,
            UTI: 'com.adobe.pdf',
          });
        } else {
          Alert.alert('PDF generado', `Guardado en: ${result.uri}`);
        }
      }
    } catch (e: any) {
      console.error('Error generando PDF:', e);
      Alert.alert('Error', e?.message || 'No se pudo generar el PDF.');
    } finally {
      setDescargandoId(null);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando reportes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const alumnoNombre = alumno
    ? `${(alumno as any).nombre || ''} ${(alumno as any).apellidos || ''}`.trim() || 'tu hijo'
    : 'tu hijo';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.backBtn,
              { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle },
            ]}
          >
            <Feather name="arrow-left" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Reportes Mensuales</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
              Resúmenes de {alumnoNombre}
            </Text>
          </View>
        </View>

        {/* Info banner */}
        <AnimatedView
          entering={FadeIn.duration(400)}
          style={[
            styles.infoBanner,
            { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' },
          ]}
        >
          <Feather name="info" size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textPrimary }]}>
            Generados automáticamente el día 1 de cada mes con datos del mes anterior.
          </Text>
        </AnimatedView>

        {/* Estados */}
        {error && (
          <EmptyState
            colors={colors}
            mensaje="No pudimos cargar los reportes"
            sugerencia={error}
          />
        )}

        {!error && reportes.length === 0 && (
          <EmptyState
            colors={colors}
            mensaje="Aún no hay reportes disponibles"
            sugerencia="Se generan automáticamente cada mes. Vuelve al inicio del próximo mes."
          />
        )}

        {/* Lista */}
        {!error &&
          reportes.map((r, i) => (
            <ReporteCard
              key={r.id}
              reporte={r}
              index={i}
              colors={colors}
              onDescargar={onDescargar}
              descargandoId={descargandoId}
            />
          ))}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17 },

  card: {
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14,
  },
  iconBadge: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSubtitle: { fontSize: 12, marginTop: 1 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, marginBottom: 12,
  },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 10, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  statDivider: { width: 1, height: 30, marginHorizontal: 4 },

  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  downloadText: { fontSize: 13, fontWeight: '600' },

  emptyContainer: { paddingTop: 60, paddingHorizontal: 24, alignItems: 'center' },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
