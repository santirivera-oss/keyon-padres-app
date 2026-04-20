// ==========================================
// 📜 PANTALLA DE HISTORIAL - CORREGIDA
// ==========================================

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../context/ThemeContext';
import { RegistroAcceso } from '../../types';

type FiltroTipo = 'todos' | 'Ingreso' | 'Salida';

export default function HistorialScreen() {
  const { colors } = useTheme();
  const { alumno, alumnoActivo } = useStore();
  const [historial, setHistorial] = useState<RegistroAcceso[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filtro, setFiltro] = useState<FiltroTipo>('todos');

  const alumnoUsar = alumnoActivo || alumno;

  // Cargar historial
  const cargarHistorial = useCallback(async () => {
    if (!alumnoUsar) return;
    
    setIsRefreshing(true);
    try {
      const { default: attendanceService } = await import('../../services/attendance');
      const controlAlumno = alumnoUsar.control || alumnoUsar.id;
      const datos = await attendanceService.obtenerHistorial(controlAlumno, 30);
      setHistorial(datos || []);
    } catch (error) {
      console.error('Error cargando historial:', error);
      setHistorial([]);
    } finally {
      setIsRefreshing(false);
    }
  }, [alumnoUsar]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const onRefresh = useCallback(async () => {
    await cargarHistorial();
  }, [cargarHistorial]);

  // Filtrar registros
  const registrosFiltrados = filtro === 'todos' 
    ? historial 
    : historial.filter(r => r.tipoRegistro === filtro);

  // Agrupar por fecha
  const registrosAgrupados = agruparPorFecha(registrosFiltrados);

  const renderItem = ({ item }: { item: { fecha: string; registros: RegistroAcceso[] } }) => (
    <View style={styles.dayGroup}>
      <Text style={[styles.dayTitle, { color: colors.textSecondary }]}>
        {formatearFecha(item.fecha)}
      </Text>
      {item.registros.map((registro) => (
        <View 
          key={registro.id} 
          style={[
            styles.registroItem, 
            { backgroundColor: colors.bgCard, borderColor: colors.border }
          ]}
        >
          <View style={[
            styles.iconContainer,
            registro.tipoRegistro === 'Ingreso' ? styles.iconIngreso : styles.iconSalida
          ]}>
            <Feather 
              name={registro.tipoRegistro === 'Ingreso' ? 'log-in' : 'log-out'} 
              size={18} 
              color="white" 
            />
          </View>
          <View style={styles.registroInfo}>
            <Text style={[styles.registroTipo, { color: colors.textPrimary }]}>
              {registro.tipoRegistro}
            </Text>
            <View style={styles.registroMeta}>
              <Text style={[styles.registroModo, { color: colors.textMuted }]}>
                {getModoLabel(registro.modo)}
              </Text>
              {registro.origen === 'terminal_pi' && (
                <View style={styles.origenBadge}>
                  <Text style={styles.origenBadgeText}>Terminal</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={[styles.registroHora, { color: colors.primary }]}>
            {registro.hora?.slice(0, 5) || '--:--'}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Historial</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Últimos 30 días</Text>
      </View>

      {/* Filtros */}
      <View style={styles.filtros}>
        {(['todos', 'Ingreso', 'Salida'] as FiltroTipo[]).map((tipo) => (
          <TouchableOpacity
            key={tipo}
            style={[
              styles.filtroBtn, 
              { backgroundColor: colors.bgSecondary },
              filtro === tipo && { backgroundColor: colors.primary }
            ]}
            onPress={() => setFiltro(tipo)}
          >
            <Text style={[
              styles.filtroText, 
              { color: colors.textSecondary },
              filtro === tipo && styles.filtroTextoActivo
            ]}>
              {tipo === 'todos' ? 'Todos' : tipo + 's'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista */}
      <FlatList
        data={registrosAgrupados}
        keyExtractor={(item) => item.fecha}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="inbox" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {isRefreshing ? 'Cargando...' : 'No hay registros'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// Helpers
function agruparPorFecha(registros: RegistroAcceso[]): { fecha: string; registros: RegistroAcceso[] }[] {
  if (!registros || !Array.isArray(registros)) return [];
  
  const grupos: Record<string, RegistroAcceso[]> = {};
  
  registros.forEach((registro) => {
    if (!registro || !registro.fecha) return;
    if (!grupos[registro.fecha]) {
      grupos[registro.fecha] = [];
    }
    grupos[registro.fecha].push(registro);
  });
  
  return Object.entries(grupos)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([fecha, registros]) => ({
      fecha,
      registros: registros.sort((a, b) => (b.hora || '').localeCompare(a.hora || '')),
    }));
}

function formatearFecha(fechaStr: string): string {
  if (!fechaStr) return 'Fecha desconocida';
  
  try {
    const [year, month, day] = fechaStr.split('-').map(Number);
    const fecha = new Date(year, month - 1, day);
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    if (fecha.toDateString() === hoy.toDateString()) return 'Hoy';
    if (fecha.toDateString() === ayer.toDateString()) return 'Ayer';

    return fecha.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return fechaStr;
  }
}

function getModoLabel(modo: string): string {
  const modos: Record<string, string> = {
    facial: 'Facial',
    qr: 'QR',
    barcode: 'Barras',
    manual: 'Manual',
  };
  return modos[modo] || modo || 'Desconocido';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
  },
  filtros: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filtroBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  filtroText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filtroTextoActivo: {
    color: 'white',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  dayGroup: {
    marginBottom: 24,
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  registroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconIngreso: {
    backgroundColor: '#10b981',
  },
  iconSalida: {
    backgroundColor: '#ef4444',
  },
  registroInfo: {
    flex: 1,
  },
  registroTipo: {
    fontSize: 16,
    fontWeight: '600',
  },
  registroModo: {
    fontSize: 12,
  },
  registroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  origenBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.5)',
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
  },
  origenBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#22d3ee',
  },
  registroHora: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});
