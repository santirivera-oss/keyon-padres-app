// ==========================================
// 👤 PANTALLA DE PERFIL - CORREGIDA PARA ANDROID
// ==========================================
// Ubicación: app/(tabs)/perfil.tsx
// FIX: Modales inline (no importados) para que funcionen en Android

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
  Modal,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useStore } from '../../store/useStore';
import { useTheme, Theme, ThemeMode } from '../../context/ThemeContext';
import Card from '../../components/ui/Card';
import HijosSelector from '../../components/HijosSelector';
import biometricService, { BiometricType } from '../../services/biometric';
import { resetTutorial } from '../../components/TutorialOverlay';
import { verificarConsentimiento, revocarConsentimiento } from '../../services/consentimiento';
import pdfService from '../../services/pdfExport';
import attendanceService from '../../services/attendance';
import justificantesService, { Justificante, MotivoJustificante } from '../../services/justificantes';
import { EstadisticasMensuales } from '../../types';
import { format, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const AnimatedView = Animated.createAnimatedComponent(View);

// Helper para haptics seguro
const triggerHaptic = (type: 'impact' | 'selection' = 'impact') => {
  if (Platform.OS !== 'web') {
    if (type === 'selection') {
      Haptics.selectionAsync();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }
};

// Helper para alertas compatible con web
const showAlert = (
  title: string, 
  message: string, 
  buttons?: Array<{ text: string; onPress?: () => void; style?: string }>
) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) {
        const confirmButton = buttons.find(b => b.style === 'destructive' || b.text === 'Salir' || b.text === 'OK');
        if (confirmButton?.onPress) {
          confirmButton.onPress();
        }
      }
    } else {
      window.alert(`${title}: ${message}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

// ==========================================
// 🌙 COMPONENTE: THEME SELECTOR
// ==========================================

function ThemeSelector({ currentTheme, onSelect, colors }: { currentTheme: ThemeMode; onSelect: (theme: ThemeMode) => void; colors: any }) {
  const themes: { id: ThemeMode; icon: string; label: string }[] = [
    { id: 'dark', icon: 'moon', label: 'Oscuro' },
    { id: 'light', icon: 'sun', label: 'Claro' },
    { id: 'system', icon: 'smartphone', label: 'Sistema' },
  ];

  return (
    <View style={styles.themeSelector}>
      {themes.map((theme) => (
        <TouchableOpacity
          key={theme.id}
          style={[
            styles.themeOption,
            { backgroundColor: colors.bgSecondary },
            currentTheme === theme.id && [styles.themeOptionActive, { borderColor: colors.primary, backgroundColor: colors.primaryDark + '20' }],
          ]}
          onPress={() => {
            triggerHaptic('selection');
            onSelect(theme.id);
          }}
        >
          <Feather
            name={theme.icon as any}
            size={20}
            color={currentTheme === theme.id ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.themeLabel,
              { color: colors.textMuted },
              currentTheme === theme.id && { color: colors.primary, fontWeight: '600' },
            ]}
          >
            {theme.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ==========================================
// 📊 COMPONENTE: STATS SUMMARY
// ==========================================

function StatsSummary({ estadisticas, colors }: { estadisticas: any; colors: any }) {
  return (
    <View style={styles.statsSummary}>
      <View style={styles.statItem}>
        <Text style={[styles.statNumber, { color: colors.primary }]}>{estadisticas?.porcentaje ?? 0}%</Text>
        <Text style={[styles.statDesc, { color: colors.textMuted }]}>Asistencia</Text>
      </View>
      <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
      <View style={styles.statItem}>
        <Text style={[styles.statNumber, { color: colors.primary }]}>{estadisticas?.asistencias ?? 0}</Text>
        <Text style={[styles.statDesc, { color: colors.textMuted }]}>Días</Text>
      </View>
      <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
      <View style={styles.statItem}>
        <Text style={[styles.statNumber, { color: colors.warning }]}>
          {estadisticas?.retardos ?? 0}
        </Text>
        <Text style={[styles.statDesc, { color: colors.textMuted }]}>Retardos</Text>
      </View>
    </View>
  );
}

// ==========================================
// 👤 PANTALLA PRINCIPAL
// ==========================================

export default function PerfilScreen() {
  const router = useRouter();
  const { colors, mode, setMode } = useTheme();
  const { alumno, alumnoActivo, hijos, config, actualizarConfig, logout, notificacionesNoLeidas, estadisticas, padre } = useStore();

  // Usar alumnoActivo si existe, si no alumno
  const alumnoMostrar = alumnoActivo || alumno;

  // Estado de biometría
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  
  // Estado de consentimiento
  const [tieneConsentimiento, setTieneConsentimiento] = useState<boolean | null>(null);

  // Estados para modal de PDF
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isExporting, setIsExporting] = useState(false);

  // Estados para justificantes
  const [justificantes, setJustificantes] = useState<Justificante[]>([]);
  const [showJustificanteForm, setShowJustificanteForm] = useState(false);
  const [showJustificanteHistorial, setShowJustificanteHistorial] = useState(false);
  const [justFecha, setJustFecha] = useState(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
  const [justMotivo, setJustMotivo] = useState<MotivoJustificante | null>(null);
  const [justDescripcion, setJustDescripcion] = useState('');
  const [isSubmittingJust, setIsSubmittingJust] = useState(false);

  // Cargar justificantes
  useEffect(() => {
    if (alumnoMostrar) {
      cargarJustificantes();
    }
  }, [alumnoMostrar]);

  const cargarJustificantes = async () => {
    if (!alumnoMostrar) return;
    const data = await justificantesService.obtenerJustificantes(
      alumnoMostrar.control || alumnoMostrar.id
    );
    setJustificantes(data);
  };

  const pendientesJustificantes = justificantes.filter(j => j.estado === 'pendiente').length;

  // Cargar estado de biometría al montar
  useEffect(() => {
    async function checkBiometric() {
      if (Platform.OS === 'web') return;
      
      const status = await biometricService.checkBiometricSupport();
      setBiometricAvailable(status.isAvailable);
      setBiometricType(status.biometricType);
      
      const isEnabled = await biometricService.isBiometricEnabled();
      setBiometricEnabled(isEnabled);
    }
    checkBiometric();
  }, []);
  
  // Verificar consentimiento del alumno actual
  useEffect(() => {
    async function checkConsentimiento() {
      if (alumnoMostrar?.control) {
        const tiene = await verificarConsentimiento(alumnoMostrar.control);
        setTieneConsentimiento(tiene);
      }
    }
    checkConsentimiento();
  }, [alumnoMostrar?.control]);
  
  // Navegar a pantalla de consentimiento
  const irAConsentimiento = () => {
    if (alumnoMostrar?.control) {
      triggerHaptic();
      router.push(`/consentimiento?id=${alumnoMostrar.control}`);
    } else {
      showAlert('Error', 'No se encontró información del alumno');
    }
  };

  // Revocar consentimiento biométrico
  const handleRevocarConsentimiento = () => {
    if (!alumnoMostrar?.control) {
      showAlert('Error', 'No se encontró información del alumno');
      return;
    }

    Alert.alert(
      '⚠️ Revocar Consentimiento',
      '¿Está seguro de revocar el consentimiento biométrico?\n\n• El alumno ya no podrá usar reconocimiento facial\n• Los datos biométricos serán eliminados permanentemente\n• Esta acción no se puede deshacer',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Revocar',
          style: 'destructive',
          onPress: async () => {
            try {
              triggerHaptic();
              const result = await revocarConsentimiento(
                alumnoMostrar.control,
                'Revocado por padre/tutor desde la app'
              );
              
              if (result.success) {
                setTieneConsentimiento(false);
                if (Platform.OS !== 'web') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                Alert.alert(
                  '✅ Consentimiento Revocado',
                  'Los datos biométricos han sido eliminados permanentemente.'
                );
              } else {
                showAlert('Error', result.error || 'No se pudo revocar el consentimiento');
              }
            } catch (error: any) {
              showAlert('Error', error.message || 'Error al revocar');
            }
          }
        }
      ]
    );
  };

  // Toggle biometría
  const toggleBiometric = async (value: boolean) => {
    if (value) {
      const result = await biometricService.authenticate('Confirma tu identidad para activar');
      if (result.success) {
        await biometricService.setBiometricEnabled(true);
        setBiometricEnabled(true);
        triggerHaptic('selection');
      }
    } else {
      await biometricService.setBiometricEnabled(false);
      setBiometricEnabled(false);
      triggerHaptic('selection');
    }
  };

  // LOGOUT CORREGIDO PARA WEB
  const handleLogout = () => {
    triggerHaptic('impact');
    showAlert('Cerrar Sesión', '¿Estás seguro de que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/login');
        },
      },
    ]);
  };

  // Toggles de notificaciones
  const toggleNotificaciones = (value: boolean) => {
    triggerHaptic('selection');
    actualizarConfig({ notificacionesActivas: value });
  };

  const toggleNotificarIngreso = (value: boolean) => {
    triggerHaptic('selection');
    actualizarConfig({ notificarIngreso: value });
  };

  const toggleNotificarSalida = (value: boolean) => {
    triggerHaptic('selection');
    actualizarConfig({ notificarSalida: value });
  };

  const toggleNotificarRetardo = (value: boolean) => {
    triggerHaptic('selection');
    actualizarConfig({ notificarRetardo: value });
  };

  // Helper para nombre del mes
  const getNombreMes = (mes: number): string => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[mes - 1] || 'Mes';
  };

  // Manejar exportación de PDF
  const handleExportar = async () => {
    if (!alumnoMostrar) {
      showAlert('Error', 'No hay alumno seleccionado');
      return;
    }

    setIsExporting(true);

    try {
      const controlAlumno = alumnoMostrar.control || alumnoMostrar.id;
      const registrosData = await attendanceService.obtenerRegistrosMes(controlAlumno, selectedYear, selectedMonth);
      const registros = Array.isArray(registrosData) ? registrosData : [];

      const stats: EstadisticasMensuales = estadisticas || {
        asistencias: registros.filter(r => r.tipoRegistro === 'Ingreso').length,
        faltas: 0, retardos: 0, diasHabiles: 20, porcentaje: 0, tendencia: 'regular', detalleRetardos: [],
      };

      setShowPdfModal(false);
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await pdfService.exportarPDF({
        alumno: alumnoMostrar, registros, estadisticas: stats, mes: selectedMonth, año: selectedYear,
      });

      showAlert(result.success ? 'Éxito' : 'Error', result.message || 'Operación completada');
    } catch (error: any) {
      showAlert('Error', error.message || 'Error al generar');
    } finally {
      setIsExporting(false);
    }
  };

  // Enviar justificante
  const handleEnviarJustificante = async () => {
    if (!justMotivo) {
      showAlert('Error', 'Selecciona un motivo');
      return;
    }
    if (!justDescripcion.trim()) {
      showAlert('Error', 'Agrega una descripción');
      return;
    }
    if (!alumnoMostrar) {
      showAlert('Error', 'No hay alumno seleccionado');
      return;
    }

    setIsSubmittingJust(true);
    triggerHaptic();

    const result = await justificantesService.enviarJustificante({
      alumnoId: alumnoMostrar.control || alumnoMostrar.id,
      alumnoNombre: `${alumnoMostrar.nombre} ${alumnoMostrar.apellidos}`,
      padreId: padre?.id || 'padre_temp',
      padreNombre: padre?.nombre || 'Padre/Tutor',
      fecha: justFecha,
      motivo: justMotivo,
      descripcion: justDescripcion.trim(),
    });

    setIsSubmittingJust(false);

    if (result.success) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showAlert('Éxito', result.message);
      cargarJustificantes();
      resetJustForm();
      setShowJustificanteForm(false);
    } else {
      showAlert('Error', result.message);
    }
  };

  const resetJustForm = () => {
    setJustFecha(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
    setJustMotivo(null);
    setJustDescripcion('');
  };

  // Fechas disponibles para justificante
  const fechasDisponibles = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i + 1);
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, "EEEE d 'de' MMMM", { locale: es }),
    };
  });

  const motivos = justificantesService.getMotivos();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <AnimatedView entering={FadeInDown.duration(500)}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Perfil</Text>
          </View>
        </AnimatedView>

        {/* Alumno Info Card */}
        <AnimatedView entering={FadeInDown.duration(500).delay(100)}>
          <View style={[styles.alumnoCard, { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: colors.bgElevated, borderColor: colors.border, borderWidth: 1 }]}>
                <Feather name="user" size={28} color={colors.primary} />
              </View>
            </View>
            <View style={styles.alumnoInfo}>
              <Text style={[styles.alumnoNombre, { color: colors.textPrimary }]}>
                {alumnoMostrar?.nombre} {alumnoMostrar?.apellidos}
              </Text>
              <Text style={[styles.alumnoControl, { color: colors.textSecondary }]}>Control: {alumnoMostrar?.control}</Text>
              <Text style={[styles.alumnoGrupo, { color: colors.textMuted }]}>
                {alumnoMostrar?.grado}° {alumnoMostrar?.grupo} · {alumnoMostrar?.turno}
              </Text>
            </View>
          </View>
        </AnimatedView>

        {/* Selector de Hijos (si hay más de uno) */}
        {hijos && hijos.length > 0 && (
          <AnimatedView entering={FadeInDown.duration(500).delay(150)} style={{ marginTop: 16 }}>
            <HijosSelector />
          </AnimatedView>
        )}

        {/* Stats Summary */}
        <AnimatedView entering={FadeInDown.duration(500).delay(200)} style={{ marginTop: 16 }}>
          <Card colors={colors}>
            <View style={styles.cardHeader}>
              <Feather name="bar-chart-2" size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Resumen del Mes</Text>
            </View>
            <StatsSummary estadisticas={estadisticas} colors={colors} />
          </Card>
        </AnimatedView>

        {/* Exportar PDF - Card inline */}
        <AnimatedView entering={FadeInDown.duration(500).delay(250)} style={{ marginTop: 16 }}>
          <Card colors={colors}>
            <View style={styles.cardHeader}>
              <Feather name="file-text" size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Exportar Reporte</Text>
            </View>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              Genera un reporte PDF con la asistencia del mes
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowPdfModal(true)}
            >
              <Feather name="download" size={18} color="white" />
              <Text style={styles.primaryBtnText}>Generar PDF</Text>
            </TouchableOpacity>
          </Card>
        </AnimatedView>

        {/* Justificantes - Card inline */}
        <AnimatedView entering={FadeInDown.duration(500).delay(275)} style={{ marginTop: 16 }}>
          <Card colors={colors}>
            <View style={styles.cardHeader}>
              <Feather name="file-plus" size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Justificantes</Text>
              {pendientesJustificantes > 0 && (
                <View style={[styles.badge, { backgroundColor: '#f59e0b' }]}>
                  <Text style={styles.badgeText}>{pendientesJustificantes}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              Envía justificantes de falta directamente a la escuela
            </Text>
            <View style={styles.cardButtons}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, flex: 1 }]}
                onPress={() => setShowJustificanteForm(true)}
              >
                <Feather name="plus" size={18} color="white" />
                <Text style={styles.primaryBtnText}>Nuevo</Text>
              </TouchableOpacity>
              {justificantes.length > 0 && (
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: colors.border, flex: 1 }]}
                  onPress={() => setShowJustificanteHistorial(true)}
                >
                  <Feather name="list" size={18} color={colors.textSecondary} />
                  <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Historial</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        </AnimatedView>

        {/* Notificaciones */}
        <AnimatedView entering={FadeInDown.duration(500).delay(300)} style={{ marginTop: 16 }}>
          <Card colors={colors}>
            <View style={styles.cardHeader}>
              <Feather name="bell" size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Notificaciones</Text>
            </View>

            <View style={[styles.notifItem, { borderBottomColor: colors.border }]}>
              <View style={styles.notifContent}>
                <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>Activar notificaciones</Text>
                <Text style={[styles.notifDesc, { color: colors.textMuted }]}>Recibe alertas de asistencia</Text>
              </View>
              <Switch
                value={config.notificacionesActivas}
                onValueChange={toggleNotificaciones}
                trackColor={{ false: colors.surface, true: colors.primary }}
                thumbColor="white"
              />
            </View>

            {config.notificacionesActivas && (
              <>
                <View style={[styles.notifItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.notifContent}>
                    <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>📥 Alertar ingreso</Text>
                  </View>
                  <Switch
                    value={config.notificarIngreso}
                    onValueChange={toggleNotificarIngreso}
                    trackColor={{ false: colors.surface, true: colors.success }}
                    thumbColor="white"
                  />
                </View>

                <View style={[styles.notifItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.notifContent}>
                    <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>📤 Alertar salida</Text>
                  </View>
                  <Switch
                    value={config.notificarSalida}
                    onValueChange={toggleNotificarSalida}
                    trackColor={{ false: colors.surface, true: colors.danger }}
                    thumbColor="white"
                  />
                </View>

                <View style={styles.notifItem}>
                  <View style={styles.notifContent}>
                    <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>⚠️ Alertar retardo</Text>
                  </View>
                  <Switch
                    value={config.notificarRetardo}
                    onValueChange={toggleNotificarRetardo}
                    trackColor={{ false: colors.surface, true: colors.warning }}
                    thumbColor="white"
                  />
                </View>
              </>
            )}
          </Card>
        </AnimatedView>

        {/* Apariencia */}
        <AnimatedView entering={FadeInDown.duration(500).delay(350)} style={{ marginTop: 16 }}>
          <Card colors={colors}>
            <View style={styles.cardHeader}>
              <Feather name="sliders" size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Apariencia</Text>
            </View>
            <ThemeSelector currentTheme={mode} onSelect={setMode} colors={colors} />
          </Card>
        </AnimatedView>

        {/* Seguridad - Solo si biometría disponible */}
        {Platform.OS !== 'web' && biometricAvailable && (
          <AnimatedView entering={FadeInDown.duration(500).delay(400)} style={{ marginTop: 16 }}>
            <Card colors={colors}>
              <View style={styles.cardHeader}>
                <Feather name="shield" size={20} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Seguridad</Text>
              </View>
              <View style={styles.notifItem}>
                <View style={styles.notifContent}>
                  <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>
                    {biometricType === 'face' ? 'Desbloqueo con Face ID' : 'Desbloqueo con huella'}
                  </Text>
                  <Text style={[styles.notifDesc, { color: colors.textMuted }]}>
                    Acceso rápido y seguro
                  </Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={toggleBiometric}
                  trackColor={{ false: colors.surface, true: colors.primary }}
                  thumbColor="white"
                />
              </View>
            </Card>
          </AnimatedView>
        )}

        {/* Menú de opciones adicionales */}
        <AnimatedView entering={FadeInDown.duration(500).delay(410)} style={{ marginTop: 16 }}>
          <Card colors={colors}>
            {/* Información del Alumno */}
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                triggerHaptic();
                showAlert(
                  'Información del Alumno',
                  `Nombre: ${alumnoMostrar?.nombre} ${alumnoMostrar?.apellidos}\n` +
                  `Control: ${alumnoMostrar?.control}\n` +
                  `Grado: ${alumnoMostrar?.grado}° ${alumnoMostrar?.grupo}\n` +
                  `Turno: ${alumnoMostrar?.turno}`
                );
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: colors.primaryDark + '20' }]}>
                <Feather name="info" size={20} color={colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Información del Alumno</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Avisos de la Escuela */}
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                triggerHaptic();
                router.push('/avisos');
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: colors.warning + '20' }]}>
                <Feather name="bell" size={20} color={colors.warning} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Avisos de la Escuela</Text>
                <Text style={[styles.notifDesc, { color: colors.textMuted }]}>Comunicados y anuncios</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Ayuda y Soporte */}
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                triggerHaptic();
                showAlert(
                  'Ayuda y Soporte',
                  '¿Necesitas ayuda?\n\n' +
                  '📧 soporte@keyon.app\n' +
                  '📞 (+52) 493 188 7739\n\n' +
                  'Horario de atención:\nLunes a Viernes 8:00 - 18:00'
                );
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: colors.primaryDark + '20' }]}>
                <Feather name="help-circle" size={20} color={colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Ayuda y Soporte</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Ver Tutorial */}
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                triggerHaptic();
                resetTutorial().then(() => {
                  showAlert('Tutorial', 'El tutorial se mostrará la próxima vez que abras la app');
                });
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: colors.primaryDark + '20' }]}>
                <Feather name="play-circle" size={20} color={colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Ver tutorial</Text>
                <Text style={[styles.notifDesc, { color: colors.textMuted }]}>Reinicia el tour de la app</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Privacidad */}
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                triggerHaptic();
                showAlert(
                  'Privacidad',
                  'Tu información está protegida.\n\n' +
                  '• Los datos se almacenan de forma segura\n' +
                  '• No compartimos información con terceros\n' +
                  '• Cumplimos con las leyes de protección de datos'
                );
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: colors.primaryDark + '20' }]}>
                <Feather name="shield" size={20} color={colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Privacidad</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Consentimiento Biométrico */}
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: tieneConsentimiento ? colors.border : 'transparent' }]}
              onPress={tieneConsentimiento ? undefined : irAConsentimiento}
              disabled={tieneConsentimiento === true}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: colors.primaryDark + '20' }]}>
                <Feather name="check-circle" size={20} color={colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                  Consentimiento Biométrico
                </Text>
                <Text style={[styles.notifDesc, { color: tieneConsentimiento ? '#10b981' : '#f59e0b' }]}>
                  {tieneConsentimiento === null 
                    ? 'Verificando...' 
                    : tieneConsentimiento 
                      ? '✓ Autorizado' 
                      : '⚠ Pendiente de autorización'}
                </Text>
              </View>
              {!tieneConsentimiento && (
                <Feather name="chevron-right" size={20} color={colors.textMuted} />
              )}
            </TouchableOpacity>

            {/* Botón Revocar - Solo si tiene consentimiento */}
            {tieneConsentimiento === true && (
              <TouchableOpacity 
                style={[styles.menuItem, { 
                  borderBottomColor: 'transparent',
                  backgroundColor: 'rgba(239,68,68,0.1)',
                  marginTop: -1
                }]}
                onPress={handleRevocarConsentimiento}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(239,68,68,0.2)' }]}>
                  <Feather name="x-circle" size={20} color="#ef4444" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={[styles.menuTitle, { color: '#ef4444' }]}>
                    Revocar Consentimiento
                  </Text>
                  <Text style={[styles.notifDesc, { color: '#94a3b8' }]}>
                    Eliminar datos biométricos
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#ef4444" />
              </TouchableOpacity>
            )}
          </Card>
        </AnimatedView>

        {/* Logout Button */}
        <AnimatedView entering={FadeInDown.duration(500).delay(450)} style={{ marginTop: 16 }}>
          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: colors.dangerLight }]} 
            onPress={handleLogout}
          >
            <Feather name="log-out" size={20} color={colors.danger} />
            <Text style={[styles.logoutText, { color: colors.danger }]}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </AnimatedView>

        {/* Version */}
        <AnimatedView entering={FadeInDown.duration(500).delay(500)}>
          <Text style={[styles.version, { color: colors.textMuted }]}>Keyon Padres v1.0.0</Text>
        </AnimatedView>
      </ScrollView>

      {/* ================================================ */}
      {/* MODAL DE EXPORTAR PDF - INLINE                   */}
      {/* ================================================ */}
      <Modal
        visible={showPdfModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPdfModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Exportar Reporte
            </Text>
            
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
              Selecciona el mes a exportar:
            </Text>

            <View style={styles.monthSelector}>
              <TouchableOpacity
                style={[styles.monthBtn, { backgroundColor: colors.bgSecondary }]}
                onPress={() => {
                  if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
                  else { setSelectedMonth(m => m - 1); }
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
                  if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
                  else { setSelectedMonth(m => m + 1); }
                }}
              >
                <Feather name="chevron-right" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowPdfModal(false)}
                disabled={isExporting}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
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

      {/* ================================================ */}
      {/* MODAL DE NUEVO JUSTIFICANTE - INLINE             */}
      {/* ================================================ */}
      <Modal
        visible={showJustificanteForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowJustificanteForm(false)}
      >
        <View style={styles.modalOverlayBottom}>
          <View style={[styles.modalContentBottom, { backgroundColor: colors.bgPrimary }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Nuevo Justificante</Text>
              <TouchableOpacity onPress={() => setShowJustificanteForm(false)}>
                <Feather name="x" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {alumnoMostrar && (
                <View style={[styles.alumnoInfoBox, { backgroundColor: colors.bgSecondary }]}>
                  <Feather name="user" size={16} color={colors.primary} />
                  <Text style={[styles.alumnoInfoText, { color: colors.textSecondary }]}>
                    {alumnoMostrar.nombre} {alumnoMostrar.apellidos}
                  </Text>
                </View>
              )}

              <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Fecha de la falta</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fechasScroll}>
                {fechasDisponibles.map((f) => (
                  <TouchableOpacity
                    key={f.value}
                    style={[
                      styles.fechaBtn,
                      { backgroundColor: colors.bgSecondary },
                      justFecha === f.value && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => setJustFecha(f.value)}
                  >
                    <Text style={[
                      styles.fechaBtnText,
                      { color: colors.textSecondary },
                      justFecha === f.value && { color: 'white' }
                    ]} numberOfLines={1}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Motivo</Text>
              <View style={styles.motivosGrid}>
                {motivos.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={[
                      styles.motivoBtn,
                      { backgroundColor: colors.bgSecondary },
                      justMotivo === m.value && { 
                        backgroundColor: colors.primary + '20',
                        borderColor: colors.primary,
                        borderWidth: 2,
                      }
                    ]}
                    onPress={() => setJustMotivo(m.value)}
                  >
                    <Feather 
                      name={m.icon as any} 
                      size={24} 
                      color={justMotivo === m.value ? colors.primary : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.motivoBtnText,
                      { color: justMotivo === m.value ? colors.primary : colors.textSecondary }
                    ]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Descripción</Text>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: colors.bgSecondary, color: colors.textPrimary, borderColor: colors.border }
                ]}
                placeholder="Describe brevemente el motivo de la falta..."
                placeholderTextColor={colors.textMuted}
                value={justDescripcion}
                onChangeText={setJustDescripcion}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowJustificanteForm(false)}
                disabled={isSubmittingJust}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleEnviarJustificante}
                disabled={isSubmittingJust}
              >
                {isSubmittingJust ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Feather name="send" size={18} color="white" />
                    <Text style={styles.confirmBtnText}>Enviar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================ */}
      {/* MODAL DE HISTORIAL JUSTIFICANTES - INLINE        */}
      {/* ================================================ */}
      <Modal
        visible={showJustificanteHistorial}
        transparent
        animationType="slide"
        onRequestClose={() => setShowJustificanteHistorial(false)}
      >
        <View style={styles.modalOverlayBottom}>
          <View style={[styles.modalContentBottom, { backgroundColor: colors.bgPrimary }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Mis Justificantes</Text>
              <TouchableOpacity onPress={() => setShowJustificanteHistorial(false)}>
                <Feather name="x" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {justificantes.length === 0 ? (
                <View style={styles.emptyState}>
                  <Feather name="inbox" size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>No hay justificantes</Text>
                </View>
              ) : (
                justificantes.map((j) => {
                  const estadoColor = justificantesService.getEstadoColor(j.estado);
                  const estadoLabel = justificantesService.getEstadoLabel(j.estado);
                  const motivoLabel = justificantesService.getMotivoLabel(j.motivo);
                  const motivoIcon = justificantesService.getMotivoIcon(j.motivo);
                  
                  return (
                    <View key={j.id} style={[styles.justificanteItem, { backgroundColor: colors.bgCard }]}>
                      <View style={styles.justificanteHeader}>
                        <View style={[styles.motivoBadge, { backgroundColor: colors.bgSecondary }]}>
                          <Feather name={motivoIcon as any} size={14} color={colors.textSecondary} />
                          <Text style={[styles.motivoBadgeText, { color: colors.textSecondary }]}>{motivoLabel}</Text>
                        </View>
                        <View style={[styles.estadoBadge, { backgroundColor: estadoColor + '20' }]}>
                          <View style={[styles.estadoDot, { backgroundColor: estadoColor }]} />
                          <Text style={[styles.estadoText, { color: estadoColor }]}>{estadoLabel}</Text>
                        </View>
                      </View>
                      <Text style={[styles.justificanteFecha, { color: colors.textPrimary }]}>
                        Falta del {format(parseISO(j.fecha), "d 'de' MMMM", { locale: es })}
                      </Text>
                      <Text style={[styles.justificanteDesc, { color: colors.textMuted }]} numberOfLines={2}>
                        {j.descripcion}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  alumnoCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alumnoInfo: {
    flex: 1,
  },
  alumnoNombre: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 2,
  },
  alumnoControl: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  alumnoGrupo: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
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
    flex: 1,
  },
  cardDesc: {
    fontSize: 14,
    marginBottom: 16,
  },
  statsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
  },
  statDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  notifDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  themeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeOptionActive: {
    borderWidth: 2,
  },
  themeLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
  
  // Botones
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  cardButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Modal centrado (PDF)
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
  
  // Modal desde abajo (Justificantes)
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContentBottom: {
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
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  
  // Form justificante
  alumnoInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  alumnoInfoText: {
    fontSize: 14,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  fechasScroll: {
    marginBottom: 20,
  },
  fechaBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 8,
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
});
