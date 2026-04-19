// ==========================================
// 📝 PANTALLA DE TAREAS - Estilo Classroom
// ==========================================
// Diseño limpio, profesional y minimalista

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../context/ThemeContext';
import { Tarea } from '../../types';
import tareasService from '../../services/tareas';

const AnimatedView = Animated.createAnimatedComponent(View);
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ==========================================
// 🎨 COLORES POR MATERIA (estilo Classroom)
// ==========================================
const MATERIA_COLORS: Record<string, string> = {
  'Fisica': '#4285f4',
  'Física': '#4285f4',
  'Matematicas': '#0f9d58',
  'Matemáticas': '#0f9d58',
  'Quimica': '#f4b400',
  'Química': '#f4b400',
  'Historia': '#db4437',
  'Ingles': '#9c27b0',
  'Inglés': '#9c27b0',
  'Español': '#00acc1',
  'Biologia': '#4caf50',
  'Biología': '#4caf50',
  'Programacion': '#ff7043',
  'Programación': '#ff7043',
  'Base de Datos': '#5c6bc0',
  'Bases de Datos': '#5c6bc0',
};

const DEFAULT_COLOR = '#607d8b';

function getMateriaColor(materia: string): string {
  return MATERIA_COLORS[materia] || DEFAULT_COLOR;
}

// ==========================================
// 🎨 ICONO DE MATERIA
// ==========================================
function getMateriaIcon(materia: string): string {
  const lower = materia.toLowerCase();
  if (lower.includes('fisica') || lower.includes('física')) return 'zap';
  if (lower.includes('matematica') || lower.includes('matemática')) return 'percent';
  if (lower.includes('quimica') || lower.includes('química')) return 'droplet';
  if (lower.includes('historia')) return 'book-open';
  if (lower.includes('ingles') || lower.includes('inglés')) return 'globe';
  if (lower.includes('español')) return 'edit-2';
  if (lower.includes('biologia') || lower.includes('biología')) return 'heart';
  if (lower.includes('programacion') || lower.includes('programación')) return 'code';
  if (lower.includes('base') && lower.includes('dato')) return 'database';
  return 'book';
}

// ==========================================
// 📅 FORMATO DE FECHA
// ==========================================
function formatearFechaEntrega(fecha: any): string {
  if (!fecha) return 'Sin fecha';
  
  try {
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return date.toLocaleDateString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return 'Sin fecha';
  }
}

function formatearFechaCompleta(fecha: any): string {
  if (!fecha) return 'Sin fecha';
  
  try {
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return 'Sin fecha';
  }
}

function getDiasRestantes(fecha: any): number {
  if (!fecha) return 999;
  
  try {
    const limite = fecha.toDate ? fecha.toDate() : new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    limite.setHours(0, 0, 0, 0);
    
    const diff = limite.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return 999;
  }
}

function getTextoTiempoRestante(dias: number): string {
  if (dias < 0) return `Venció hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`;
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return `En ${dias} días`;
}

// ==========================================
// 🎨 COMPONENTE: TAB
// ==========================================
type TabType = 'pendientes' | 'todas';

interface TabProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  colors: any;
}

function Tab({ label, isActive, onPress, colors }: TabProps) {
  return (
    <TouchableOpacity
      style={styles.tab}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.tabText,
        { color: isActive ? colors.primary : colors.textMuted }
      ]}>
        {label}
      </Text>
      {isActive && (
        <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
  );
}

// ==========================================
// 🎨 COMPONENTE: TAREA CARD
// ==========================================
interface TareaCardProps {
  tarea: Tarea;
  colors: any;
  onPress: () => void;
  index: number;
}

function TareaCard({ tarea, colors, onPress, index }: TareaCardProps) {
  const materiaColor = getMateriaColor(tarea.materia);
  const materiaIcon = getMateriaIcon(tarea.materia);
  const diasRestantes = getDiasRestantes(tarea.fechaLimite);
  
  // Color de la fecha según urgencia
  const getFechaColor = () => {
    if (diasRestantes < 0) return '#db4437';      // Vencida - rojo
    if (diasRestantes === 0) return '#db4437';    // Hoy - rojo
    if (diasRestantes === 1) return '#f4b400';    // Mañana - amarillo
    if (diasRestantes <= 3) return '#f4b400';     // 2-3 días - amarillo
    return colors.textMuted;                       // Más días - gris
  };

  return (
    <AnimatedView entering={FadeInDown.duration(400).delay(index * 60)}>
      <TouchableOpacity
        style={[styles.tareaCard, { backgroundColor: colors.bgCard }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Icono de materia */}
        <View style={[styles.materiaIcon, { backgroundColor: materiaColor }]}>
          <Feather name={materiaIcon as any} size={20} color="white" />
        </View>
        
        {/* Contenido */}
        <View style={styles.tareaContent}>
          {/* Materia y profesor */}
          <View style={styles.tareaHeader}>
            <Text style={[styles.materiaText, { color: materiaColor }]}>
              {tarea.materia}
            </Text>
            <Text style={[styles.profesorText, { color: colors.textMuted }]}>
              {tarea.profesorNombre}
            </Text>
          </View>
          
          {/* Título */}
          <Text style={[styles.tareaTitulo, { color: colors.textPrimary }]} numberOfLines={2}>
            {tarea.titulo}
          </Text>
          
          {/* Descripción */}
          {tarea.descripcion && (
            <Text style={[styles.tareaDescripcion, { color: colors.textSecondary }]} numberOfLines={2}>
              {tarea.descripcion}
            </Text>
          )}
          
          {/* Fecha de entrega */}
          <View style={styles.fechaContainer}>
            <Feather name="calendar" size={14} color={getFechaColor()} />
            <Text style={[styles.fechaText, { color: getFechaColor() }]}>
              Entrega: {formatearFechaEntrega(tarea.fechaLimite)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </AnimatedView>
  );
}

// ==========================================
// 🎨 COMPONENTE: MODAL DETALLE
// ==========================================
interface DetalleModalProps {
  tarea: Tarea | null;
  visible: boolean;
  onClose: () => void;
  colors: any;
}

function DetalleModal({ tarea, visible, onClose, colors }: DetalleModalProps) {
  if (!tarea) return null;
  
  const materiaColor = getMateriaColor(tarea.materia);
  const materiaIcon = getMateriaIcon(tarea.materia);
  const diasRestantes = getDiasRestantes(tarea.fechaLimite);
  
  // Etiqueta de categoría
  const getCategoriaLabel = () => {
    switch (tarea.categoria) {
      case 'proyecto': return 'Proyecto';
      case 'examen': return 'Examen';
      default: return 'Tarea';
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
          {/* Header con materia */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.materiaIconLarge, { backgroundColor: materiaColor }]}>
                <Feather name={materiaIcon as any} size={22} color="white" />
              </View>
              <View>
                <Text style={[styles.modalMateria, { color: materiaColor }]}>
                  {tarea.materia}
                </Text>
                <Text style={[styles.modalProfesor, { color: colors.textMuted }]}>
                  {tarea.profesorNombre}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          
          {/* Contenido */}
          <ScrollView 
            style={styles.modalBody} 
            showsVerticalScrollIndicator={false}
          >
            {/* Título */}
            <Text style={[styles.modalTitulo, { color: colors.textPrimary }]}>
              {tarea.titulo}
            </Text>
            
            {/* Tipo y puntos */}
            <Text style={[styles.modalMeta, { color: colors.textMuted }]}>
              {getCategoriaLabel()} • {tarea.puntosMaximos} punto{tarea.puntosMaximos !== 1 ? 's' : ''}
            </Text>
            
            {/* Descripción */}
            {tarea.descripcion && (
              <View style={[styles.descripcionBox, { backgroundColor: colors.bgSecondary }]}>
                <Text style={[styles.descripcionLabel, { color: colors.textMuted }]}>
                  Descripción
                </Text>
                <Text style={[styles.modalDescripcion, { color: colors.textSecondary }]}>
                  {tarea.descripcion}
                </Text>
              </View>
            )}
            
            {/* Fecha de entrega */}
            <View style={[styles.fechaBox, { backgroundColor: colors.bgSecondary }]}>
              <View style={styles.fechaBoxHeader}>
                <Feather name="calendar" size={18} color={colors.primary} />
                <Text style={[styles.fechaBoxLabel, { color: colors.textMuted }]}>
                  Fecha de entrega
                </Text>
              </View>
              <Text style={[styles.fechaBoxValue, { color: colors.textPrimary }]}>
                {formatearFechaCompleta(tarea.fechaLimite)}
              </Text>
              <Text style={[
                styles.fechaBoxDias, 
                { color: diasRestantes <= 1 ? '#db4437' : diasRestantes <= 3 ? '#f4b400' : colors.success }
              ]}>
                {getTextoTiempoRestante(diasRestantes)}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ==========================================
// 🎨 COMPONENTE: EMPTY STATE
// ==========================================
interface EmptyStateProps {
  colors: any;
  tipo: 'pendientes' | 'todas';
}

function EmptyState({ colors, tipo }: EmptyStateProps) {
  return (
    <AnimatedView entering={FadeIn.duration(400)} style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.success + '15' }]}>
        <Feather name="check-circle" size={40} color={colors.success} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        {tipo === 'pendientes' ? '¡Todo listo!' : 'Sin tareas'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
        {tipo === 'pendientes' 
          ? 'No tienes tareas pendientes'
          : 'No hay tareas asignadas para tu grupo'}
      </Text>
    </AnimatedView>
  );
}

// ==========================================
// 📱 PANTALLA PRINCIPAL
// ==========================================
export default function TareasScreen() {
  const { colors } = useTheme();
  const { alumno } = useStore();
  
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tabActivo, setTabActivo] = useState<TabType>('pendientes');
  const [tareaSeleccionada, setTareaSeleccionada] = useState<Tarea | null>(null);
  const [showDetalle, setShowDetalle] = useState(false);
  
  // Cargar tareas
  const cargarTareas = useCallback(async () => {
    if (!alumno) {
      setIsLoading(false);
      return;
    }
    
    try {
      const data = await tareasService.obtenerTareas(
        alumno.grado,
        alumno.grupo
      );
      setTareas(data);
    } catch (error) {
      console.error('Error cargando tareas:', error);
    } finally {
      setIsLoading(false);
    }
  }, [alumno]);
  
  useEffect(() => {
    cargarTareas();
  }, [cargarTareas]);
  
  const onRefresh = async () => {
    setIsRefreshing(true);
    await cargarTareas();
    setIsRefreshing(false);
  };
  
  // Filtrar tareas según tab
  const tareasFiltradas = tareas.filter(t => {
    if (tabActivo === 'pendientes') {
      const dias = getDiasRestantes(t.fechaLimite);
      return dias >= 0; // Solo las que no han vencido
    }
    return true; // Todas
  });
  
  // Ordenar por fecha (más próximas primero)
  const tareasOrdenadas = [...tareasFiltradas].sort((a, b) => {
    const diasA = getDiasRestantes(a.fechaLimite);
    const diasB = getDiasRestantes(b.fechaLimite);
    return diasA - diasB;
  });
  
  const handleVerDetalle = (tarea: Tarea) => {
    setTareaSeleccionada(tarea);
    setShowDetalle(true);
  };
  
  // Contar pendientes
  const pendientesCount = tareas.filter(t => getDiasRestantes(t.fechaLimite) >= 0).length;
  
  // Loading
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Tareas</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {alumno?.grado}° {alumno?.grupo}
        </Text>
      </View>
      
      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: colors.border }]}>
        <Tab
          label={`Pendientes${pendientesCount > 0 ? ` (${pendientesCount})` : ''}`}
          isActive={tabActivo === 'pendientes'}
          onPress={() => setTabActivo('pendientes')}
          colors={colors}
        />
        <Tab
          label="Todas"
          isActive={tabActivo === 'todas'}
          onPress={() => setTabActivo('todas')}
          colors={colors}
        />
      </View>
      
      {/* Lista de tareas */}
      <ScrollView
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
        {tareasOrdenadas.length === 0 ? (
          <EmptyState colors={colors} tipo={tabActivo} />
        ) : (
          <View style={styles.tareasLista}>
            {tareasOrdenadas.map((tarea, index) => (
              <TareaCard
                key={tarea.id}
                tarea={tarea}
                colors={colors}
                onPress={() => handleVerDetalle(tarea)}
                index={index}
              />
            ))}
          </View>
        )}
      </ScrollView>
      
      {/* Modal detalle */}
      <DetalleModal
        tarea={tareaSeleccionada}
        visible={showDetalle}
        onClose={() => setShowDetalle(false)}
        colors={colors}
      />
    </SafeAreaView>
  );
}

// ==========================================
// 🎨 ESTILOS
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  tab: {
    marginRight: 24,
    paddingVertical: 12,
    position: 'relative',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
  
  // Content
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  
  // Lista de tareas
  tareasLista: {
    gap: 12,
  },
  
  // Tarea Card
  tareaCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    gap: 14,
  },
  materiaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tareaContent: {
    flex: 1,
  },
  tareaHeader: {
    marginBottom: 6,
  },
  materiaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  profesorText: {
    fontSize: 12,
    marginTop: 1,
  },
  tareaTitulo: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 4,
  },
  tareaDescripcion: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  fechaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  fechaText: {
    fontSize: 13,
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
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
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  materiaIconLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMateria: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalProfesor: {
    fontSize: 13,
    marginTop: 2,
  },
  modalBody: {
    padding: 20,
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: 6,
  },
  modalMeta: {
    fontSize: 14,
    marginBottom: 20,
  },
  descripcionBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  descripcionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalDescripcion: {
    fontSize: 15,
    lineHeight: 22,
  },
  fechaBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  fechaBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  fechaBoxLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fechaBoxValue: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  fechaBoxDias: {
    fontSize: 14,
    fontWeight: '600',
  },
});
