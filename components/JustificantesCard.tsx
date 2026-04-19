// ==========================================
// 📋 COMPONENTE DE JUSTIFICANTES - REFACTORIZADO
// ==========================================
// Card y Modales separados para evitar problemas en Android
// Ubicación: components/JustificantesCard.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useStore } from '../store/useStore';
import Card from './ui/Card';
import justificantesService, { 
  MotivoJustificante, 
  Justificante,
  EstadoJustificante 
} from '../services/justificantes';
import { format, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// ==========================================
// HELPERS
// ==========================================
const triggerHaptic = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

// ==========================================
// 📝 MODAL DE FORMULARIO NUEVO JUSTIFICANTE
// ==========================================
interface JustificanteFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function JustificanteFormModal({ visible, onClose, onSuccess }: JustificanteFormModalProps) {
  const { colors } = useTheme();
  const { alumno, alumnoActivo, padre } = useStore();
  
  const alumnoUsar = alumnoActivo || alumno;
  
  const [fecha, setFecha] = useState(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
  const [motivo, setMotivo] = useState<MotivoJustificante | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const motivos = justificantesService.getMotivos();

  const handleSubmit = async () => {
    if (!motivo) {
      showAlert('Error', 'Selecciona un motivo');
      return;
    }
    if (!descripcion.trim()) {
      showAlert('Error', 'Agrega una descripción');
      return;
    }
    if (!alumnoUsar) {
      showAlert('Error', 'No hay alumno seleccionado');
      return;
    }

    setIsSubmitting(true);
    triggerHaptic();

    const result = await justificantesService.enviarJustificante({
      alumnoId: alumnoUsar.control || alumnoUsar.id,
      alumnoNombre: `${alumnoUsar.nombre} ${alumnoUsar.apellidos}`,
      padreId: padre?.id || 'padre_temp',
      padreNombre: padre?.nombre || 'Padre/Tutor',
      fecha,
      motivo,
      descripcion: descripcion.trim(),
    });

    setIsSubmitting(false);

    if (result.success) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showAlert('Éxito', result.message);
      onSuccess();
      resetForm();
      onClose();
    } else {
      showAlert('Error', result.message);
    }
  };

  const resetForm = () => {
    setFecha(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
    setMotivo(null);
    setDescripcion('');
  };

  // Generar últimos 7 días para selección de fecha
  const fechasDisponibles = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i + 1);
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, "EEEE d 'de' MMMM", { locale: es }),
    };
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.bgPrimary }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Nuevo Justificante
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Info del alumno */}
            {alumnoUsar && (
              <View style={[styles.alumnoInfo, { backgroundColor: colors.bgSecondary }]}>
                <Feather name="user" size={16} color={colors.primary} />
                <Text style={[styles.alumnoText, { color: colors.textSecondary }]}>
                  {alumnoUsar.nombre} {alumnoUsar.apellidos}
                </Text>
              </View>
            )}

            {/* Selector de fecha */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Fecha de la falta
            </Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.fechasScroll}
              contentContainerStyle={styles.fechasContainer}
            >
              {fechasDisponibles.map((f) => (
                <TouchableOpacity
                  key={f.value}
                  style={[
                    styles.fechaBtn,
                    { backgroundColor: colors.bgSecondary },
                    fecha === f.value && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    setFecha(f.value);
                  }}
                >
                  <Text 
                    style={[
                      styles.fechaBtnText,
                      { color: colors.textSecondary },
                      fecha === f.value && { color: 'white' }
                    ]}
                    numberOfLines={1}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Selector de motivo */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Motivo
            </Text>
            <View style={styles.motivosGrid}>
              {motivos.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  style={[
                    styles.motivoBtn,
                    { backgroundColor: colors.bgSecondary },
                    motivo === m.value && { 
                      backgroundColor: colors.primary + '20',
                      borderColor: colors.primary,
                      borderWidth: 2,
                    }
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    setMotivo(m.value);
                  }}
                >
                  <Feather 
                    name={m.icon as any} 
                    size={24} 
                    color={motivo === m.value ? colors.primary : colors.textSecondary} 
                  />
                  <Text 
                    style={[
                      styles.motivoBtnText,
                      { color: motivo === m.value ? colors.primary : colors.textSecondary }
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Descripción */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Descripción
            </Text>
            <TextInput
              style={[
                styles.textArea,
                { 
                  backgroundColor: colors.bgSecondary,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                }
              ]}
              placeholder="Describe brevemente el motivo de la falta..."
              placeholderTextColor={colors.textMuted}
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Nota informativa */}
            <View style={[styles.infoBox, { backgroundColor: colors.bgSecondary }]}>
              <Feather name="info" size={16} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textMuted }]}>
                El justificante será revisado por la coordinación escolar. Recibirás una notificación cuando sea procesado.
              </Text>
            </View>
          </ScrollView>

          {/* Botón enviar */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: colors.primary },
                isSubmitting && { opacity: 0.7 }
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Feather name="send" size={18} color="white" />
                  <Text style={styles.submitBtnText}>Enviar</Text>
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
// 📋 ITEM DE JUSTIFICANTE
// ==========================================
function JustificanteItem({ 
  justificante, 
  colors 
}: { 
  justificante: Justificante; 
  colors: any;
}) {
  const estadoColor = justificantesService.getEstadoColor(justificante.estado);
  const estadoLabel = justificantesService.getEstadoLabel(justificante.estado);
  const motivoLabel = justificantesService.getMotivoLabel(justificante.motivo);
  const motivoIcon = justificantesService.getMotivoIcon(justificante.motivo);

  const formatFecha = (fecha: string) => {
    try {
      return format(parseISO(fecha), "d 'de' MMMM", { locale: es });
    } catch {
      return fecha;
    }
  };

  return (
    <View style={[styles.justificanteItem, { backgroundColor: colors.bgCard }]}>
      <View style={styles.justificanteHeader}>
        <View style={[styles.motivoBadge, { backgroundColor: colors.bgSecondary }]}>
          <Feather name={motivoIcon as any} size={14} color={colors.textSecondary} />
          <Text style={[styles.motivoBadgeText, { color: colors.textSecondary }]}>
            {motivoLabel}
          </Text>
        </View>
        <View style={[styles.estadoBadge, { backgroundColor: estadoColor + '20' }]}>
          <View style={[styles.estadoDot, { backgroundColor: estadoColor }]} />
          <Text style={[styles.estadoText, { color: estadoColor }]}>
            {estadoLabel}
          </Text>
        </View>
      </View>
      
      <Text style={[styles.justificanteFecha, { color: colors.textPrimary }]}>
        Falta del {formatFecha(justificante.fecha)}
      </Text>
      
      <Text style={[styles.justificanteDesc, { color: colors.textMuted }]} numberOfLines={2}>
        {justificante.descripcion}
      </Text>

      {justificante.comentarioEscuela && (
        <View style={[styles.comentarioBox, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.comentarioLabel, { color: colors.textMuted }]}>
            Comentario de la escuela:
          </Text>
          <Text style={[styles.comentarioText, { color: colors.textSecondary }]}>
            {justificante.comentarioEscuela}
          </Text>
        </View>
      )}
    </View>
  );
}

// ==========================================
// 📋 MODAL DE HISTORIAL
// ==========================================
interface JustificantesHistorialModalProps {
  visible: boolean;
  onClose: () => void;
  justificantes: Justificante[];
}

export function JustificantesHistorialModal({ visible, onClose, justificantes }: JustificantesHistorialModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.bgPrimary }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Mis Justificantes
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {justificantes.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="inbox" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No hay justificantes
                </Text>
              </View>
            ) : (
              justificantes.map((j) => (
                <JustificanteItem key={j.id} justificante={j} colors={colors} />
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ==========================================
// 📱 CARD DE JUSTIFICANTES (solo el card)
// ==========================================
interface JustificantesCardOnlyProps {
  onNuevo: () => void;
  onHistorial: () => void;
  pendientes: number;
  tieneHistorial: boolean;
}

export function JustificantesCardOnly({ onNuevo, onHistorial, pendientes, tieneHistorial }: JustificantesCardOnlyProps) {
  const { colors } = useTheme();

  return (
    <Card colors={colors}>
      <View style={styles.cardHeader}>
        <Feather name="file-plus" size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          Justificantes
        </Text>
        {pendientes > 0 && (
          <View style={[styles.pendienteBadge, { backgroundColor: '#f59e0b' }]}>
            <Text style={styles.pendienteBadgeText}>{pendientes}</Text>
          </View>
        )}
      </View>
      
      <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
        Envía justificantes de falta directamente a la escuela
      </Text>

      <View style={styles.cardButtons}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            triggerHaptic();
            onNuevo();
          }}
        >
          <Feather name="plus" size={18} color="white" />
          <Text style={styles.primaryBtnText}>Nuevo</Text>
        </TouchableOpacity>

        {tieneHistorial && (
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => {
              triggerHaptic();
              onHistorial();
            }}
          >
            <Feather name="list" size={18} color={colors.textSecondary} />
            <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
              Historial
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}

// ==========================================
// 📱 COMPONENTE COMPLETO (para compatibilidad)
// ==========================================
export default function JustificantesCard() {
  const { colors } = useTheme();
  const { alumno, alumnoActivo } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [justificantes, setJustificantes] = useState<Justificante[]>([]);
  const [showHistorial, setShowHistorial] = useState(false);

  const alumnoUsar = alumnoActivo || alumno;

  useEffect(() => {
    if (alumnoUsar) {
      cargarJustificantes();
    }
  }, [alumnoUsar]);

  const cargarJustificantes = async () => {
    if (!alumnoUsar) return;
    const data = await justificantesService.obtenerJustificantes(
      alumnoUsar.control || alumnoUsar.id
    );
    setJustificantes(data);
  };

  const pendientes = justificantes.filter(j => j.estado === 'pendiente').length;

  return (
    <>
      <JustificantesCardOnly
        onNuevo={() => setShowForm(true)}
        onHistorial={() => setShowHistorial(true)}
        pendientes={pendientes}
        tieneHistorial={justificantes.length > 0}
      />

      {/* Modal de formulario */}
      <JustificanteFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={cargarJustificantes}
      />

      {/* Modal de historial */}
      <JustificantesHistorialModal
        visible={showHistorial}
        onClose={() => setShowHistorial(false)}
        justificantes={justificantes}
      />
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
    flex: 1,
  },
  pendienteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendienteBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cardDesc: {
    fontSize: 14,
    marginBottom: 16,
  },
  cardButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  // Formulario
  alumnoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  alumnoText: {
    fontSize: 14,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  fechasScroll: {
    marginBottom: 20,
  },
  fechasContainer: {
    gap: 8,
  },
  fechaBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 140,
  },
  fechaBtnText: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  motivosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  motivoBtn: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  motivoBtnText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  textArea: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Historial
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  justificanteItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  justificanteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  motivoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  motivoBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  estadoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  justificanteFecha: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  justificanteDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  comentarioBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
  },
  comentarioLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  comentarioText: {
    fontSize: 13,
  },
});
