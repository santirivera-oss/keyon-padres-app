// =====================================================================
// 🛡️ DERECHOS ARCO (LFPDPPP) — Pantalla dedicada
// =====================================================================
// Permite al tutor ejercer los 4 derechos LFPDPPP sin contactar al admin:
//   - Acceso: descargar JSON con todos los datos del alumno
//   - Rectificación: solicitar corrección de un campo
//   - Cancelación: revocar consentimiento biométrico (purga descriptor)
// =====================================================================

import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
  TextInput, ActivityIndicator, Platform, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../context/ThemeContext';
import {
  descargarMisDatos,
  solicitarCorreccion,
  revocarConsentimiento,
  ArcoExport,
} from '../services/arco';

const showConfirm = (titulo: string, mensaje: string, onOk: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${titulo}\n\n${mensaje}`)) onOk();
  } else {
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', style: 'destructive', onPress: onOk },
    ]);
  }
};

export default function ArcoScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingCorr, setLoadingCorr] = useState(false);
  const [loadingRevoke, setLoadingRevoke] = useState(false);
  const [exportResult, setExportResult] = useState<ArcoExport | null>(null);

  // Form rectificación
  const [campo, setCampo] = useState('');
  const [valorActual, setValorActual] = useState('');
  const [valorPropuesto, setValorPropuesto] = useState('');
  const [descripcion, setDescripcion] = useState('');

  // Form cancelación
  const [motivoCancelacion, setMotivoCancelacion] = useState('');

  // ───── Acceso ─────
  const handleDescargar = async () => {
    setLoadingExport(true);
    try {
      const data = await descargarMisDatos();
      setExportResult(data);
      Alert.alert(
        '✓ Datos descargados',
        `Archivo generado con ${data.asistencia.length} registros de asistencia, ${data.calificaciones.length} calificaciones, ${data.reportesDisciplina.length} reportes.`,
        [
          {
            text: 'Compartir / guardar',
            onPress: () => compartirExport(data),
          },
          { text: 'OK' },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo descargar');
    } finally {
      setLoadingExport(false);
    }
  };

  const compartirExport = async (data: ArcoExport) => {
    try {
      const fileName = `mis-datos-${data.titular}-${new Date().toISOString().slice(0, 10)}.json`;
      const fileUri = (FileSystem.documentDirectory || '') + fileName;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Compartir mis datos LFPDPPP',
        });
      } else {
        await Share.share({ message: JSON.stringify(data, null, 2) });
      }
    } catch (e: any) {
      Alert.alert('Error compartiendo', e?.message || 'Falló');
    }
  };

  // ───── Rectificación ─────
  const handleEnviarCorreccion = () => {
    if (!campo || !valorPropuesto || !descripcion) {
      Alert.alert('Campos faltantes', 'Llena campo, valor propuesto y descripción.');
      return;
    }
    showConfirm(
      'Enviar solicitud de rectificación',
      `Pedirás al admin del plantel cambiar:\n\n${campo}: "${valorActual || '∅'}" → "${valorPropuesto}"\n\nMotivo: ${descripcion}`,
      async () => {
        setLoadingCorr(true);
        try {
          await solicitarCorreccion({ campo, valorActual, valorPropuesto, descripcion });
          Alert.alert(
            '✓ Solicitud enviada',
            'Tu solicitud quedó registrada. El admin revisará y responderá en máx. 20 días hábiles (LFPDPPP Art. 32).'
          );
          setCampo(''); setValorActual(''); setValorPropuesto(''); setDescripcion('');
        } catch (e: any) {
          Alert.alert('Error', e?.message || 'No se pudo enviar');
        } finally {
          setLoadingCorr(false);
        }
      }
    );
  };

  // ───── Cancelación (modelo nuevo: solicitud que admin debe aprobar) ─────
  const handleRevocar = () => {
    if (!motivoCancelacion || motivoCancelacion.trim().length < 10) {
      Alert.alert(
        'Motivo requerido',
        'Por favor escribe el motivo de la revocación (mínimo 10 caracteres). El admin lo necesita para procesar tu solicitud.'
      );
      return;
    }
    showConfirm(
      'Solicitar revocación de consentimiento',
      'Tu solicitud quedará registrada. El admin la revisará y ejecutará la eliminación del descriptor biométrico en máximo 20 días hábiles (LFPDPPP Art. 32).\n\n' +
      'El admin no puede negar la revocación, sólo verificar tu identidad.\n\n' +
      'Motivo: "' + motivoCancelacion.trim() + '"\n\n' +
      '¿Enviar solicitud?',
      async () => {
        setLoadingRevoke(true);
        try {
          const r = await revocarConsentimiento(motivoCancelacion.trim());
          Alert.alert(
            '✓ Solicitud enviada',
            r.mensaje || 'Tu solicitud fue registrada. Recibirás confirmación cuando se procese.'
          );
          setMotivoCancelacion('');
        } catch (e: any) {
          Alert.alert('Error', e?.message || 'No se pudo enviar la solicitud');
        } finally {
          setLoadingRevoke(false);
        }
      }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Mis derechos (ARCO)</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Ley Federal de Protección de Datos</Text>
          <Text style={styles.introText}>
            Como tutor del titular tienes derecho a Acceso, Rectificación, Cancelación y Oposición
            sobre los datos que el sistema KEYON Access tiene de tu hijo (LFPDPPP Arts. 16-22).
          </Text>
        </View>

        {/* ───── ACCESO ───── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="download" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Acceso a mis datos</Text>
          </View>
          <Text style={styles.cardDesc}>
            Descarga un archivo JSON con todos los datos almacenados de tu hijo:
            asistencia, calificaciones, reportes de disciplina, consentimiento.
          </Text>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={handleDescargar}
            disabled={loadingExport}
          >
            {loadingExport
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnTextLight}>Descargar mis datos</Text>}
          </TouchableOpacity>
          {exportResult && (
            <Text style={styles.cardFootnote}>
              Último export: {new Date(exportResult.generadoEn).toLocaleString('es-MX')} ·
              {' '}{exportResult.asistencia.length} registros · {exportResult.calificaciones.length} calificaciones
            </Text>
          )}
        </View>

        {/* ───── RECTIFICACIÓN ───── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="edit-2" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Solicitar corrección</Text>
          </View>
          <Text style={styles.cardDesc}>
            Si algún dato del alumno está incorrecto (nombre, teléfono, email), solicita
            su corrección. El admin del plantel revisará y aplicará en máx. 20 días hábiles.
          </Text>
          <Text style={styles.label}>Campo a corregir</Text>
          <TextInput
            style={styles.input}
            value={campo}
            onChangeText={setCampo}
            placeholder="Ej: whatsapp, email, nombreTutor"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
          <Text style={styles.label}>Valor actual (opcional)</Text>
          <TextInput
            style={styles.input}
            value={valorActual}
            onChangeText={setValorActual}
            placeholder="Lo que actualmente está mal"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.label}>Valor propuesto</Text>
          <TextInput
            style={styles.input}
            value={valorPropuesto}
            onChangeText={setValorPropuesto}
            placeholder="El valor correcto"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.label}>Motivo / descripción</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder="Explica por qué solicitas el cambio"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={handleEnviarCorreccion}
            disabled={loadingCorr}
          >
            {loadingCorr
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnTextLight}>Enviar solicitud</Text>}
          </TouchableOpacity>
        </View>

        {/* ───── CANCELACIÓN ───── */}
        <View style={[styles.card, styles.cardDanger]}>
          <View style={styles.cardHeader}>
            <Feather name="alert-octagon" size={20} color={colors.danger} />
            <Text style={[styles.cardTitle, { color: colors.danger }]}>
              Solicitar revocación de consentimiento
            </Text>
          </View>
          <Text style={styles.cardDesc}>
            Solicita la eliminación permanente del descriptor facial. El admin recibirá tu
            solicitud, verificará tu identidad y ejecutará la eliminación en máximo 20 días
            hábiles (LFPDPPP Art. 32). El admin no puede negar la revocación, sólo verificar.
            Después de la ejecución, el alumno podrá seguir usando QR / código de barras.
          </Text>
          <Text style={styles.label}>Motivo de la revocación (obligatorio)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={motivoCancelacion}
            onChangeText={setMotivoCancelacion}
            placeholder="Explica brevemente por qué solicitas la revocación (mínimo 10 caracteres)"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.btn, styles.btnDanger]}
            onPress={handleRevocar}
            disabled={loadingRevoke}
          >
            {loadingRevoke
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnTextLight}>Enviar solicitud de revocación</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.legalFootnote}>
          <Text style={styles.legalText}>
            Ejecutar estos derechos NO requiere autorización previa. Toda acción queda registrada
            en bitácora inmutable accesible al INAI bajo solicitud (LFPDPPP Art. 23).
          </Text>
          <Text style={styles.legalText}>
            Contacto del responsable: privacidad@keyon.app
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 8, marginRight: 8 },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  scroll: { padding: 16, paddingBottom: 32 },

  intro: { marginBottom: 16 },
  introTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  introText: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },

  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  cardDanger: { borderColor: colors.danger + '40' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  cardDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: 14 },
  cardFootnote: { fontSize: 11, color: colors.textMuted, marginTop: 10, fontStyle: 'italic' },

  label: { fontSize: 12, color: colors.textMuted, marginTop: 10, marginBottom: 4, fontWeight: '500' },
  input: {
    backgroundColor: colors.inputBackground || colors.background,
    color: colors.text, padding: 12, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border, fontSize: 14,
  },
  textarea: { minHeight: 70, textAlignVertical: 'top' },

  btn: {
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnDanger: { backgroundColor: colors.danger },
  btnTextLight: { color: '#fff', fontSize: 14, fontWeight: '600' },

  legalFootnote: { marginTop: 8, paddingHorizontal: 8 },
  legalText: { fontSize: 11, color: colors.textMuted, lineHeight: 16, marginBottom: 6 },
});
