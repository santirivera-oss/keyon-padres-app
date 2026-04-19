// ==========================================
// 📅 PANTALLA DE ASISTENCIA - Con tema dinámico
// ==========================================
// Ubicación: app/(tabs)/asistencia.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useStore } from '../../store/useStore';
import { useTheme, Theme } from '../../context/ThemeContext';
import Card from '../../components/ui/Card';
import attendanceService from '../../services/attendance';

// ==========================================
// 📅 COMPONENTE: CALENDARIO
// ==========================================

function CalendarioMes({ 
  año, 
  mes, 
  registros, 
  colors 
}: { 
  año: number; 
  mes: number; 
  registros: Map<string, any>; 
  colors: any;
}) {
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  const primerDia = new Date(año, mes, 1);
  const ultimoDia = new Date(año, mes + 1, 0);
  const diasEnMes = ultimoDia.getDate();
  const primerDiaSemana = primerDia.getDay();
  
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0); // Normalizar a inicio del día
  
  const esHoy = (dia: number) => 
    hoy.getDate() === dia && hoy.getMonth() === mes && hoy.getFullYear() === año;

  const esFinDeSemana = (dia: number) => {
    const fecha = new Date(año, mes, dia);
    const diaSemana = fecha.getDay();
    return diaSemana === 0 || diaSemana === 6; // Domingo o Sábado
  };

  const esFuturo = (dia: number) => {
    const fecha = new Date(año, mes, dia);
    fecha.setHours(0, 0, 0, 0);
    return fecha > hoy;
  };

  const obtenerEstadoDia = (dia: number) => {
    const finDeSemana = esFinDeSemana(dia);
    const futuro = esFuturo(dia);
    
    // Fines de semana no tienen estado
    if (finDeSemana) return 'findesemana';
    
    // Días futuros no tienen estado
    if (futuro) return 'futuro';
    
    const fecha = `${año}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const registro = registros.get(fecha);
    
    // Si hay registro, evaluar estado
    if (registro) {
      if (registro.retardo) return 'retardo';
      if (registro.asistencia) return 'asistencia';
    }
    
    // Si es día laboral pasado SIN registro = FALTA
    return 'falta';
  };

  const getEstadoColor = (estado: string | null) => {
    switch (estado) {
      case 'asistencia': return colors.success;
      case 'falta': return colors.danger;
      case 'retardo': return colors.warning;
      case 'findesemana': return colors.bgSecondary || 'rgba(148, 163, 184, 0.15)';
      case 'futuro': return 'transparent';
      default: return 'transparent';
    }
  };

  const dias = [];
  
  // Espacios vacíos antes del primer día
  for (let i = 0; i < primerDiaSemana; i++) {
    dias.push(<View key={`empty-${i}`} style={styles.diaVacio} />);
  }
  
  // Días del mes
  for (let dia = 1; dia <= diasEnMes; dia++) {
    const estado = obtenerEstadoDia(dia);
    const estadoColor = getEstadoColor(estado);
    const esHoyDia = esHoy(dia);
    const esEstadoConColor = estado === 'asistencia' || estado === 'retardo' || estado === 'falta';
    
    dias.push(
      <View key={dia} style={styles.diaContainer}>
        <View
          style={[
            styles.dia,
            // Aplicar color de fondo según estado
            { backgroundColor: estadoColor },
            // Borde para hoy
            esHoyDia && [styles.diaHoy, { borderColor: colors.primary }],
          ]}
        >
          <Text
            style={[
              styles.diaTexto,
              { color: colors.textPrimary },
              // Texto tenue para fines de semana
              estado === 'findesemana' && { color: colors.textMuted, opacity: 0.6 },
              // Texto tenue para días futuros
              estado === 'futuro' && { color: colors.textMuted, opacity: 0.5 },
              // Texto blanco si tiene estado con color
              esEstadoConColor && styles.diaTextoConEstado,
              // Estilo especial para hoy
              esHoyDia && !esEstadoConColor && { color: colors.primary, fontWeight: Theme.fontWeight.bold },
            ]}
          >
            {dia}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      {/* Header días de la semana */}
      <View style={styles.diasSemanaContainer}>
        {diasSemana.map((dia) => (
          <View key={dia} style={styles.diaSemanaContainer}>
            <Text style={[styles.diaSemanaTexto, { color: colors.textMuted }]}>{dia}</Text>
          </View>
        ))}
      </View>
      
      {/* Grid de días */}
      <View style={styles.diasGrid}>
        {dias}
      </View>
    </View>
  );
}

// ==========================================
// 📋 COMPONENTE: LISTA DE REGISTROS
// ==========================================

function ListaRegistros({ registros, colors }: { registros: any[]; colors: any }) {
  if (registros.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Feather name="calendar" size={48} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Sin registros este mes</Text>
      </View>
    );
  }

  return (
    <View style={styles.listaContainer}>
      {registros.slice(0, 10).map((registro, index) => {
        const getIcon = () => {
          if (registro.falta) return { name: 'x-circle', color: colors.danger };
          if (registro.retardo) return { name: 'clock', color: colors.warning };
          return { name: 'check-circle', color: colors.success };
        };
        
        const icon = getIcon();
        
        return (
          <View 
            key={index} 
            style={[
              styles.registroItem, 
              { borderBottomColor: colors.border },
              index === registros.length - 1 && { borderBottomWidth: 0 }
            ]}
          >
            <View style={[styles.registroIcon, { backgroundColor: icon.color + '20' }]}>
              <Feather name={icon.name as any} size={20} color={icon.color} />
            </View>
            <View style={styles.registroContent}>
              <Text style={[styles.registroFecha, { color: colors.textPrimary }]}>
                {formatearFecha(registro.fecha)}
              </Text>
              <Text style={[styles.registroHora, { color: colors.textMuted }]}>
                {registro.retardo ? `Retardo: ${registro.hora}` : 
                 registro.falta ? 'Falta' : 
                 `Ingreso: ${registro.hora || '--:--'}`}
              </Text>
            </View>
            {registro.modo && (
              <View style={[styles.modoBadge, { backgroundColor: colors.bgSecondary }]}>
                <Text style={[styles.modoText, { color: colors.textMuted }]}>
                  {getModoIcon(registro.modo)}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ==========================================
// 📅 PANTALLA PRINCIPAL
// ==========================================

export default function AsistenciaScreen() {
  const { colors } = useTheme();
  const { alumno, isRefreshing, setRefreshing } = useStore();
  const [mesActual, setMesActual] = useState(new Date());
  const [registros, setRegistros] = useState<Map<string, any>>(new Map());
  const [listaRegistros, setListaRegistros] = useState<any[]>([]);

  // Función para determinar si es retardo según turno
  const esRetardo = (hora: string, turno: string = 'Matutino'): boolean => {
    const [h, m] = hora.split(':').map(Number);
    
    // Tolerancias por turno
    const tolerancias: Record<string, string> = {
      matutino: '07:15',
      vespertino: '13:25',
    };
    
    const turnoKey = turno.toLowerCase().includes('vespertino') ? 'vespertino' : 'matutino';
    const tolerancia = tolerancias[turnoKey];
    const [limiteH, limiteM] = tolerancia.split(':').map(Number);
    
    return h > limiteH || (h === limiteH && m > limiteM);
  };

  const cargarRegistros = async () => {
    if (!alumno) return;
    
    const año = mesActual.getFullYear();
    const mes = mesActual.getMonth();
    // CORREGIDO: Usar control en lugar de id
    const identificador = alumno.control || alumno.id;
    const turno = alumno.turno || 'Matutino';
    
    try {
      const data = await attendanceService.obtenerRegistrosMes(identificador, año, mes + 1);
      
      // Agrupar registros por fecha y calcular estado
      const registrosPorFecha: Record<string, any[]> = {};
      data.forEach((reg: any) => {
        if (!registrosPorFecha[reg.fecha]) {
          registrosPorFecha[reg.fecha] = [];
        }
        registrosPorFecha[reg.fecha].push(reg);
      });
      
      const mapa = new Map();
      const lista: any[] = [];
      
      Object.entries(registrosPorFecha).forEach(([fecha, regs]) => {
        // Encontrar primer ingreso del día
        const ingresos = regs.filter(r => r.tipoRegistro === 'Ingreso');
        const primerIngreso = ingresos.sort((a, b) => a.hora.localeCompare(b.hora))[0];
        
        const estadoDia = {
          fecha,
          asistencia: ingresos.length > 0,
          falta: ingresos.length === 0,
          retardo: primerIngreso ? esRetardo(primerIngreso.hora, turno) : false,
          hora: primerIngreso?.hora || null,
          modo: primerIngreso?.modo || null,
          registros: regs,
        };
        
        mapa.set(fecha, estadoDia);
        lista.push(estadoDia);
      });
      
      setRegistros(mapa);
      setListaRegistros(lista.sort((a, b) => b.fecha.localeCompare(a.fecha)));
    } catch (error) {
      console.log('Error cargando registros:', error);
    }
  };

  useEffect(() => {
    cargarRegistros();
  }, [alumno, mesActual]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargarRegistros();
    setRefreshing(false);
  }, [alumno, mesActual]);

  const cambiarMes = (direccion: number) => {
    setMesActual(prev => {
      const nuevo = new Date(prev);
      nuevo.setMonth(prev.getMonth() + direccion);
      return nuevo;
    });
  };

  const nombreMes = mesActual.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

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
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Asistencia</Text>
        </View>

        {/* Navegación de mes */}
        <Card colors={colors}>
          <View style={styles.mesNavegacion}>
            <TouchableOpacity 
              onPress={() => cambiarMes(-1)}
              style={[styles.mesBtn, { backgroundColor: colors.bgSecondary }]}
            >
              <Feather name="chevron-left" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            
            <Text style={[styles.mesTexto, { color: colors.textPrimary }]}>{nombreMes}</Text>
            
            <TouchableOpacity 
              onPress={() => cambiarMes(1)}
              style={[styles.mesBtn, { backgroundColor: colors.bgSecondary }]}
            >
              <Feather name="chevron-right" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Calendario */}
          <CalendarioMes
            año={mesActual.getFullYear()}
            mes={mesActual.getMonth()}
            registros={registros}
            colors={colors}
          />

          {/* Leyenda */}
          <View style={styles.leyenda}>
            <View style={styles.leyendaItem}>
              <View style={[styles.leyendaDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.leyendaTexto, { color: colors.textMuted }]}>Asistencia</Text>
            </View>
            <View style={styles.leyendaItem}>
              <View style={[styles.leyendaDot, { backgroundColor: colors.warning }]} />
              <Text style={[styles.leyendaTexto, { color: colors.textMuted }]}>Retardo</Text>
            </View>
            <View style={styles.leyendaItem}>
              <View style={[styles.leyendaDot, { backgroundColor: colors.danger }]} />
              <Text style={[styles.leyendaTexto, { color: colors.textMuted }]}>Falta</Text>
            </View>
            <View style={styles.leyendaItem}>
              <View style={[styles.leyendaDot, { backgroundColor: colors.bgSecondary || 'rgba(148, 163, 184, 0.3)' }]} />
              <Text style={[styles.leyendaTexto, { color: colors.textMuted }]}>Fin de semana</Text>
            </View>
          </View>
        </Card>

        {/* Lista de registros */}
        <Card colors={colors} style={{ marginTop: Theme.spacing.lg }}>
          <View style={styles.cardHeader}>
            <Feather name="list" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Historial del Mes</Text>
          </View>
          <ListaRegistros registros={listaRegistros} colors={colors} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helpers
function formatearFecha(fechaStr: string): string {
  const [year, month, day] = fechaStr.split('-').map(Number);
  const fecha = new Date(year, month - 1, day);
  return fecha.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function getModoIcon(modo: string): string {
  const modos: Record<string, string> = {
    facial: '👤',
    qr: '📱',
    barcode: '📊',
    manual: '✋',
  };
  return modos[modo] || '•';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Theme.spacing.md,
    paddingBottom: Theme.spacing.xxl + 60,
  },
  header: {
    marginBottom: Theme.spacing.lg,
  },
  title: {
    fontSize: Theme.fontSize.xxl,
    fontWeight: Theme.fontWeight.bold,
  },
  mesNavegacion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.lg,
  },
  mesBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mesTexto: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.semibold,
    textTransform: 'capitalize',
  },
  diasSemanaContainer: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.sm,
  },
  diaSemanaContainer: {
    flex: 1,
    alignItems: 'center',
  },
  diaSemanaTexto: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.medium,
  },
  diasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  diaContainer: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
  },
  diaVacio: {
    width: '14.28%',
    aspectRatio: 1,
  },
  dia: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.borderRadius.md,
  },
  diaHoy: {
    borderWidth: 2,
  },
  diaTexto: {
    fontSize: Theme.fontSize.sm,
  },
  diaTextoConEstado: {
    color: 'white',
    fontWeight: Theme.fontWeight.semibold,
  },
  leyenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.1)',
  },
  leyendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  leyendaDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  leyendaTexto: {
    fontSize: Theme.fontSize.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  cardTitle: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.semibold,
  },
  emptyState: {
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  emptyText: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.fontSize.md,
  },
  listaContainer: {},
  registroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
  },
  registroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
  },
  registroContent: {
    flex: 1,
  },
  registroFecha: {
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.medium,
    textTransform: 'capitalize',
  },
  registroHora: {
    fontSize: Theme.fontSize.sm,
  },
  modoBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
  },
  modoText: {
    fontSize: Theme.fontSize.sm,
  },
});
