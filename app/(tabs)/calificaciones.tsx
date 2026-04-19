// ==========================================
// 📊 PANTALLA DE CALIFICACIONES
// ==========================================
// Vista read-only de las notas del hijo por materia y periodo

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../context/ThemeContext';
import calificacionesService, {
  CalificacionDoc,
  MateriaCalificaciones,
  MateriaTareas,
  PERIODOS,
  agruparPorMateria,
  agruparTareasPorMateria,
  resolverInfoTareas,
  esDocTarea,
  calcularPromedioGeneral,
  contarAprobadasReprobadas,
  colorPorCalificacion,
} from '../../services/calificaciones';

const AnimatedView = Animated.createAnimatedComponent(View);

// ==========================================
// 🎨 COLORES POR MATERIA (mismos que tareas)
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
// 🎨 COLOR HEX DE CALIFICACIÓN (coherente con web)
// ==========================================
function hexPorCalificacion(n: number | null | undefined, colors: any): string {
  const bucket = colorPorCalificacion(n);
  switch (bucket) {
    case 'success': return colors.success;
    case 'emerald': return '#10b981';
    case 'primary': return colors.primary;
    case 'danger':  return colors.danger || '#db4437';
    default:        return colors.textMuted;
  }
}

// ==========================================
// 🧱 CARD DE MATERIA
// ==========================================
interface MateriaCardProps {
  data: MateriaCalificaciones;
  colors: any;
  index: number;
  onPress: () => void;
}

function MateriaCard({ data, colors, index, onPress }: MateriaCardProps) {
  const materiaColor = getMateriaColor(data.materia);
  const materiaIcon = getMateriaIcon(data.materia);
  const promColor = hexPorCalificacion(data.promedio, colors);

  return (
    <AnimatedView entering={FadeInDown.duration(350).delay(index * 50)}>
      <TouchableOpacity
        style={[styles.materiaCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
        activeOpacity={0.7}
        onPress={onPress}
      >
        <View style={styles.materiaCardTop}>
          <View style={[styles.materiaIcon, { backgroundColor: materiaColor }]}>
            <Feather name={materiaIcon as any} size={18} color="white" />
          </View>

          <View style={styles.materiaInfo}>
            <Text style={[styles.materiaNombre, { color: colors.textPrimary }]} numberOfLines={1}>
              {data.materia}
            </Text>
            {!!data.profesorNombre && (
              <Text style={[styles.profesorNombre, { color: colors.textMuted }]} numberOfLines={1}>
                {data.profesorNombre}
              </Text>
            )}
          </View>

          <View style={[styles.promedioChip, { borderColor: promColor + '55', backgroundColor: promColor + '15' }]}>
            <Text style={[styles.promedioLabel, { color: colors.textMuted }]}>Prom</Text>
            <Text style={[styles.promedioValue, { color: promColor }]}>
              {data.promedio != null ? data.promedio.toFixed(1) : '—'}
            </Text>
          </View>
        </View>

        <View style={[styles.periodosRow, { borderTopColor: colors.border }]}>
          {PERIODOS.map((p) => {
            const celda = data.periodos[p.id];
            const val = celda?.calificacion;
            const color = val != null ? hexPorCalificacion(val, colors) : colors.textMuted;
            return (
              <View key={p.id} style={styles.periodoCell}>
                <Text style={[styles.periodoLabel, { color: colors.textMuted }]}>{p.label}</Text>
                <Text style={[styles.periodoValue, { color }]}>
                  {val != null ? val.toFixed(1) : '—'}
                </Text>
              </View>
            );
          })}
        </View>
      </TouchableOpacity>
    </AnimatedView>
  );
}

// ==========================================
// 🪟 MODAL DETALLE
// ==========================================
interface DetalleModalProps {
  materia: MateriaCalificaciones | null;
  visible: boolean;
  onClose: () => void;
  colors: any;
}

function DetalleModal({ materia, visible, onClose, colors }: DetalleModalProps) {
  if (!materia) return null;
  const materiaColor = getMateriaColor(materia.materia);
  const materiaIcon = getMateriaIcon(materia.materia);
  const promColor = hexPorCalificacion(materia.promedio, colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.bgPrimary }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.materiaIconLarge, { backgroundColor: materiaColor }]}>
                <Feather name={materiaIcon as any} size={22} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalMateria, { color: colors.textPrimary }]} numberOfLines={1}>
                  {materia.materia}
                </Text>
                {!!materia.profesorNombre && (
                  <Text style={[styles.modalProfesor, { color: colors.textMuted }]} numberOfLines={1}>
                    {materia.profesorNombre}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={[styles.promedioBox, { backgroundColor: promColor + '15', borderColor: promColor + '55' }]}>
              <Text style={[styles.promedioBoxLabel, { color: colors.textMuted }]}>Promedio</Text>
              <Text style={[styles.promedioBoxValue, { color: promColor }]}>
                {materia.promedio != null ? materia.promedio.toFixed(1) : '—'}
              </Text>
              <Text style={[styles.promedioBoxEstado, { color: promColor }]}>
                {materia.promedio == null
                  ? 'Sin calificaciones aún'
                  : materia.promedio >= 6 ? 'Aprobado' : 'Reprobado'}
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Desglose por periodo</Text>

            {PERIODOS.map((p) => {
              const celda = materia.periodos[p.id];
              const val = celda?.calificacion;
              const color = val != null ? hexPorCalificacion(val, colors) : colors.textMuted;
              return (
                <View
                  key={p.id}
                  style={[styles.detallePeriodoRow, { borderBottomColor: colors.border }]}
                >
                  <Text style={[styles.detallePeriodoLabel, { color: colors.textPrimary }]}>{p.largo}</Text>
                  <Text style={[styles.detallePeriodoValor, { color }]}>
                    {val != null ? val.toFixed(1) : '—'}
                  </Text>
                </View>
              );
            })}

            {Object.entries(materia.periodos).some(([, v]) => v && v.comentario) && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 24 }]}>Comentarios del profesor</Text>
                {PERIODOS.map((p) => {
                  const celda = materia.periodos[p.id];
                  if (!celda || !celda.comentario) return null;
                  return (
                    <View key={p.id} style={[styles.comentarioBox, { backgroundColor: colors.bgSecondary }]}>
                      <Text style={[styles.comentarioPeriodo, { color: colors.primary }]}>{p.largo}</Text>
                      <Text style={[styles.comentarioText, { color: colors.textSecondary }]}>
                        {celda.comentario}
                      </Text>
                    </View>
                  );
                })}
              </>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ==========================================
// 📚 CARD DE TAREAS (referencia)
// ==========================================
interface TareasCardProps {
  data: MateriaTareas;
  colors: any;
  index: number;
}

function TareasCard({ data, colors, index }: TareasCardProps) {
  const materiaColor = getMateriaColor(data.materia);
  const materiaIcon = getMateriaIcon(data.materia);
  const promColor = hexPorCalificacion(data.promedio, colors);

  return (
    <AnimatedView entering={FadeInDown.duration(350).delay(index * 50)}>
      <View style={[styles.materiaCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={styles.materiaCardTop}>
          <View style={[styles.materiaIcon, { backgroundColor: materiaColor }]}>
            <Feather name={materiaIcon as any} size={18} color="white" />
          </View>
          <View style={styles.materiaInfo}>
            <Text style={[styles.materiaNombre, { color: colors.textPrimary }]} numberOfLines={1}>
              {data.materia}
            </Text>
            <Text style={[styles.profesorNombre, { color: colors.textMuted }]} numberOfLines={1}>
              {data.tareas.length} tarea{data.tareas.length !== 1 ? 's' : ''} calificada{data.tareas.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={[styles.promedioChip, { borderColor: promColor + '55', backgroundColor: promColor + '15' }]}>
            <Text style={[styles.promedioLabel, { color: colors.textMuted }]}>Prom</Text>
            <Text style={[styles.promedioValue, { color: promColor }]}>
              {data.promedio != null ? data.promedio.toFixed(1) : '—'}
            </Text>
          </View>
        </View>

        <View style={[styles.tareasList, { borderTopColor: colors.border }]}>
          {data.tareas.map((t, i) => {
            const color = hexPorCalificacion(t.en10, colors);
            return (
              <View
                key={t.tareaId + '_' + i}
                style={[styles.tareaRow, i < data.tareas.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.tareaTitulo, { color: colors.textPrimary }]} numberOfLines={1}>
                    {t.titulo}
                  </Text>
                  <Text style={[styles.tareaPuntos, { color: colors.textMuted }]}>
                    {t.calificacion} / {t.puntosMaximos} pts
                  </Text>
                </View>
                <Text style={[styles.tareaValor, { color }]}>{t.en10.toFixed(1)}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </AnimatedView>
  );
}

// ==========================================
// 📭 EMPTY STATE
// ==========================================
function EmptyState({ colors }: { colors: any }) {
  return (
    <AnimatedView entering={FadeIn.duration(400)} style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
        <Feather name="award" size={40} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        Aún no hay calificaciones
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
        Los profesores publicarán las notas al cierre de cada periodo.
      </Text>
    </AnimatedView>
  );
}

// ==========================================
// 📱 PANTALLA PRINCIPAL
// ==========================================
export default function CalificacionesScreen() {
  const { colors } = useTheme();
  const { alumno } = useStore();

  const [docs, setDocs] = useState<CalificacionDoc[]>([]);
  const [tareasInfo, setTareasInfo] = useState<Record<string, { titulo: string; materia: string; puntosMaximos: number; profesorNombre: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [materiaSel, setMateriaSel] = useState<MateriaCalificaciones | null>(null);
  const [showDetalle, setShowDetalle] = useState(false);

  const cargar = useCallback(async () => {
    if (!alumno?.id) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await calificacionesService.obtenerCalificaciones(alumno.id);
      setDocs(data);
    } catch (error) {
      console.error('Error cargando calificaciones:', error);
    } finally {
      setIsLoading(false);
    }
  }, [alumno]);

  useEffect(() => {
    if (!alumno?.id) return;
    setIsLoading(true);
    const unsub = calificacionesService.escucharCalificaciones(
      alumno.id,
      async (data) => {
        setDocs(data);
        // Resolver info de las tareas que aparecen en docs tipo 'tarea'
        const tareaIdsNuevos = data
          .filter((d) => esDocTarea(d) && d.tareaId && !tareasInfo[d.tareaId])
          .map((d) => d.tareaId as string);
        if (tareaIdsNuevos.length) {
          try {
            const info = await resolverInfoTareas(tareaIdsNuevos);
            setTareasInfo((prev) => ({ ...prev, ...info }));
          } catch (e) {
            console.warn('resolverInfoTareas:', e);
          }
        }
        setIsLoading(false);
      },
      () => setIsLoading(false)
    );
    return () => unsub();
  }, [alumno]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await cargar();
    setIsRefreshing(false);
  };

  const materias = useMemo(() => agruparPorMateria(docs), [docs]);
  const tareasGrupos = useMemo(() => agruparTareasPorMateria(docs, tareasInfo), [docs, tareasInfo]);
  const promedioGeneral = useMemo(() => calcularPromedioGeneral(materias), [materias]);
  const { aprobadas, reprobadas } = useMemo(() => contarAprobadasReprobadas(materias), [materias]);
  const promGeneralColor = hexPorCalificacion(promedioGeneral, colors);

  const handleOpenMateria = (m: MateriaCalificaciones) => {
    setMateriaSel(m);
    setShowDetalle(true);
  };

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
        <Text style={[styles.title, { color: colors.textPrimary }]}>Calificaciones</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {alumno?.grado}° {alumno?.grupo}
        </Text>
      </View>

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
        {materias.length === 0 && tareasGrupos.length === 0 ? (
          <EmptyState colors={colors} />
        ) : (
          <>
            {/* Stats */}
            <AnimatedView entering={FadeInDown.duration(400)} style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Promedio</Text>
                <Text style={[styles.statValueLarge, { color: promGeneralColor }]}>
                  {promedioGeneral != null ? promedioGeneral.toFixed(1) : '—'}
                </Text>
                <Text style={[styles.statFoot, { color: colors.textMuted }]}>
                  {materias.length} materia{materias.length !== 1 ? 's' : ''}
                </Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Aprobadas</Text>
                <Text style={[styles.statValueLarge, { color: colors.success }]}>{aprobadas}</Text>
                <Text style={[styles.statFoot, { color: colors.textMuted }]}>Prom ≥ 6.0</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Reprobadas</Text>
                <Text style={[styles.statValueLarge, { color: colors.danger || '#db4437' }]}>
                  {reprobadas}
                </Text>
                <Text style={[styles.statFoot, { color: colors.textMuted }]}>Prom &lt; 6.0</Text>
              </View>
            </AnimatedView>

            {/* Lista por periodo */}
            <View style={{ gap: 12, marginTop: 8 }}>
              {materias.map((m, idx) => (
                <MateriaCard
                  key={m.materia}
                  data={m}
                  colors={colors}
                  index={idx}
                  onPress={() => handleOpenMateria(m)}
                />
              ))}
            </View>

            {/* Sección de tareas (referencia) */}
            {tareasGrupos.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
                  Calificaciones de tareas
                </Text>
                <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
                  Referencia complementaria · no afecta el promedio del periodo
                </Text>
                <View style={{ gap: 12 }}>
                  {tareasGrupos.map((g, idx) => (
                    <TareasCard
                      key={'tareas_' + g.materia}
                      data={g}
                      colors={colors}
                      index={idx}
                    />
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <DetalleModal
        materia={materiaSel}
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
  container: { flex: 1 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 4 },

  content: { padding: 20, paddingBottom: 120 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statValueLarge: {
    fontSize: 26,
    fontWeight: '700',
  },
  statFoot: { fontSize: 11, marginTop: 4 },

  // Materia card
  materiaCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  materiaCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  materiaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materiaInfo: { flex: 1 },
  materiaNombre: { fontSize: 15, fontWeight: '600' },
  profesorNombre: { fontSize: 12, marginTop: 2 },
  promedioChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  promedioLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  promedioValue: { fontSize: 18, fontWeight: '700' },

  // Tareas (referencia)
  tareasList: {
    borderTopWidth: 1,
  },
  tareaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  tareaTitulo: { fontSize: 13, fontWeight: '500' },
  tareaPuntos: { fontSize: 11, marginTop: 2 },
  tareaValor: { fontSize: 16, fontWeight: '700', minWidth: 38, textAlign: 'right' },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
  },
  sectionHint: { fontSize: 11, marginBottom: 12 },

  periodosRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  periodoCell: {
    flex: 1,
    alignItems: 'center',
  },
  periodoLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  periodoValue: { fontSize: 14, fontWeight: '700' },

  // Empty
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', paddingHorizontal: 40 },

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
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  materiaIconLarge: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  modalMateria: { fontSize: 17, fontWeight: '700' },
  modalProfesor: { fontSize: 13, marginTop: 2 },
  modalBody: { padding: 20 },

  promedioBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  promedioBoxLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  promedioBoxValue: { fontSize: 52, fontWeight: '700', lineHeight: 56 },
  promedioBoxEstado: { fontSize: 14, fontWeight: '600', marginTop: 6 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  detallePeriodoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  detallePeriodoLabel: { fontSize: 15, fontWeight: '500' },
  detallePeriodoValor: { fontSize: 18, fontWeight: '700' },

  comentarioBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  comentarioPeriodo: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  comentarioText: { fontSize: 14, lineHeight: 20 },
});
