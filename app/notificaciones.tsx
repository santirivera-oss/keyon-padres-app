// ==========================================
// 🔔 PANTALLA DE NOTIFICACIONES
// ==========================================
// Historial completo de notificaciones

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import { useStore } from '../store/useStore';
import { useTheme } from '../context/ThemeContext';
import notificacionesService, { 
  Notificacion, 
  NOTIFICACION_CONFIG,
  formatearFechaNotificacion,
  agruparPorFecha 
} from '../services/notificaciones';

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ==========================================
// 🎨 COMPONENTE: NOTIFICACIÓN ITEM
// ==========================================
interface NotificacionItemProps {
  notificacion: Notificacion;
  colors: any;
  onPress: () => void;
  onDelete: () => void;
  index: number;
}

function NotificacionItem({ 
  notificacion, 
  colors, 
  onPress, 
  onDelete,
  index 
}: NotificacionItemProps) {
  const config = NOTIFICACION_CONFIG[notificacion.tipo] || NOTIFICACION_CONFIG.sistema;
  
  return (
    <AnimatedView 
      entering={FadeInDown.duration(300).delay(index * 50)}
      exiting={FadeOut.duration(200)}
    >
      <TouchableOpacity
        style={[
          styles.notifItem,
          { backgroundColor: colors.bgCard },
          !notificacion.leida && { backgroundColor: config.colorBg }
        ]}
        onPress={onPress}
        onLongPress={onDelete}
        activeOpacity={0.7}
      >
        {/* Icono */}
        <View style={[styles.notifIcon, { backgroundColor: config.color + '20' }]}>
          <Feather name={config.icono as any} size={20} color={config.color} />
        </View>
        
        {/* Contenido */}
        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text 
              style={[
                styles.notifTitulo, 
                { color: colors.textPrimary },
                !notificacion.leida && { fontWeight: '700' }
              ]} 
              numberOfLines={1}
            >
              {notificacion.titulo}
            </Text>
            <Text style={[styles.notifFecha, { color: colors.textMuted }]}>
              {formatearFechaNotificacion(notificacion.fecha)}
            </Text>
          </View>
          
          <Text 
            style={[styles.notifMensaje, { color: colors.textSecondary }]} 
            numberOfLines={2}
          >
            {notificacion.mensaje}
          </Text>
          
          {notificacion.alumnoNombre && (
            <View style={styles.notifAlumno}>
              <Feather name="user" size={12} color={colors.textMuted} />
              <Text style={[styles.notifAlumnoText, { color: colors.textMuted }]}>
                {notificacion.alumnoNombre}
              </Text>
            </View>
          )}
        </View>
        
        {/* Indicador no leída */}
        {!notificacion.leida && (
          <View style={[styles.notifDot, { backgroundColor: config.color }]} />
        )}
      </TouchableOpacity>
    </AnimatedView>
  );
}

// ==========================================
// 🎨 COMPONENTE: SECCIÓN
// ==========================================
interface SeccionProps {
  titulo: string;
  notificaciones: Notificacion[];
  colors: any;
  onPressItem: (notif: Notificacion) => void;
  onDeleteItem: (notif: Notificacion) => void;
  startIndex: number;
}

function Seccion({ 
  titulo, 
  notificaciones, 
  colors, 
  onPressItem, 
  onDeleteItem,
  startIndex 
}: SeccionProps) {
  if (notificaciones.length === 0) return null;
  
  return (
    <View style={styles.seccion}>
      <Text style={[styles.seccionTitulo, { color: colors.textMuted }]}>
        {titulo}
      </Text>
      {notificaciones.map((notif, idx) => (
        <NotificacionItem
          key={notif.id}
          notificacion={notif}
          colors={colors}
          onPress={() => onPressItem(notif)}
          onDelete={() => onDeleteItem(notif)}
          index={startIndex + idx}
        />
      ))}
    </View>
  );
}

// ==========================================
// 🎨 COMPONENTE: EMPTY STATE
// ==========================================
function EmptyState({ colors }: { colors: any }) {
  return (
    <AnimatedView entering={FadeIn.duration(400)} style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.bgSecondary }]}>
        <Feather name="bell-off" size={40} color={colors.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        Sin notificaciones
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
        Aquí aparecerán las notificaciones de entrada, salida, tareas y avisos
      </Text>
    </AnimatedView>
  );
}

// ==========================================
// 📱 PANTALLA PRINCIPAL
// ==========================================
export default function NotificacionesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { sesion, alumno } = useStore();
  
  // Usar alumnoId como identificador del padre (temporal hasta tener padreId real)
  const padreId = sesion?.alumnoId || alumno?.control;
  
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Cargar notificaciones
  const cargarNotificaciones = useCallback(async () => {
    if (!padreId) {
      console.log('❌ No hay padreId para cargar notificaciones');
      setIsLoading(false);
      return;
    }
    
    try {
      console.log('🔔 Cargando notificaciones para:', padreId);
      const data = await notificacionesService.obtenerNotificaciones(padreId);
      console.log('🔔 Notificaciones obtenidas:', data.length);
      setNotificaciones(data);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    } finally {
      setIsLoading(false);
    }
  }, [padreId]);
  
  // Suscripción en tiempo real
  useEffect(() => {
    if (!padreId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    console.log('🔔 Suscribiendo a notificaciones:', padreId);
    
    const unsubscribe = notificacionesService.suscribirseANotificaciones(
      padreId,
      (data) => {
        console.log('🔔 Notificaciones actualizadas:', data.length);
        setNotificaciones(data);
        setIsLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [padreId]);
  
  const onRefresh = async () => {
    setIsRefreshing(true);
    await cargarNotificaciones();
    setIsRefreshing(false);
  };
  
  // Marcar como leída al tocar
  const handlePressNotificacion = async (notif: Notificacion) => {
    if (!notif.leida && padreId) {
      await notificacionesService.marcarComoLeida(padreId, notif.id);
    }
    
    // Navegar según tipo
    switch (notif.tipo) {
      case 'entrada':
      case 'salida':
      case 'retardo':
        router.push('/asistencia');
        break;
      case 'tarea':
        router.push('/tareas');
        break;
      case 'aviso':
        router.push('/avisos');
        break;
      default:
        // Solo marcar como leída
        break;
    }
  };
  
  // Eliminar notificación
  const handleDeleteNotificacion = (notif: Notificacion) => {
    Alert.alert(
      'Eliminar notificación',
      '¿Eliminar esta notificación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (padreId) {
              await notificacionesService.eliminarNotificacion(padreId, notif.id);
            }
          }
        }
      ]
    );
  };
  
  // Marcar todas como leídas
  const handleMarcarTodasLeidas = () => {
    Alert.alert(
      'Marcar todas como leídas',
      '¿Marcar todas las notificaciones como leídas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Marcar',
          onPress: async () => {
            if (padreId) {
              await notificacionesService.marcarTodasComoLeidas(padreId);
            }
          }
        }
      ]
    );
  };
  
  // Agrupar notificaciones
  const grupos = agruparPorFecha(notificaciones);
  const hayNoLeidas = notificaciones.some(n => !n.leida);
  
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
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        
        <Text style={[styles.title, { color: colors.textPrimary }]}>Notificaciones</Text>
        
        {hayNoLeidas ? (
          <TouchableOpacity onPress={handleMarcarTodasLeidas} style={styles.actionBtn}>
            <Feather name="check-circle" size={22} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.actionBtn} />
        )}
      </View>
      
      {/* Lista */}
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
        {notificaciones.length === 0 ? (
          <EmptyState colors={colors} />
        ) : (
          <>
            <Seccion
              titulo="Hoy"
              notificaciones={grupos.hoy}
              colors={colors}
              onPressItem={handlePressNotificacion}
              onDeleteItem={handleDeleteNotificacion}
              startIndex={0}
            />
            <Seccion
              titulo="Ayer"
              notificaciones={grupos.ayer}
              colors={colors}
              onPressItem={handlePressNotificacion}
              onDeleteItem={handleDeleteNotificacion}
              startIndex={grupos.hoy.length}
            />
            <Seccion
              titulo="Esta semana"
              notificaciones={grupos.semana}
              colors={colors}
              onPressItem={handlePressNotificacion}
              onDeleteItem={handleDeleteNotificacion}
              startIndex={grupos.hoy.length + grupos.ayer.length}
            />
            <Seccion
              titulo="Anteriores"
              notificaciones={grupos.anteriores}
              colors={colors}
              onPressItem={handlePressNotificacion}
              onDeleteItem={handleDeleteNotificacion}
              startIndex={grupos.hoy.length + grupos.ayer.length + grupos.semana.length}
            />
          </>
        )}
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  actionBtn: {
    padding: 4,
    width: 40,
    alignItems: 'flex-end',
  },
  
  // Content
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  
  // Sección
  seccion: {
    marginBottom: 24,
  },
  seccionTitulo: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  
  // Notificación Item
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: 8,
  },
  notifTitulo: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  notifFecha: {
    fontSize: 12,
  },
  notifMensaje: {
    fontSize: 14,
    lineHeight: 20,
  },
  notifAlumno: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  notifAlumnoText: {
    fontSize: 12,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
