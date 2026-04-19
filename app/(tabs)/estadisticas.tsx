// ==========================================
// 📊 PANTALLA DE ESTADÍSTICAS - CORREGIDA
// ==========================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../context/ThemeContext';
import attendanceService from '../../services/attendance';
import pdfService from '../../services/pdfExport';
import { EstadisticasMensuales, RegistroAcceso } from '../../types';

const AnimatedView = Animated.createAnimatedComponent(View);

export default function EstadisticasScreen() {
  const { colors, isDark } = useTheme();
  const { alumno, alumnoActivo, estadisticas, cargarEstadisticas } = useStore();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isExporting, setIsExporting] = useState(false);

  const alumnoUsar = alumnoActivo || alumno;

  useEffect(() => {
    cargarEstadisticas();
  }, [alumnoUsar]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await cargarEstadisticas();
    setIsRefreshing(false);
  }, [cargarEstadisticas]);

  // Manejar exportación
  const handleExportar = async () => {
    if (!alumnoUsar) {
      showAlert('Error', 'No hay alumno seleccionado');
      return;
    }

    setIsExporting(true);

    try {
      const controlAlumno = alumnoUsar.control || alumnoUsar.id;
      
      // Obtener registros del mes seleccionado
      const registrosData = await attendanceService.obtenerRegistrosMes(
        controlAlumno,
        selectedYear,
        selectedMonth
      );
      
      // Asegurar que registros sea un array
      const registros = Array.isArray(registrosData) ? registrosData : [];

      // Calcular estadísticas del mes
      const stats: EstadisticasMensuales = estadisticas || {
        asistencias: registros.filter(r => r.tipoRegistro === 'Ingreso').length,
        faltas: 0,
        retardos: 0,
        diasHabiles: 20,
        porcentaje: 0,
        tendencia: 'regular',
        detalleRetardos: [],
      };

      // Cerrar modal ANTES de exportar
      setShowExportModal(false);

      // Pequeño delay para que el modal se cierre
      await new Promise(resolve => setTimeout(resolve, 100));

      // Exportar PDF
      const result = await pdfService.exportarPDF({
        alumno: alumnoUsar,
        registros,
        estadisticas: stats,
        mes: selectedMonth,
        año: selectedYear,
      });

      if (result.success) {
        showAlert('Éxito', result.message || 'Reporte generado correctamente');
      } else {
        showAlert('Error', result.message || 'No se pudo generar el reporte');
      }

    } catch (error: any) {
      console.error('Error generando PDF:', error);
      showAlert('Error', error.message || 'Error al generar el reporte');
    } finally {
      setIsExporting(false);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // Obtener color según porcentaje
  const getColorPorcentaje = (porcentaje: number) => {
    if (porcentaje >= 90) return colors.success;
    if (porcentaje >= 80) return colors.warning;
    return colors.danger;
  };

  const stats = estadisticas || {
    asistencias: 0,
    faltas: 0,
    retardos: 0,
    diasHabiles: 0,
    porcentaje: 0,
    tendencia: 'regular' as const,
    detalleRetardos: [],
  };

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
        <AnimatedView entering={FadeInDown.duration(500)} style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Estadísticas</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Resumen del mes actual
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowExportModal(true)}
          >
            <Feather name="download" size={18} color="white" />
            <Text style={styles.exportBtnText}>Exportar</Text>
          </TouchableOpacity>
        </AnimatedView>

        {/* Porcentaje Principal */}
        <AnimatedView entering={FadeInDown.duration(500).delay(100)}>
          <View
            style={[
              styles.mainCard,
              { backgroundColor: colors.bgCard, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.mainCardTitle, { color: colors.textSecondary }]}>
              Porcentaje de Asistencia
            </Text>
            <Text style={[styles.porcentajeGrande, { color: getColorPorcentaje(stats.porcentaje) }]}>
              {stats.porcentaje}%
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(stats.porcentaje, 100)}%`,
                    backgroundColor: getColorPorcentaje(stats.porcentaje),
                  },
                ]}
              />
            </View>
            <Text style={[styles.tendenciaText, { color: colors.textMuted }]}>
              Tendencia: {getTendenciaLabel(stats.tendencia)}
            </Text>
          </View>
        </AnimatedView>

        {/* Stats Grid */}
        <AnimatedView entering={FadeInDown.duration(500).delay(200)} style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.success + '20' }]}>
              <Feather name="check-circle" size={24} color={colors.success} />
            </View>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.asistencias}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Asistencias</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.danger + '20' }]}>
              <Feather name="x-circle" size={24} color={colors.danger} />
            </View>
            <Text style={[styles.statValue, { color: colors.danger }]}>{stats.faltas}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Faltas</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.warning + '20' }]}>
              <Feather name="clock" size={24} color={colors.warning} />
            </View>
            <Text style={[styles.statValue, { color: colors.warning }]}>{stats.retardos}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Retardos</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Feather name="calendar" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.diasHabiles}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Días Hábiles</Text>
          </View>
        </AnimatedView>

        {/* Detalle de Retardos */}
        {stats.detalleRetardos && stats.detalleRetardos.length > 0 && (
          <AnimatedView 
            entering={FadeInDown.duration(500).delay(300)}
            style={[styles.retardosCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
          >
            <View style={styles.cardHeader}>
              <Feather name="alert-triangle" size={20} color={colors.warning} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Detalle de Retardos
              </Text>
            </View>
            
            {stats.detalleRetardos.map((retardo, index) => (
              <View 
                key={index} 
                style={[styles.retardoItem, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.retardoFecha, { color: colors.textSecondary }]}>
                  {formatearFechaCorta(retardo.fecha)}
                </Text>
                <Text style={[styles.retardoHora, { color: colors.warning }]}>
                  {retardo.hora?.slice(0, 5) || '--:--'}
                </Text>
              </View>
            ))}
          </AnimatedView>
        )}
      </ScrollView>

      {/* Modal de Exportación */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Exportar Reporte
            </Text>
            
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
              Selecciona el mes a exportar:
            </Text>

            {/* Selector de Mes */}
            <View style={styles.monthSelector}>
              <TouchableOpacity
                style={[styles.monthBtn, { backgroundColor: colors.bgSecondary }]}
                onPress={() => {
                  if (selectedMonth === 1) {
                    setSelectedMonth(12);
                    setSelectedYear(y => y - 1);
                  } else {
                    setSelectedMonth(m => m - 1);
                  }
                }}
              >
                <Feather name="chevron-left" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              
              <View style={styles.monthDisplay}>
                <Text style={[styles.monthText, { color: colors.textPrimary }]}>
                  {getNombreMes(selectedMonth)} {selectedYear}
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.monthBtn, { backgroundColor: colors.bgSecondary }]}
                onPress={() => {
                  if (selectedMonth === 12) {
                    setSelectedMonth(1);
                    setSelectedYear(y => y + 1);
                  } else {
                    setSelectedMonth(m => m + 1);
                  }
                }}
              >
                <Feather name="chevron-right" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Botones */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowExportModal(false)}
                disabled={isExporting}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleExportar}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Feather name="file-text" size={18} color="white" />
                    <Text style={styles.confirmBtnText}>Generar PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Helpers
function getTendenciaLabel(tendencia: string): string {
  const labels: Record<string, string> = {
    excelente: '📈 Excelente',
    buena: '👍 Buena',
    regular: '📊 Regular',
    baja: '📉 Necesita mejorar',
  };
  return labels[tendencia] || tendencia;
}

function getNombreMes(mes: number): string {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return meses[mes - 1] || 'Mes';
}

function formatearFechaCorta(fechaStr: string): string {
  if (!fechaStr) return 'N/A';
  try {
    const [year, month, day] = fechaStr.split('-').map(Number);
    const fecha = new Date(year, month - 1, day);
    return fecha.toLocaleDateString('es-MX', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  } catch {
    return fechaStr;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  exportBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  mainCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
  },
  mainCardTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  porcentajeGrande: {
    fontSize: 64,
    fontWeight: '800',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  tendenciaText: {
    marginTop: 12,
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  retardosCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  retardoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  retardoFecha: {
    fontSize: 14,
  },
  retardoHora: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  monthBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelBtn: {
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmBtn: {},
  confirmBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
