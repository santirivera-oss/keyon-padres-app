// ==========================================
// 👨‍👩‍👧‍👦 COMPONENTE: SELECTOR DE HIJOS - Corregido
// ==========================================
// Ubicación: components/HijosSelector.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';
import { useTheme, Theme } from '../context/ThemeContext';

const triggerHaptic = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

interface HijosSelectorProps {
  compact?: boolean;
}

export default function HijosSelector({ compact = false }: HijosSelectorProps) {
  const { colors } = useTheme();
  const { hijos, alumnoActivo, alumno, seleccionarHijo, agregarHijo, eliminarHijo } = useStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [agregarModalVisible, setAgregarModalVisible] = useState(false);
  const [nuevoCodigoControl, setNuevoCodigoControl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Usar alumnoActivo o alumno como fallback
  const alumnoMostrar = alumnoActivo || alumno;
  
  // Validar que hijos existe y es un array
  const hijosArray = Array.isArray(hijos) ? hijos : [];

  // Si no hay hijos o solo hay uno en modo compacto, no mostrar
  if (hijosArray.length <= 1 && compact) {
    return null;
  }

  // Si no hay hijos en modo completo, no mostrar
  if (hijosArray.length === 0 && !compact) {
    return null;
  }

  const handleSeleccionarHijo = (alumnoId: string) => {
    triggerHaptic();
    if (seleccionarHijo) {
      seleccionarHijo(alumnoId);
    }
    setModalVisible(false);
  };

  const handleAgregarHijo = async () => {
    if (nuevoCodigoControl.length < 4) {
      Alert.alert('Error', 'El código debe tener al menos 4 dígitos');
      return;
    }

    setIsLoading(true);
    const success = agregarHijo ? await agregarHijo(nuevoCodigoControl) : false;
    setIsLoading(false);

    if (success) {
      Alert.alert('¡Listo!', 'Hijo agregado correctamente');
      setNuevoCodigoControl('');
      setAgregarModalVisible(false);
    } else {
      Alert.alert('Error', 'No se encontró el alumno o ya está agregado');
    }
  };

  const handleEliminarHijo = (alumnoId: string, nombre: string) => {
    Alert.alert(
      'Eliminar hijo',
      `¿Estás seguro de eliminar a ${nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => eliminarHijo && eliminarHijo(alumnoId),
        },
      ]
    );
  };

  // ==========================================
  // 🔘 MODO COMPACTO (para header)
  // ==========================================
  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactButton, { backgroundColor: colors.bgSecondary }]}
        onPress={() => setModalVisible(true)}
      >
        <View style={[styles.avatarSmall, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {alumnoMostrar?.nombre?.charAt(0) || '?'}
          </Text>
        </View>
        <Text style={[styles.compactName, { color: colors.textPrimary }]} numberOfLines={1}>
          {alumnoMostrar?.nombre || 'Sin nombre'}
        </Text>
        <Feather name="chevron-down" size={16} color={colors.textMuted} />

        {/* Modal de selección */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <ModalContent
            hijos={hijosArray}
            alumnoActivo={alumnoMostrar}
            colors={colors}
            onSelect={handleSeleccionarHijo}
            onClose={() => setModalVisible(false)}
            onAgregar={() => {
              setModalVisible(false);
              setAgregarModalVisible(true);
            }}
            onEliminar={handleEliminarHijo}
          />
        </Modal>

        {/* Modal agregar hijo */}
        <AgregarHijoModal
          visible={agregarModalVisible}
          colors={colors}
          codigo={nuevoCodigoControl}
          setCodigo={setNuevoCodigoControl}
          isLoading={isLoading}
          onAgregar={handleAgregarHijo}
          onClose={() => setAgregarModalVisible(false)}
        />
      </TouchableOpacity>
    );
  }

  // ==========================================
  // 📋 MODO COMPLETO (para perfil)
  // ==========================================
  return (
    <View style={[styles.container, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Feather name="users" size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Mis Hijos</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setAgregarModalVisible(true)}
        >
          <Feather name="plus" size={18} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hijosScroll}>
        {hijosArray.map((hijo) => {
          const isActive = hijo?.id === alumnoMostrar?.id;
          
          return (
            <TouchableOpacity
              key={hijo?.id || Math.random()}
              style={[
                styles.hijoCard,
                { backgroundColor: colors.bgSecondary },
                isActive && { borderColor: colors.primary, borderWidth: 2 },
              ]}
              onPress={() => hijo?.id && handleSeleccionarHijo(hijo.id)}
              onLongPress={() => {
                if (hijosArray.length > 1 && hijo?.id) {
                  handleEliminarHijo(hijo.id, hijo.nombre || 'Este hijo');
                }
              }}
            >
              <View style={[styles.avatar, { backgroundColor: isActive ? colors.primary : colors.surface }]}>
                <Text style={[styles.avatarTextLarge, { color: isActive ? 'white' : colors.textMuted }]}>
                  {hijo?.nombre?.charAt(0) || '?'}
                </Text>
              </View>
              <Text style={[styles.hijoNombre, { color: colors.textPrimary }]} numberOfLines={1}>
                {hijo?.nombre || 'Sin nombre'}
              </Text>
              <Text style={[styles.hijoGrado, { color: colors.textMuted }]}>
                {hijo?.grado || '-'}° {hijo?.grupo || '-'}
              </Text>
              {isActive && (
                <View style={[styles.activeBadge, { backgroundColor: colors.success }]}>
                  <Feather name="check" size={10} color="white" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Modal agregar hijo */}
      <AgregarHijoModal
        visible={agregarModalVisible}
        colors={colors}
        codigo={nuevoCodigoControl}
        setCodigo={setNuevoCodigoControl}
        isLoading={isLoading}
        onAgregar={handleAgregarHijo}
        onClose={() => setAgregarModalVisible(false)}
      />
    </View>
  );
}

// ==========================================
// 📱 MODAL DE SELECCIÓN
// ==========================================
function ModalContent({
  hijos,
  alumnoActivo,
  colors,
  onSelect,
  onClose,
  onAgregar,
  onEliminar,
}: any) {
  const hijosArray = Array.isArray(hijos) ? hijos : [];

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Seleccionar Hijo</Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalList}>
          {hijosArray.map((hijo: any) => {
            if (!hijo) return null;
            const isActive = hijo?.id === alumnoActivo?.id;

            return (
              <TouchableOpacity
                key={hijo?.id || Math.random()}
                style={[
                  styles.modalItem,
                  { backgroundColor: colors.bgSecondary },
                  isActive && { borderColor: colors.primary, borderWidth: 2 },
                ]}
                onPress={() => hijo?.id && onSelect(hijo.id)}
              >
                <View style={[styles.modalAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.modalAvatarText}>{hijo?.nombre?.charAt(0) || '?'}</Text>
                </View>
                <View style={styles.modalItemContent}>
                  <Text style={[styles.modalItemName, { color: colors.textPrimary }]}>
                    {hijo?.nombre || 'Sin nombre'} {hijo?.apellidos || ''}
                  </Text>
                  <Text style={[styles.modalItemGrado, { color: colors.textMuted }]}>
                    {hijo?.grado || '-'}° {hijo?.grupo || '-'} • {hijo?.turno || '-'}
                  </Text>
                </View>
                {isActive && <Feather name="check-circle" size={24} color={colors.success} />}
                {!isActive && hijosArray.length > 1 && (
                  <TouchableOpacity
                    onPress={() => onEliminar(hijo?.id, hijo?.nombre || 'Este hijo')}
                    style={styles.deleteButton}
                  >
                    <Feather name="trash-2" size={18} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          style={[styles.agregarButton, { borderColor: colors.primary }]}
          onPress={onAgregar}
        >
          <Feather name="plus" size={20} color={colors.primary} />
          <Text style={[styles.agregarButtonText, { color: colors.primary }]}>
            Agregar otro hijo
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ==========================================
// ➕ MODAL AGREGAR HIJO
// ==========================================
function AgregarHijoModal({
  visible,
  colors,
  codigo,
  setCodigo,
  isLoading,
  onAgregar,
  onClose,
}: any) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.bgPrimary }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Agregar Hijo</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
            Código de control del alumno
          </Text>
          
          <View style={[styles.inputContainer, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <Feather name="hash" size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Ej: 23332050010485"
              placeholderTextColor={colors.textMuted}
              value={codigo}
              onChangeText={(text) => setCodigo(text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={20}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }, isLoading && { opacity: 0.7 }]}
            onPress={onAgregar}
            disabled={isLoading}
          >
            <View style={styles.submitButtonGradient}>
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Buscando...' : 'Agregar hijo'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Compact mode
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  compactName: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 100,
  },

  // Full mode
  container: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hijosScroll: {
    marginHorizontal: -8,
  },
  hijoCard: {
    width: 100,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarTextLarge: {
    fontSize: 18,
    fontWeight: '700',
  },
  hijoNombre: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  hijoGrado: {
    fontSize: 11,
    marginTop: 2,
  },
  activeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalList: {
    maxHeight: 300,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  modalItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  modalItemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalItemGrado: {
    fontSize: 13,
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  agregarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginTop: 12,
    gap: 8,
  },
  agregarButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Agregar modal
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  submitButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
