// ==========================================
// 📅 PANTALLA DE HORARIOS
// ==========================================
// Muestra el horario semanal del alumno

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/ui/Card';
import horariosService from '../../services/horarios';
import { HorarioFirebase, ClaseHorario, DiaSemana } from '../../types';

const AnimatedView = Animated.createAnimatedComponent(View);

// Días de la semana
const DIAS: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

// ==========================================
// 🎨 COMPONENTE: CLASE CARD
// ==========================================
interface ClaseCardProps {
  clase: ClaseHorario;
  turno: string;
  colors: any;
  isFirst?: boolean;
}

function ClaseCard({ clase, turno, colors, isFirst }: ClaseCardProps) {
  const { inicio, fin } = horariosService.getHorasModulo(clase.modulo, turno);
  const estado = horariosService.getEstadoClase(clase.modulo, turno);
  
  const getEstadoStyle = () => {
    switch (estado) {
      case 'en_curso':
        return { bg: colors.primary + '20', border: colors.primary, text: colors.primary };
      case 'proxima':
        return { bg: colors.warning + '20', border: colors.warning, text: colors.warning };
      case 'pasada':
        return { bg: colors.bgSecondary, border: colors.border, text: colors.textMuted };
      default:
        return { bg: colors.bgCard, border: colors.border, text: colors.textPrimary };
    }
  };
  
  const estiloEstado = getEstadoStyle();
  
  return (
    <View 
      style={[
        styles.claseCard, 
        { 
          backgroundColor: estiloEstado.bg,
          borderLeftColor: estiloEstado.border,
          borderLeftWidth: 3,
        },
        isFirst && { marginTop: 0 }
      ]}
    >
      <View style={styles.claseHora}>
        <Text style={[styles.claseHoraInicio, { color: estiloEstado.text }]}>
          {inicio}
        </Text>
        <Text style={[styles.claseHoraFin, { color: colors.textMuted }]}>
          {fin}
        </Text>
      </View>
      
      <View style={styles.claseInfo}>
        <Text style={[styles.claseMateria, { color: estiloEstado.text }]} numberOfLines={1}>
          {clase.materia || 'Sin asignar'}
        </Text>
        
        <View style={styles.claseDetalles}>
          {clase.profesor ? (
            <View style={styles.claseDetalle}>
              <Feather name="user" size={12} color={colors.textMuted} />
              <Text style={[styles.claseDetalleText, { color: colors.textMuted }]} numberOfLines={1}>
                {clase.profesor}
              </Text>
            </View>
          ) : null}
          
          {clase.aula ? (
            <View style={styles.claseDetalle}>
              <Feather name="map-pin" size={12} color={colors.textMuted} />
              <Text style={[styles.claseDetalleText, { color: colors.textMuted }]}>
                Aula {clase.aula}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      
      <View style={styles.claseModulo}>
        <Text style={[styles.claseModuloText, { color: colors.textMuted }]}>
          M{clase.modulo}
        </Text>
        {estado === 'en_curso' && (
          <View style={[styles.estadoBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.estadoBadgeText}>EN CURSO</Text>
          </View>
        )}
        {estado === 'proxima' && (
          <View style={[styles.estadoBadge, { backgroundColor: colors.warning }]}>
            <Text style={styles.estadoBadgeText}>PRÓXIMA</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ==========================================
// 🎨 COMPONENTE: DÍA TAB
// ==========================================
interface DiaTabProps {
  dia: DiaSemana;
  isSelected: boolean;
  isHoy: boolean;
  onPress: () => void;
  colors: any;
}

function DiaTab({ dia, isSelected, isHoy, onPress, colors }: DiaTabProps) {
  return (
    <TouchableOpacity
      style={[
        styles.diaTab,
        { backgroundColor: isSelected ? colors.primary : colors.bgSecondary },
        isHoy && !isSelected && { borderColor: colors.primary, borderWidth: 1 }
      ]}
      onPress={onPress}
    >
      <Text 
        style={[
          styles.diaTabText, 
          { color: isSelected ? 'white' : colors.textSecondary },
          isHoy && !isSelected && { color: colors.primary }
        ]}
      >
        {dia.substring(0, 3)}
      </Text>
      {isHoy && (
        <View style={[styles.hoyDot, { backgroundColor: isSelected ? 'white' : colors.primary }]} />
      )}
    </TouchableOpacity>
  );
}

// ==========================================
// 📱 PANTALLA PRINCIPAL
// ==========================================
export default function HorariosScreen() {
  const { colors } = useTheme();
  const { alumno, alumnoActivo } = useStore();
  
  const alumnoMostrar = alumnoActivo || alumno;
  
  const [horario, setHorario] = useState<HorarioFirebase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [diaSeleccionado, setDiaSeleccionado] = useState<DiaSemana>('Lunes');
  const [error, setError] = useState<string | null>(null);
  
  // Cargar horario
  const cargarHorario = useCallback(async () => {
    if (!alumnoMostrar) {
      setError('No hay alumno seleccionado');
      setIsLoading(false);
      return;
    }
    
    try {
      setError(null);
      const data = await horariosService.obtenerHorario(
        alumnoMostrar.grado, 
        alumnoMostrar.grupo
      );
      
      if (data) {
        setHorario(data);
      } else {
        setError('No hay horario disponible para este grupo');
      }
    } catch (err) {
      console.error('Error cargando horario:', err);
      setError('Error al cargar el horario');
    } finally {
      setIsLoading(false);
    }
  }, [alumnoMostrar]);
  
  // Cargar al montar
  useEffect(() => {
    cargarHorario();
  }, [cargarHorario]);
  
  // Establecer día actual al cargar
  useEffect(() => {
    const diaActual = horariosService.getDiaActual();
    if (diaActual) {
      setDiaSeleccionado(diaActual);
    }
  }, []);
  
  // Refresh
  const onRefresh = async () => {
    setIsRefreshing(true);
    await cargarHorario();
    setIsRefreshing(false);
  };
  
  // Obtener clases del día seleccionado
  const clasesDelDia = horario?.clases?.[diaSeleccionado] || [];
  const clasesOrdenadas = [...clasesDelDia].sort((a, b) => a.modulo - b.modulo);
  
  // Info de próxima clase
  const diaActual = horariosService.getDiaActual();
  const esHoy = diaSeleccionado === diaActual;
  const proximaClase = esHoy ? horariosService.getProximaClase(clasesDelDia, alumnoMostrar?.turno || 'Vespertino') : null;
  const claseActual = esHoy ? horariosService.getClaseActual(clasesDelDia, alumnoMostrar?.turno || 'Vespertino') : null;
  
  // Loading
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Cargando horario...
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
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
        {/* Header */}
        <AnimatedView entering={FadeInDown.duration(500)}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Horario</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {alumnoMostrar?.grado}° {alumnoMostrar?.grupo} • {alumnoMostrar?.turno}
            </Text>
          </View>
        </AnimatedView>
        
        {/* Widget clase actual/próxima */}
        {esHoy && (claseActual || proximaClase) && (
          <AnimatedView entering={FadeInDown.duration(500).delay(100)} style={{ marginBottom: 16 }}>
            <Card colors={colors}>
              <View style={styles.widgetHeader}>
                <Feather 
                  name={claseActual ? "play-circle" : "clock"} 
                  size={20} 
                  color={claseActual ? colors.primary : colors.warning} 
                />
                <Text style={[styles.widgetTitle, { color: colors.textPrimary }]}>
                  {claseActual ? 'Clase Actual' : 'Próxima Clase'}
                </Text>
              </View>
              
              <View style={styles.widgetContent}>
                <Text style={[styles.widgetMateria, { color: colors.textPrimary }]}>
                  {(claseActual || proximaClase)?.materia}
                </Text>
                <View style={styles.widgetDetalles}>
                  {(claseActual || proximaClase)?.profesor && (
                    <View style={styles.widgetDetalle}>
                      <Feather name="user" size={14} color={colors.textMuted} />
                      <Text style={[styles.widgetDetalleText, { color: colors.textMuted }]}>
                        {(claseActual || proximaClase)?.profesor}
                      </Text>
                    </View>
                  )}
                  <View style={styles.widgetDetalle}>
                    <Feather name="clock" size={14} color={colors.textMuted} />
                    <Text style={[styles.widgetDetalleText, { color: colors.textMuted }]}>
                      {horariosService.getHorasModulo(
                        (claseActual || proximaClase)?.modulo || 1,
                        alumnoMostrar?.turno || 'Vespertino'
                      ).inicio}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          </AnimatedView>
        )}
        
        {/* Selector de día */}
        <AnimatedView entering={FadeInDown.duration(500).delay(150)}>
          <View style={styles.diasContainer}>
            {DIAS.map((dia) => (
              <DiaTab
                key={dia}
                dia={dia}
                isSelected={diaSeleccionado === dia}
                isHoy={diaActual === dia}
                onPress={() => setDiaSeleccionado(dia)}
                colors={colors}
              />
            ))}
          </View>
        </AnimatedView>
        
        {/* Error */}
        {error && (
          <AnimatedView entering={FadeInDown.duration(500).delay(200)}>
            <Card colors={colors}>
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={48} color={colors.warning} />
                <Text style={[styles.errorText, { color: colors.textPrimary }]}>
                  {error}
                </Text>
                <Text style={[styles.errorSubtext, { color: colors.textMuted }]}>
                  El horario aún no ha sido cargado por la escuela
                </Text>
              </View>
            </Card>
          </AnimatedView>
        )}
        
        {/* Lista de clases */}
        {!error && (
          <AnimatedView entering={FadeInDown.duration(500).delay(200)}>
            <View style={styles.clasesContainer}>
              <Text style={[styles.diaTitle, { color: colors.textPrimary }]}>
                {diaSeleccionado}
                {esHoy && <Text style={{ color: colors.primary }}> (Hoy)</Text>}
              </Text>
              
              {clasesOrdenadas.length === 0 ? (
                <Card colors={colors}>
                  <View style={styles.emptyContainer}>
                    <Feather name="calendar" size={48} color={colors.textMuted} />
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      No hay clases este día
                    </Text>
                  </View>
                </Card>
              ) : (
                <View style={[styles.clasesList, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  {clasesOrdenadas.map((clase, index) => (
                    <ClaseCard 
                      key={`${clase.modulo}-${index}`}
                      clase={clase}
                      turno={alumnoMostrar?.turno || 'Vespertino'}
                      colors={colors}
                      isFirst={index === 0}
                    />
                  ))}
                </View>
              )}
            </View>
          </AnimatedView>
        )}
        
        {/* Info de turno */}
        <AnimatedView entering={FadeInDown.duration(500).delay(300)} style={{ marginTop: 16 }}>
          <View style={[styles.infoTurno, { backgroundColor: colors.bgSecondary }]}>
            <Feather name="info" size={16} color={colors.textMuted} />
            <Text style={[styles.infoTurnoText, { color: colors.textMuted }]}>
              Turno {alumnoMostrar?.turno}: {alumnoMostrar?.turno === 'Matutino' ? '7:00 - 14:00' : '13:10 - 20:10'}
            </Text>
          </View>
        </AnimatedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  
  // Header
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  
  // Widget
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  widgetTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  widgetContent: {},
  widgetMateria: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  widgetDetalles: {
    flexDirection: 'row',
    gap: 16,
  },
  widgetDetalle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  widgetDetalleText: {
    fontSize: 14,
  },
  
  // Días
  diasContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  diaTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  hoyDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  
  // Clases
  clasesContainer: {},
  diaTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  clasesList: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  claseCard: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  claseHora: {
    width: 50,
    alignItems: 'center',
  },
  claseHoraInicio: {
    fontSize: 14,
    fontWeight: '600',
  },
  claseHoraFin: {
    fontSize: 11,
    marginTop: 2,
  },
  claseInfo: {
    flex: 1,
  },
  claseMateria: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  claseDetalles: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  claseDetalle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  claseDetalleText: {
    fontSize: 12,
  },
  claseModulo: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  claseModuloText: {
    fontSize: 12,
    fontWeight: '500',
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  estadoBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '700',
  },
  
  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  
  // Error
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Info turno
  infoTurno: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  infoTurnoText: {
    fontSize: 13,
  },
});
