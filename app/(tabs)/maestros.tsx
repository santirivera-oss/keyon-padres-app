// ==========================================
// 👨‍🏫 PANTALLA DE MAESTROS DE TU HIJO
// ==========================================
// Lista los profesores que dan clase al grupo del alumno.
// Cada maestro muestra: avatar, nombre, materias y botones de contacto
// (WhatsApp / Llamar / Email).

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../context/ThemeContext';
import maestrosService, { Maestro, urlWhatsApp } from '../../services/maestros';

const AnimatedView = Animated.createAnimatedComponent(View);

// ==========================================
// 🎨 COLOR POR ÍNDICE DE MAESTRO (avatar)
// ==========================================
const AVATAR_COLORS = [
  '#d97757', // primary
  '#4285f4',
  '#0f9d58',
  '#9c27b0',
  '#f4b400',
  '#00acc1',
  '#ff7043',
  '#5c6bc0',
];

function colorPorIndice(i: number): string {
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}

// ==========================================
// 🧱 CARD DE MAESTRO
// ==========================================
interface MaestroCardProps {
  maestro: Maestro;
  index: number;
  alumnoNombre: string;
  colors: any;
}

function MaestroCard({ maestro, index, alumnoNombre, colors }: MaestroCardProps) {
  const avatarColor = colorPorIndice(index);

  const handleWhatsApp = useCallback(() => {
    const tel = maestro.whatsapp || maestro.telefono;
    const mensaje = `Buenas, soy tutor de ${alumnoNombre}. Quería consultarle algo:`;
    const url = urlWhatsApp(tel, mensaje);
    if (!url) {
      Alert.alert('WhatsApp', 'Este maestro no tiene WhatsApp registrado.');
      return;
    }
    Linking.canOpenURL(url).then((ok) => {
      if (ok) Linking.openURL(url);
      else Alert.alert('WhatsApp', 'No se pudo abrir WhatsApp en este dispositivo.');
    });
  }, [maestro, alumnoNombre]);

  const handleLlamar = useCallback(() => {
    const tel = maestro.telefono || maestro.whatsapp;
    if (!tel) {
      Alert.alert('Llamar', 'Este maestro no tiene teléfono registrado.');
      return;
    }
    const url = `tel:${tel.replace(/\D/g, '')}`;
    Linking.canOpenURL(url).then((ok) => {
      if (ok) Linking.openURL(url);
      else Alert.alert('Llamar', 'No se pudo iniciar la llamada.');
    });
  }, [maestro]);

  const handleEmail = useCallback(() => {
    if (!maestro.email) {
      Alert.alert('Correo', 'Este maestro no tiene correo registrado.');
      return;
    }
    const subject = encodeURIComponent(`Consulta sobre ${alumnoNombre}`);
    const url = `mailto:${maestro.email}?subject=${subject}`;
    Linking.canOpenURL(url).then((ok) => {
      if (ok) Linking.openURL(url);
      else Alert.alert('Correo', 'No se pudo abrir el cliente de correo.');
    });
  }, [maestro, alumnoNombre]);

  const tieneWhatsApp = !!(maestro.whatsapp || maestro.telefono);
  const tieneTel = !!(maestro.telefono || maestro.whatsapp);
  const tieneEmail = !!maestro.email;

  return (
    <AnimatedView
      entering={FadeInDown.delay(index * 60).duration(400)}
      style={[
        styles.card,
        { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle },
      ]}
    >
      {/* Header: avatar + nombre */}
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: avatarColor + '22', borderColor: avatarColor + '55' }]}>
          <Text style={[styles.avatarText, { color: avatarColor }]}>{maestro.iniciales}</Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
            {maestro.nombreCompleto}
          </Text>
          <Text style={[styles.cardRole, { color: colors.textMuted }]}>Profesor</Text>
        </View>
      </View>

      {/* Materias */}
      {maestro.materias.length > 0 && (
        <View style={styles.materiasSection}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Materias</Text>
          <View style={styles.materiasWrap}>
            {maestro.materias.map((m, i) => (
              <View
                key={i}
                style={[
                  styles.materiaChip,
                  { backgroundColor: avatarColor + '15', borderColor: avatarColor + '40' },
                ]}
              >
                <Text style={[styles.materiaChipText, { color: avatarColor }]} numberOfLines={1}>
                  {m}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Acciones */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            {
              backgroundColor: tieneWhatsApp ? '#25D366' + '15' : colors.bgSecondary,
              borderColor: tieneWhatsApp ? '#25D366' + '40' : colors.borderSubtle,
              opacity: tieneWhatsApp ? 1 : 0.5,
            },
          ]}
          onPress={handleWhatsApp}
          disabled={!tieneWhatsApp}
        >
          <Feather name="message-circle" size={16} color={tieneWhatsApp ? '#25D366' : colors.textMuted} />
          <Text style={[styles.actionText, { color: tieneWhatsApp ? '#25D366' : colors.textMuted }]}>
            WhatsApp
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            {
              backgroundColor: tieneTel ? colors.primary + '15' : colors.bgSecondary,
              borderColor: tieneTel ? colors.primary + '40' : colors.borderSubtle,
              opacity: tieneTel ? 1 : 0.5,
            },
          ]}
          onPress={handleLlamar}
          disabled={!tieneTel}
        >
          <Feather name="phone" size={16} color={tieneTel ? colors.primary : colors.textMuted} />
          <Text style={[styles.actionText, { color: tieneTel ? colors.primary : colors.textMuted }]}>
            Llamar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            {
              backgroundColor: tieneEmail ? colors.bgSecondary : colors.bgSecondary,
              borderColor: colors.borderSubtle,
              opacity: tieneEmail ? 1 : 0.5,
            },
          ]}
          onPress={handleEmail}
          disabled={!tieneEmail}
        >
          <Feather name="mail" size={16} color={tieneEmail ? colors.textPrimary : colors.textMuted} />
          <Text style={[styles.actionText, { color: tieneEmail ? colors.textPrimary : colors.textMuted }]}>
            Email
          </Text>
        </TouchableOpacity>
      </View>
    </AnimatedView>
  );
}

// ==========================================
// 📭 EMPTY / ERROR STATES
// ==========================================
function EmptyState({ colors, mensaje, sugerencia }: { colors: any; mensaje: string; sugerencia: string }) {
  return (
    <AnimatedView entering={FadeIn.duration(400)} style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
        <Feather name="users" size={40} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{mensaje}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>{sugerencia}</Text>
    </AnimatedView>
  );
}

// ==========================================
// 📱 PANTALLA PRINCIPAL
// ==========================================
export default function MaestrosScreen() {
  const { colors } = useTheme();
  const { alumno } = useStore();

  const [maestros, setMaestros] = useState<Maestro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!alumno?.grado || !alumno?.grupo) {
      setError('Tu hijo aún no tiene grupo asignado.');
      setIsLoading(false);
      return;
    }
    setError(null);
    try {
      const data = await maestrosService.obtenerMaestrosDelGrupo(alumno.grado, alumno.grupo);
      setMaestros(data);
    } catch (e: any) {
      setError(e?.message || 'No se pudieron cargar los maestros.');
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

  const grupoLabel =
    alumno?.grado && alumno?.grupo ? `${alumno.grado}° ${String(alumno.grupo).toUpperCase()}` : '—';
  const alumnoNombre = alumno
    ? `${(alumno as any).nombre || ''} ${(alumno as any).apellidos || ''}`.trim() || 'tu hijo'
    : 'tu hijo';

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.bgPrimary }]}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando maestros...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header con back button */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}
          >
            <Feather name="arrow-left" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Maestros</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
              {alumnoNombre} · {grupoLabel}
            </Text>
          </View>
        </View>

        {/* Contadores arriba */}
        {!error && maestros.length > 0 && (
          <AnimatedView
            entering={FadeIn.duration(400)}
            style={[styles.summary, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}
          >
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.primary }]}>{maestros.length}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                {maestros.length === 1 ? 'maestro' : 'maestros'}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.borderSubtle }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.primary }]}>
                {[...new Set(maestros.flatMap((m) => m.materias))].length}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>materias</Text>
            </View>
          </AnimatedView>
        )}

        {/* Estado de error o sin datos */}
        {error && (
          <EmptyState
            colors={colors}
            mensaje="No pudimos cargar los maestros"
            sugerencia={error}
          />
        )}

        {!error && maestros.length === 0 && (
          <EmptyState
            colors={colors}
            mensaje="Aún no hay maestros asignados"
            sugerencia="Cuando la dirección configure los grupos, aparecerán aquí."
          />
        )}

        {/* Lista de maestros */}
        {!error &&
          maestros.map((m, i) => (
            <MaestroCard
              key={m.id}
              maestro={m}
              index={i}
              alumnoNombre={alumnoNombre}
              colors={colors}
            />
          ))}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ==========================================
// 🎨 STYLES
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 13 },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },

  // Summary
  summary: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNumber: { fontSize: 22, fontWeight: '700' },
  summaryLabel: { fontSize: 11, marginTop: 2, textTransform: 'lowercase' },
  summaryDivider: { width: 1, marginHorizontal: 8 },

  // Card
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700' },
  cardHeaderText: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600' },
  cardRole: { fontSize: 11, marginTop: 1 },

  // Materias
  materiasSection: { marginBottom: 14 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  materiasWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  materiaChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  materiaChipText: { fontSize: 12, fontWeight: '500' },

  // Acciones
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionText: { fontSize: 12, fontWeight: '600' },

  // Empty
  emptyContainer: {
    paddingTop: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
