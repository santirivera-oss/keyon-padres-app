// ==========================================
// 🛡️ PANTALLA DE DISCIPLINA / PREFECTURA
// ==========================================
// Vista read-only del historial disciplinario, pases de salida y citatorios.
// Accesible desde un card en Inicio o desde notificaciones push.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../context/ThemeContext';
import prefecturaService, {
  ReporteDoc,
  PaseSalidaDoc,
  CitatorioDoc,
  DisciplinaResumen,
  labelEstadoPase,
  colorEstadoPase,
  paseActivoHoy,
  resumirDisciplina,
  responderCitatorio,
} from '../../services/prefectura';

const AnimatedView = Animated.createAnimatedComponent(View);

type Tab = 'historial' | 'pases' | 'citatorios';

// ==========================================
// Helpers de formato
// ==========================================

function fmtFecha(t: any): string {
  if (!t) return '—';
  let d: Date;
  if (typeof t.toDate === 'function') d = t.toDate();
  else if (t instanceof Date) d = t;
  else d = new Date(t);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtFechaHora(t: any): string {
  if (!t) return '—';
  let d: Date;
  if (typeof t.toDate === 'function') d = t.toDate();
  else if (t instanceof Date) d = t;
  else d = new Date(t);
  if (isNaN(d.getTime())) return '—';
  const fecha = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  const hora = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${fecha} · ${hora}`;
}

function fmtFechaISO(iso: string | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

// ==========================================
// Header con puntos + meritos/demeritos
// ==========================================
function ResumenHeader({
  resumen,
  colors,
}: {
  resumen: DisciplinaResumen;
  colors: any;
}) {
  const estadoColor =
    resumen.estado === 'Crítico' ? colors.danger :
    resumen.estado === 'Alerta' ? colors.warning :
    colors.success;

  return (
    <AnimatedView entering={FadeInDown.duration(350)} style={[styles.resumenCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={styles.resumenPuntos}>
        <Text style={[styles.puntosValor, { color: estadoColor }]}>{resumen.puntos}</Text>
        <Text style={[styles.puntosLabel, { color: colors.textMuted }]}>puntos</Text>
        <View style={[styles.estadoBadge, { backgroundColor: estadoColor + '20', borderColor: estadoColor + '44' }]}>
          <Text style={[styles.estadoText, { color: estadoColor }]}>{resumen.estado}</Text>
        </View>
      </View>
      <View style={[styles.resumenDivider, { backgroundColor: colors.border }]} />
      <View style={styles.resumenStats}>
        <View style={styles.resumenStat}>
          <Feather name="star" size={16} color={colors.success} />
          <Text style={[styles.resumenStatValor, { color: colors.success }]}>+{resumen.meritos}</Text>
          <Text style={[styles.resumenStatLabel, { color: colors.textMuted }]}>Méritos</Text>
        </View>
        <View style={styles.resumenStat}>
          <Feather name="alert-triangle" size={16} color={colors.danger} />
          <Text style={[styles.resumenStatValor, { color: colors.danger }]}>−{resumen.demeritos}</Text>
          <Text style={[styles.resumenStatLabel, { color: colors.textMuted }]}>Deméritos</Text>
        </View>
        <View style={styles.resumenStat}>
          <Feather name="file-text" size={16} color={colors.primary} />
          <Text style={[styles.resumenStatValor, { color: colors.textPrimary }]}>{resumen.totalReportes}</Text>
          <Text style={[styles.resumenStatLabel, { color: colors.textMuted }]}>Reportes</Text>
        </View>
      </View>
    </AnimatedView>
  );
}

// ==========================================
// Tabs switcher
// ==========================================
function Tabs({
  active,
  onChange,
  counts,
  colors,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  counts: { historial: number; pases: number; citatorios: number };
  colors: any;
}) {
  const items: Array<{ key: Tab; label: string; count: number; icon: any }> = [
    { key: 'historial', label: 'Historial', count: counts.historial, icon: 'file-text' },
    { key: 'pases', label: 'Pases', count: counts.pases, icon: 'log-out' },
    { key: 'citatorios', label: 'Citatorios', count: counts.citatorios, icon: 'calendar' },
  ];

  return (
    <View style={[styles.tabs, { borderColor: colors.border }]}>
      {items.map((item) => {
        const isActive = active === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            onPress={() => onChange(item.key)}
            style={[
              styles.tabButton,
              isActive && { backgroundColor: colors.primary + '15', borderColor: colors.primary + '55' },
              !isActive && { borderColor: 'transparent' },
            ]}
            activeOpacity={0.7}
          >
            <Feather name={item.icon} size={14} color={isActive ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabLabel, { color: isActive ? colors.primary : colors.textMuted }]}>
              {item.label}
            </Text>
            {item.count > 0 && (
              <View style={[styles.tabCount, { backgroundColor: isActive ? colors.primary : colors.textMuted }]}>
                <Text style={styles.tabCountText}>{item.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ==========================================
// Card de reporte
// ==========================================
function ReporteCard({ r, colors, index }: { r: ReporteDoc; colors: any; index: number }) {
  const esPositivo = r.tipo === 'positivo';
  const accent = esPositivo ? colors.success : (r.gravedad === 'grave' ? colors.danger : colors.warning);
  const iconName = esPositivo ? 'star' : 'alert-triangle';
  const puntos = r.puntos || 0;

  return (
    <AnimatedView entering={FadeInDown.duration(300).delay(index * 30)}>
      <View style={[styles.itemCard, { backgroundColor: colors.bgCard, borderColor: colors.border, borderLeftColor: accent, borderLeftWidth: 3 }]}>
        <View style={styles.itemCardTop}>
          <View style={[styles.itemIcon, { backgroundColor: accent + '20' }]}>
            <Feather name={iconName} size={16} color={accent} />
          </View>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemTitulo, { color: colors.textPrimary }]} numberOfLines={1}>
              {r.categoria || 'Reporte'}
            </Text>
            <Text style={[styles.itemSubtitulo, { color: colors.textMuted }]} numberOfLines={1}>
              {r.reportadoPor || 'Sistema'} · {fmtFechaHora(r.fecha)}
            </Text>
          </View>
          <Text style={[styles.itemPuntos, { color: accent }]}>
            {puntos > 0 ? `+${puntos}` : puntos}
          </Text>
        </View>
        {r.descripcion ? (
          <Text style={[styles.itemDescripcion, { color: colors.textSecondary, borderTopColor: colors.border }]}>
            {r.descripcion}
          </Text>
        ) : null}
      </View>
    </AnimatedView>
  );
}

// ==========================================
// Card de pase
// ==========================================
function PaseCard({ p, colors, index }: { p: PaseSalidaDoc; colors: any; index: number }) {
  const estadoColorKey = colorEstadoPase(p.estado);
  const accent =
    estadoColorKey === 'success' ? colors.success :
    estadoColorKey === 'warning' ? colors.warning :
    estadoColorKey === 'danger' ? colors.danger :
    colors.textMuted;

  const tiempoFuera = (() => {
    if (p.estado !== 'completado' || !p.horaSalida || !p.horaRegreso) return null;
    const [sh, sm] = p.horaSalida.split(':').map(Number);
    const [rh, rm] = p.horaRegreso.split(':').map(Number);
    const diff = (rh * 60 + rm) - (sh * 60 + sm);
    return diff > 0 ? `${diff} min fuera` : null;
  })();

  return (
    <AnimatedView entering={FadeInDown.duration(300).delay(index * 30)}>
      <View style={[styles.itemCard, { backgroundColor: colors.bgCard, borderColor: colors.border, borderLeftColor: accent, borderLeftWidth: 3 }]}>
        <View style={styles.itemCardTop}>
          <View style={[styles.itemIcon, { backgroundColor: accent + '20' }]}>
            <Feather name="log-out" size={16} color={accent} />
          </View>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemTitulo, { color: colors.textPrimary }]} numberOfLines={1}>
              {p.motivoLabel || p.motivo}
            </Text>
            <Text style={[styles.itemSubtitulo, { color: colors.textMuted }]} numberOfLines={1}>
              {fmtFechaISO(p.fecha)} · {p.codigoPase}
            </Text>
          </View>
          <View style={[styles.paseBadge, { backgroundColor: accent + '15', borderColor: accent + '55' }]}>
            <Text style={[styles.paseBadgeText, { color: accent }]}>{labelEstadoPase(p.estado)}</Text>
          </View>
        </View>

        <View style={[styles.paseDetalles, { borderTopColor: colors.border }]}>
          {p.horaSalida ? (
            <View style={styles.paseDetalle}>
              <Text style={[styles.paseDetalleLabel, { color: colors.textMuted }]}>Salió</Text>
              <Text style={[styles.paseDetalleValor, { color: colors.textPrimary }]}>{p.horaSalida}</Text>
            </View>
          ) : null}
          {p.horaEstimadaRegreso && p.estado !== 'completado' ? (
            <View style={styles.paseDetalle}>
              <Text style={[styles.paseDetalleLabel, { color: colors.textMuted }]}>Regreso est.</Text>
              <Text style={[styles.paseDetalleValor, { color: colors.warning }]}>{p.horaEstimadaRegreso}</Text>
            </View>
          ) : null}
          {p.horaRegreso ? (
            <View style={styles.paseDetalle}>
              <Text style={[styles.paseDetalleLabel, { color: colors.textMuted }]}>Regresó</Text>
              <Text style={[styles.paseDetalleValor, { color: colors.textPrimary }]}>{p.horaRegreso}</Text>
            </View>
          ) : null}
          {tiempoFuera ? (
            <View style={styles.paseDetalle}>
              <Text style={[styles.paseDetalleLabel, { color: colors.textMuted }]}>Duración</Text>
              <Text style={[styles.paseDetalleValor, { color: colors.textPrimary }]}>{tiempoFuera}</Text>
            </View>
          ) : null}
          {p.autorizadoPor ? (
            <View style={styles.paseDetalle}>
              <Text style={[styles.paseDetalleLabel, { color: colors.textMuted }]}>Autoriza</Text>
              <Text style={[styles.paseDetalleValor, { color: colors.textPrimary }]} numberOfLines={1}>{p.autorizadoPor}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </AnimatedView>
  );
}

// ==========================================
// Card de citatorio
// ==========================================
function CitatorioCard({ c, colors, index }: { c: CitatorioDoc; colors: any; index: number }) {
  const [busy, setBusy] = useState(false);
  const [reagendarOpen, setReagendarOpen] = useState(false);
  const [reagendarNota, setReagendarNota] = useState('');

  const accent =
    c.estado === 'pendiente' ? colors.warning :
    c.estado === 'completado' ? colors.success :
    colors.textMuted;

  const estadoLabel =
    c.estado === 'pendiente' ? 'Pendiente' :
    c.estado === 'completado' ? 'Completado' :
    'Cancelado';

  // Color/label de la respuesta del tutor (si existe)
  const respuestaColor =
    c.respuestaTutor === 'confirmado' ? colors.success :
    c.respuestaTutor === 'reagendar' ? colors.warning :
    null;
  const respuestaLabel =
    c.respuestaTutor === 'confirmado' ? 'Confirmaste asistencia' :
    c.respuestaTutor === 'reagendar' ? 'Solicitaste reagendar' :
    null;

  const puedeResponder = c.estado === 'pendiente' && !c.respuestaTutor;

  async function confirmar() {
    try {
      setBusy(true);
      await responderCitatorio(c.id, 'confirmado');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo enviar la confirmación');
    } finally {
      setBusy(false);
    }
  }

  async function enviarReagendar() {
    try {
      setBusy(true);
      await responderCitatorio(c.id, 'reagendar', reagendarNota.trim());
      setReagendarOpen(false);
      setReagendarNota('');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo enviar la solicitud');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatedView entering={FadeInDown.duration(300).delay(index * 30)}>
      <View style={[styles.itemCard, { backgroundColor: colors.bgCard, borderColor: colors.border, borderLeftColor: accent, borderLeftWidth: 3 }]}>
        <View style={styles.itemCardTop}>
          <View style={[styles.itemIcon, { backgroundColor: accent + '20' }]}>
            <Feather name="calendar" size={16} color={accent} />
          </View>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemTitulo, { color: colors.textPrimary }]} numberOfLines={1}>
              Cita con padres
            </Text>
            <Text style={[styles.itemSubtitulo, { color: colors.textMuted }]} numberOfLines={1}>
              {fmtFechaHora(c.fechaCita)}
            </Text>
          </View>
          <View style={[styles.paseBadge, { backgroundColor: accent + '15', borderColor: accent + '55' }]}>
            <Text style={[styles.paseBadgeText, { color: accent }]}>{estadoLabel}</Text>
          </View>
        </View>
        {c.motivo ? (
          <Text style={[styles.itemDescripcion, { color: colors.textSecondary, borderTopColor: colors.border }]}>
            {c.motivo}
          </Text>
        ) : null}
        {c.solicitadoPor ? (
          <Text style={[styles.itemFooter, { color: colors.textMuted }]}>
            Solicita: {c.solicitadoPor}
          </Text>
        ) : null}

        {/* Respuesta ya enviada */}
        {respuestaLabel && respuestaColor ? (
          <View style={[styles.respuestaBox, { backgroundColor: respuestaColor + '12', borderColor: respuestaColor + '40' }]}>
            <Feather
              name={c.respuestaTutor === 'confirmado' ? 'check-circle' : 'clock'}
              size={14}
              color={respuestaColor}
            />
            <Text style={[styles.respuestaText, { color: respuestaColor }]}>{respuestaLabel}</Text>
            {c.notaTutor ? (
              <Text style={[styles.respuestaNota, { color: colors.textMuted }]} numberOfLines={2}>
                "{c.notaTutor}"
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Acciones del tutor (solo si no ha respondido) */}
        {puedeResponder ? (
          <View style={styles.accionesRow}>
            <TouchableOpacity
              disabled={busy}
              onPress={confirmar}
              style={[styles.btnAccion, { backgroundColor: colors.success + '15', borderColor: colors.success + '50' }]}
            >
              <Feather name="check" size={14} color={colors.success} />
              <Text style={[styles.btnAccionText, { color: colors.success }]}>Confirmar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={busy}
              onPress={() => setReagendarOpen(true)}
              style={[styles.btnAccion, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '50' }]}
            >
              <Feather name="clock" size={14} color={colors.warning} />
              <Text style={[styles.btnAccionText, { color: colors.warning }]}>Reagendar</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* Modal de reagendar */}
      <Modal
        visible={reagendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setReagendarOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Solicitar reagendar</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
              Escribe brevemente por qué necesitas otra fecha. Prefectura recibirá tu mensaje.
            </Text>
            <TextInput
              value={reagendarNota}
              onChangeText={setReagendarNota}
              placeholder="Ej. Conflicto de horario laboral..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              style={[styles.modalInput, { backgroundColor: colors.bgSurface || colors.bgCard, color: colors.textPrimary, borderColor: colors.border }]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setReagendarOpen(false)}
                disabled={busy}
                style={[styles.modalBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={enviarReagendar}
                disabled={busy}
                style={[styles.modalBtn, { backgroundColor: colors.warning + '20', borderColor: colors.warning + '50' }]}
              >
                <Text style={{ color: colors.warning, fontSize: 14, fontWeight: '600' }}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AnimatedView>
  );
}

// ==========================================
// Empty state
// ==========================================
function Empty({ icon, titulo, subtitulo, colors }: { icon: any; titulo: string; subtitulo: string; colors: any }) {
  return (
    <AnimatedView entering={FadeIn.duration(350)} style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
        <Feather name={icon} size={36} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{titulo}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>{subtitulo}</Text>
    </AnimatedView>
  );
}

// ==========================================
// Pantalla principal
// ==========================================
export default function DisciplinaScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { alumno } = useStore();

  const [tab, setTab] = useState<Tab>('historial');
  const [reportes, setReportes] = useState<ReporteDoc[]>([]);
  const [pases, setPases] = useState<PaseSalidaDoc[]>([]);
  const [citatorios, setCitatorios] = useState<CitatorioDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!alumno) return;
    const control = alumno.control || alumno.id || '';
    const alumnoId = alumno.id || null;
    if (!control) { setIsLoading(false); return; }

    setIsLoading(true);
    let loaded = { r: false, p: false, c: false };
    const maybeDone = () => {
      if (loaded.r && loaded.p && loaded.c) setIsLoading(false);
    };

    const unsubR = prefecturaService.escucharReportes(control, alumnoId, (data) => {
      setReportes(data);
      loaded.r = true;
      maybeDone();
    });

    const unsubP = prefecturaService.escucharPasesAlumno(control, alumnoId, (data) => {
      setPases(data);
      loaded.p = true;
      maybeDone();
    });

    const unsubC = prefecturaService.escucharCitatorios(control, alumnoId, (data) => {
      setCitatorios(data);
      loaded.c = true;
      maybeDone();
    });

    return () => {
      unsubR();
      unsubP();
      unsubC();
    };
  }, [alumno?.id, alumno?.control]);

  const resumen = useMemo(() => resumirDisciplina(reportes), [reportes]);
  const activo = useMemo(() => paseActivoHoy(pases), [pases]);
  const citatoriosPendientes = useMemo(
    () => citatorios.filter(c => c.estado === 'pendiente').length,
    [citatorios]
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    // Los listeners reflejan cambios en tiempo real; el refresh es visual
    setTimeout(() => setIsRefreshing(false), 400);
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Prefectura</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {alumno?.nombre} · {alumno?.grado}°{alumno?.grupo}
          </Text>
        </View>
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
        {/* Resumen siempre visible */}
        <ResumenHeader resumen={resumen} colors={colors} />

        {/* Alerta de pase activo hoy */}
        {activo ? (
          <AnimatedView entering={FadeInDown.duration(350)} style={[styles.avisoPase, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '44' }]}>
            <Feather name="alert-circle" size={18} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.avisoPaseTitulo, { color: colors.warning }]}>
                {activo.estado === 'en_uso' ? 'Pase en uso hoy' : 'Pase aprobado hoy'}
              </Text>
              <Text style={[styles.avisoPaseSubtitulo, { color: colors.textSecondary }]} numberOfLines={1}>
                {activo.motivoLabel || activo.motivo}
                {activo.horaEstimadaRegreso ? ` · regreso ${activo.horaEstimadaRegreso}` : ''}
              </Text>
            </View>
            <Text style={[styles.avisoCodigo, { color: colors.warning }]}>{activo.codigoPase}</Text>
          </AnimatedView>
        ) : null}

        {/* Tabs */}
        <Tabs
          active={tab}
          onChange={setTab}
          counts={{
            historial: reportes.length,
            pases: pases.length,
            citatorios: citatoriosPendientes,
          }}
          colors={colors}
        />

        {/* Contenido */}
        {tab === 'historial' && (
          reportes.length === 0 ? (
            <Empty icon="file-text" titulo="Sin reportes" subtitulo="No hay reportes disciplinarios registrados." colors={colors} />
          ) : (
            <View style={styles.lista}>
              {reportes.map((r, i) => <ReporteCard key={r.id} r={r} colors={colors} index={i} />)}
            </View>
          )
        )}

        {tab === 'pases' && (
          pases.length === 0 ? (
            <Empty icon="log-out" titulo="Sin pases" subtitulo="No hay pases de salida registrados." colors={colors} />
          ) : (
            <View style={styles.lista}>
              {pases.map((p, i) => <PaseCard key={p.id} p={p} colors={colors} index={i} />)}
            </View>
          )
        )}

        {tab === 'citatorios' && (
          citatorios.length === 0 ? (
            <Empty icon="calendar" titulo="Sin citatorios" subtitulo="No hay citatorios programados." colors={colors} />
          ) : (
            <View style={styles.lista}>
              {citatorios.map((c, i) => <CitatorioCard key={c.id} c={c} colors={colors} index={i} />)}
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12,
  },
  backBtn: { padding: 4 },
  headerText: { flex: 1 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  content: { padding: 16, paddingBottom: 120, gap: 12 },

  // Resumen
  resumenCard: {
    borderWidth: 1, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center',
  },
  resumenPuntos: { alignItems: 'center', minWidth: 90 },
  puntosValor: { fontSize: 34, fontWeight: '800', lineHeight: 38 },
  puntosLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  estadoBadge: {
    marginTop: 6, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1,
  },
  estadoText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  resumenDivider: { width: 1, alignSelf: 'stretch', marginHorizontal: 14 },
  resumenStats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  resumenStat: { alignItems: 'center', gap: 3 },
  resumenStatValor: { fontSize: 18, fontWeight: '700' },
  resumenStatLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 },

  // Aviso pase
  avisoPase: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12,
  },
  avisoPaseTitulo: { fontSize: 13, fontWeight: '700' },
  avisoPaseSubtitulo: { fontSize: 12, marginTop: 1 },
  avisoCodigo: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, fontVariant: ['tabular-nums'] },

  // Tabs
  tabs: {
    flexDirection: 'row', gap: 6,
    paddingVertical: 6,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5,
    paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 10, borderWidth: 1,
  },
  tabLabel: { fontSize: 12, fontWeight: '600' },
  tabCount: {
    minWidth: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  tabCountText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Lista e items
  lista: { gap: 10 },
  itemCard: {
    borderWidth: 1, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 12,
  },
  itemCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  itemInfo: { flex: 1, minWidth: 0 },
  itemTitulo: { fontSize: 14, fontWeight: '600' },
  itemSubtitulo: { fontSize: 11, marginTop: 1 },
  itemPuntos: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  itemDescripcion: {
    marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth,
    fontSize: 12, lineHeight: 17,
  },
  itemFooter: { fontSize: 11, marginTop: 6 },

  // Pase detalles
  paseBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1,
  },
  paseBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  paseDetalles: {
    marginTop: 10, paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  paseDetalle: { minWidth: 80 },
  paseDetalleLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  paseDetalleValor: { fontSize: 12, fontWeight: '600', marginTop: 1 },

  // Empty
  emptyContainer: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24, lineHeight: 18 },

  // Citatorio: respuesta enviada
  respuestaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  respuestaText: { fontSize: 12, fontWeight: '600' },
  respuestaNota: { fontSize: 11, fontStyle: 'italic', flexBasis: '100%', marginTop: 2 },

  // Citatorio: acciones del tutor
  accionesRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btnAccion: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  btnAccionText: { fontSize: 13, fontWeight: '600' },

  // Modal de reagendar
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalSubtitle: { fontSize: 12, lineHeight: 17 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  modalBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
});
