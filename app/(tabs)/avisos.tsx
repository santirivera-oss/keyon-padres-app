// ==========================================
// 📢 PANTALLA DE AVISOS ESCOLARES
// ==========================================
// Noticias, eventos y comunicados del plantel
// Compatible con comunicacion-main.js del sistema principal

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useStore } from '../../store/useStore';
import avisosService, { Aviso } from '../../services/avisos';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const { width } = Dimensions.get('window');

// ==========================================
// 🎴 COMPONENTE: TARJETA DE AVISO
// ==========================================

function AvisoCard({ 
  aviso, 
  index, 
  onPress, 
  colors 
}: { 
  aviso: Aviso; 
  index: number; 
  onPress: () => void;
  colors: any;
}) {
  const tipoColor = avisosService.getTipoColor(aviso);
  const tipoIcon = avisosService.getTipoIcon(aviso);
  const tipoLabel = avisosService.getTipoLabel(aviso);

  const formatFecha = (fecha: any) => {
    try {
      if (fecha?.toDate) {
        return format(fecha.toDate(), "d 'de' MMMM", { locale: es });
      }
      if (typeof fecha === 'string') {
        return format(parseISO(fecha), "d 'de' MMMM", { locale: es });
      }
      return 'Sin fecha';
    } catch {
      return 'Sin fecha';
    }
  };

  const getHora = (fecha: any) => {
    try {
      if (fecha?.toDate) {
        return format(fecha.toDate(), "HH:mm", { locale: es });
      }
      return '';
    } catch {
      return '';
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
    >
      <TouchableOpacity
        style={[styles.avisoCard, { backgroundColor: colors.bgCard }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Badge de tipo */}
        <View style={[styles.tipoBadge, { backgroundColor: tipoColor + '20' }]}>
          <Feather name={tipoIcon as any} size={14} color={tipoColor} />
          <Text style={[styles.tipoText, { color: tipoColor }]}>{tipoLabel}</Text>
        </View>

        {/* Título */}
        <Text style={[styles.avisoTitulo, { color: colors.textPrimary }]} numberOfLines={2}>
          {aviso.titulo}
        </Text>

        {/* Preview del mensaje */}
        <Text style={[styles.avisoPreview, { color: colors.textSecondary }]} numberOfLines={2}>
          {aviso.mensaje}
        </Text>

        {/* Footer */}
        <View style={styles.avisoFooter}>
          <Text style={[styles.avisoFecha, { color: colors.textMuted }]}>
            {formatFecha(aviso.fecha)} {getHora(aviso.fecha) && `• ${getHora(aviso.fecha)}`}
          </Text>
          <Text style={[styles.avisoAutor, { color: colors.textMuted }]}>
            {aviso.autorNombre}
          </Text>
        </View>

        {/* Indicador urgente */}
        {aviso.importante && (
          <View style={styles.urgenteIndicator}>
            <View style={[styles.urgenteDot, { backgroundColor: '#ef4444' }]} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ==========================================
// 📄 MODAL DE DETALLE
// ==========================================

function AvisoModal({ 
  aviso, 
  visible, 
  onClose, 
  colors 
}: { 
  aviso: Aviso | null; 
  visible: boolean; 
  onClose: () => void;
  colors: any;
}) {
  if (!aviso) return null;

  const tipoColor = avisosService.getTipoColor(aviso);
  const tipoIcon = avisosService.getTipoIcon(aviso);
  const tipoLabel = avisosService.getTipoLabel(aviso);

  const formatFecha = (fecha: any) => {
    try {
      if (fecha?.toDate) {
        return format(fecha.toDate(), "EEEE d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
      }
      if (typeof fecha === 'string') {
        return format(parseISO(fecha), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
      }
      return 'Sin fecha';
    } catch {
      return 'Sin fecha';
    }
  };

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
            <View style={[styles.tipoBadge, { backgroundColor: tipoColor + '20' }]}>
              <Feather name={tipoIcon as any} size={14} color={tipoColor} />
              <Text style={[styles.tipoText, { color: tipoColor }]}>{tipoLabel}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Título */}
            <Text style={[styles.modalTitulo, { color: colors.textPrimary }]}>
              {aviso.titulo}
            </Text>

            {/* Meta info */}
            <View style={styles.modalMeta}>
              <View style={styles.metaItem}>
                <Feather name="calendar" size={14} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textMuted }]}>
                  {formatFecha(aviso.fecha)}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Feather name="user" size={14} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textMuted }]}>
                  {aviso.autorNombre}
                </Text>
              </View>
            </View>

            {/* Destinatarios */}
            <View style={[styles.destinatariosBox, { backgroundColor: colors.bgSecondary }]}>
              <Feather name="users" size={14} color={colors.primary} />
              <Text style={[styles.destinatariosText, { color: colors.textSecondary }]}>
                Dirigido a: {aviso.destinatarios === 'todos' ? 'Todos' : 
                            aviso.destinatarios === 'alumnos' ? 'Alumnos' : 
                            `Grupo ${aviso.destinatarios}`}
              </Text>
            </View>

            {/* Mensaje completo */}
            <Text style={[styles.modalContenido, { color: colors.textSecondary }]}>
              {aviso.mensaje}
            </Text>
          </ScrollView>

          {/* Botón cerrar */}
          <TouchableOpacity
            style={[styles.modalCloseBtn, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.modalCloseBtnText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ==========================================
// 📱 PANTALLA PRINCIPAL
// ==========================================

export default function AvisosScreen() {
  const { colors } = useTheme();
  const { alumno, alumnoActivo } = useStore();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAviso, setSelectedAviso] = useState<Aviso | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState<string | null>(null);

  const alumnoUsar = alumnoActivo || alumno;

  useEffect(() => {
    cargarAvisos();
  }, [alumnoUsar]);

  const cargarAvisos = async () => {
    setIsLoading(true);
    // Pasar grado del alumno para filtrar avisos específicos
    const grado = alumnoUsar?.grado;
    const data = await avisosService.obtenerAvisos(grado);
    setAvisos(data);
    setIsLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await cargarAvisos();
    setRefreshing(false);
  };

  const handleAvisoPress = (aviso: Aviso) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedAviso(aviso);
    setModalVisible(true);
  };

  // Filtrar por tipo
  const avisosFiltrados = filtroActivo 
    ? avisos.filter(a => {
        if (filtroActivo === 'urgente') return a.importante;
        if (filtroActivo === 'institucional') return a.tipo === 'institucional' && !a.importante;
        if (filtroActivo === 'profesor') return a.tipo === 'profesor';
        return true;
      })
    : avisos;

  const filtros = [
    { id: null, label: 'Todos', icon: 'list' },
    { id: 'urgente', label: 'Urgentes', icon: 'alert-triangle' },
    { id: 'institucional', label: 'Institución', icon: 'home' },
    { id: 'profesor', label: 'Profesores', icon: 'user' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Avisos</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{avisos.length}</Text>
        </View>
      </View>

      {/* Filtros */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtrosContainer}
        contentContainerStyle={styles.filtrosContent}
      >
        {filtros.map((filtro) => (
          <TouchableOpacity
            key={filtro.id || 'all'}
            style={[
              styles.filtroBtn,
              { 
                backgroundColor: filtroActivo === filtro.id 
                  ? colors.primary 
                  : colors.bgSecondary 
              }
            ]}
            onPress={() => setFiltroActivo(filtro.id)}
          >
            <Feather 
              name={filtro.icon as any} 
              size={14} 
              color={filtroActivo === filtro.id ? 'white' : colors.textSecondary} 
            />
            <Text 
              style={[
                styles.filtroBtnText,
                { color: filtroActivo === filtro.id ? 'white' : colors.textSecondary }
              ]}
            >
              {filtro.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista de avisos */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.avisosContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {avisosFiltrados.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="bell-off" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No hay avisos disponibles
            </Text>
          </View>
        ) : (
          avisosFiltrados.map((aviso, index) => (
            <AvisoCard
              key={aviso.id}
              aviso={aviso}
              index={index}
              onPress={() => handleAvisoPress(aviso)}
              colors={colors}
            />
          ))
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal de detalle */}
      <AvisoModal
        aviso={selectedAviso}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        colors={colors}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerBadge: {
    marginLeft: 12,
    backgroundColor: '#06b6d4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  filtrosContainer: {
    maxHeight: 50,
  },
  filtrosContent: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
  },
  filtroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filtroBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  avisosContainer: {
    padding: 20,
    gap: 16,
  },
  avisoCard: {
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  tipoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  tipoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  avisoTitulo: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
  },
  avisoPreview: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  eventoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  eventoText: {
    fontSize: 13,
  },
  avisoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avisoFecha: {
    fontSize: 12,
  },
  avisoAutor: {
    fontSize: 12,
  },
  urgenteIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  urgenteDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
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
    maxHeight: '85%',
    paddingTop: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalTitulo: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    lineHeight: 28,
  },
  modalMeta: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
  },
  modalContenido: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  destinatariosBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  destinatariosText: {
    fontSize: 14,
  },
  eventoBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  eventoBoxTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventoBoxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventoBoxText: {
    fontSize: 14,
  },
  modalCloseBtn: {
    marginHorizontal: 20,
    marginBottom: 30,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
