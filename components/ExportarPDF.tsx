// ==========================================
// 📄 COMPONENTE EXPORTAR PDF - REFACTORIZADO
// ==========================================
// Card y Modal separados para evitar problemas en Android
// Ubicación: components/ExportarPDF.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { useTheme, Theme } from '../context/ThemeContext';
import Card from './ui/Card';
import pdfService from '../services/pdfExport';
import attendanceService from '../services/attendance';
import { EstadisticasMensuales } from '../types';

// ==========================================
// MODAL DE EXPORTAR PDF (separado)
// ==========================================
interface ExportarPDFModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ExportarPDFModal({ visible, onClose }: ExportarPDFModalProps) {
  const { colors } = useTheme();
  const { alumno, alumnoActivo, estadisticas } = useStore();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isExporting, setIsExporting] = useState(false);

  const alumnoUsar = alumnoActivo || alumno;

  const handleExportar = async () => {
    if (!alumnoUsar) {
      showAlert('Error', 'No hay alumno seleccionado');
      return;
    }

    setIsExporting(true);

    try {
      const controlAlumno = alumnoUsar.control || alumnoUsar.id;
      
      console.log('📄 Exportando PDF para:', alumnoUsar.nombre, controlAlumno);
      
      const registrosData = await attendanceService.obtenerRegistrosMes(
        controlAlumno,
        selectedYear,
        selectedMonth
      );
      
      const registros = Array.isArray(registrosData) ? registrosData : [];

      console.log('📋 Registros obtenidos:', registros.length);

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
      onClose();

      // Pequeño delay para que el modal se cierre
      await new Promise(resolve => setTimeout(resolve, 100));

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

  const getNombreMes = (mes: number): string => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mes - 1] || 'Mes';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
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

          {/* Info del alumno */}
          {alumnoUsar && (
            <View style={[styles.alumnoInfo, { backgroundColor: colors.bgSecondary }]}>
              <Feather name="user" size={16} color={colors.primary} />
              <Text style={[styles.alumnoText, { color: colors.textSecondary }]}>
                {alumnoUsar.nombre} {alumnoUsar.apellidos}
              </Text>
            </View>
          )}

          {/* Botones */}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={isExporting}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalBtn, styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={handleExportar}
              disabled={isExporting || !alumnoUsar}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Feather name="file-text" size={18} color="white" />
                  <Text style={styles.confirmBtnText}>Generar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ==========================================
// CARD DE EXPORTAR PDF
// ==========================================
interface ExportarPDFCardProps {
  onPress: () => void;
}

export function ExportarPDFCard({ onPress }: ExportarPDFCardProps) {
  const { colors } = useTheme();

  return (
    <Card colors={colors}>
      <View style={styles.cardHeader}>
        <Feather name="file-text" size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          Exportar Reporte
        </Text>
      </View>
      
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        Genera un reporte PDF con la asistencia del mes
      </Text>
      
      <TouchableOpacity
        style={[styles.exportBtn, { backgroundColor: colors.primary }]}
        onPress={onPress}
      >
        <Feather name="download" size={18} color="white" />
        <Text style={styles.exportBtnText}>Generar PDF</Text>
      </TouchableOpacity>
    </Card>
  );
}

// ==========================================
// COMPONENTE COMPLETO (para compatibilidad)
// ==========================================
export default function ExportarPDF() {
  const { colors } = useTheme();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <ExportarPDFCard onPress={() => setShowModal(true)} />
      <ExportarPDFModal visible={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exportBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
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
    marginBottom: 16,
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
  alumnoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  alumnoText: {
    fontSize: 14,
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
