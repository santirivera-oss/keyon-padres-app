// ==========================================
// PANTALLA MENSAJES - Chat padre <-> admin
// ==========================================

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTheme, Theme } from '../../context/ThemeContext';
import { useStore } from '../../store/useStore';
import chatService, { ChatMensaje } from '../../services/chat';

function formatHora(ts: any): string {
  try {
    const d = ts?.toDate ? ts.toDate() : ts?.seconds ? new Date(ts.seconds * 1000) : null;
    if (!d) return '';
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatDiaBadge(ts: any): string {
  try {
    const d = ts?.toDate ? ts.toDate() : ts?.seconds ? new Date(ts.seconds * 1000) : null;
    if (!d) return '';
    const hoy = new Date();
    const esHoy =
      d.getDate() === hoy.getDate() &&
      d.getMonth() === hoy.getMonth() &&
      d.getFullYear() === hoy.getFullYear();
    if (esHoy) return 'Hoy';
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function MensajesScreen() {
  const { colors, isDark } = useTheme();
  const { sesion, alumno } = useStore();
  const tabBarHeight = useBottomTabBarHeight();
  const [mensajes, setMensajes] = useState<ChatMensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const listRef = useRef<FlatList>(null);

  const alumnoId = alumno?.control || alumno?.id || '';
  const padreNombre = sesion?.nombrePadre || 'Padre/Madre';
  const padreId = sesion?.padreId || alumnoId;
  const alumnoNombre = alumno?.nombre || '';

  useEffect(() => {
    if (!alumnoId) {
      setCargando(false);
      return;
    }

    const unsub = chatService.subscribirMensajes(alumnoId, (msgs) => {
      setMensajes(msgs);
      setCargando(false);
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });

    chatService.marcarLeidoPadre(alumnoId).catch(() => {});

    return () => unsub();
  }, [alumnoId]);

  const handleEnviar = async () => {
    const msg = texto.trim();
    if (!msg || enviando || !alumnoId) return;

    setEnviando(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const r = await chatService.enviarMensaje({
      alumnoId,
      alumnoNombre,
      padreId,
      padreNombre,
      texto: msg,
    });

    if (r.success) {
      setTexto('');
    }
    setEnviando(false);
  };

  const renderItem = ({ item, index }: { item: ChatMensaje; index: number }) => {
    const esPadre = item.from === 'padre';
    const prev = mensajes[index - 1];
    const mostrarDia =
      !prev ||
      formatDiaBadge(prev.createdAt) !== formatDiaBadge(item.createdAt);

    return (
      <View>
        {mostrarDia && item.createdAt ? (
          <View style={styles.diaBadgeWrap}>
            <Text style={[styles.diaBadge, { backgroundColor: colors.bgElevated, color: colors.textMuted }]}>
              {formatDiaBadge(item.createdAt)}
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.bubbleRow,
            { justifyContent: esPadre ? 'flex-end' : 'flex-start' },
          ]}
        >
          <View
            style={[
              styles.bubble,
              esPadre
                ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
                : { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
            ]}
          >
            {!esPadre && item.autorNombre ? (
              <Text style={[styles.autor, { color: colors.textMuted }]}>{item.autorNombre}</Text>
            ) : null}
            <Text style={[styles.texto, { color: esPadre ? '#fff' : colors.textPrimary }]}>
              {item.texto}
            </Text>
            <Text style={[styles.hora, { color: esPadre ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
              {formatHora(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Feather name="message-circle" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Escuela</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Chat con administracion
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={tabBarHeight}
      >
        {cargando ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : mensajes.length === 0 ? (
          <View style={styles.centered}>
            <Feather name="message-square" size={48} color={colors.textMuted} />
            <Text style={[styles.vacioTitulo, { color: colors.textSecondary }]}>
              Sin mensajes aun
            </Text>
            <Text style={[styles.vacioSub, { color: colors.textMuted }]}>
              Escribe para iniciar la conversacion con la escuela
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={mensajes}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View style={[
          styles.inputBar,
          {
            backgroundColor: colors.bgSecondary,
            borderTopColor: colors.border,
            marginBottom: tabBarHeight,
          },
        ]}>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: colors.bgElevated,
                color: colors.textPrimary,
                borderColor: colors.border,
              },
            ]}
            multiline
            maxLength={1000}
            editable={!enviando}
          />
          <TouchableOpacity
            onPress={handleEnviar}
            disabled={enviando || !texto.trim()}
            style={[
              styles.sendBtn,
              {
                backgroundColor: texto.trim() && !enviando ? colors.primary : colors.bgElevated,
              },
            ]}
            activeOpacity={0.7}
          >
            {enviando ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather
                name="send"
                size={18}
                color={texto.trim() ? '#fff' : colors.textMuted}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    gap: Theme.spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.bold,
  },
  headerSubtitle: {
    fontSize: Theme.fontSize.xs,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.xl,
  },
  vacioTitulo: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.semibold,
  },
  vacioSub: {
    marginTop: Theme.spacing.xs,
    fontSize: Theme.fontSize.sm,
    textAlign: 'center',
  },
  listContent: {
    padding: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
  },
  diaBadgeWrap: {
    alignItems: 'center',
    marginVertical: Theme.spacing.sm,
  },
  diaBadge: {
    fontSize: Theme.fontSize.xs,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.full,
    overflow: 'hidden',
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.xs,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.lg,
  },
  autor: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.semibold,
    marginBottom: 2,
  },
  texto: {
    fontSize: Theme.fontSize.sm,
    lineHeight: 20,
  },
  hora: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Theme.spacing.md : Theme.spacing.sm,
    borderTopWidth: 1,
    gap: Theme.spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Theme.borderRadius.xl,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: Theme.fontSize.sm,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
