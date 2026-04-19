// ==========================================
// STATUS CARD — flat, accent bar lateral
// ==========================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Theme } from '../../context/ThemeContext';
import { Colors } from '../../constants/Colors';
import { EstadoAlumno, Alumno } from '../../types';

interface StatusCardProps {
  alumno: Alumno;
  estado: EstadoAlumno | null;
  colors?: any;
}

export default function StatusCard({ alumno, estado, colors }: StatusCardProps) {
  const dentroDelPlantel = estado?.dentroDelPlantel ?? false;

  const accentColor = dentroDelPlantel
    ? (colors?.success || Colors.success)
    : (colors?.textMuted || Colors.textMuted);

  const statusText = dentroDelPlantel ? 'Dentro del plantel' : 'Fuera del plantel';
  const statusIcon = dentroDelPlantel ? 'check-circle' : 'x-circle';

  const bgCard = colors?.bgCard || Colors.bgCard;
  const border = colors?.border || Colors.border;
  const textMain = colors?.textPrimary || Colors.textPrimary;
  const textSecondary = colors?.textSecondary || Colors.textSecondary;
  const textMuted = colors?.textMuted || Colors.textMuted;

  return (
    <View style={[styles.container, { backgroundColor: bgCard, borderColor: border }]}>
      {/* Accent bar izquierda */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.content}>
        {/* Estado principal */}
        <View style={styles.statusRow}>
          <View style={[styles.iconContainer, { borderColor: accentColor }]}>
            <Feather name={statusIcon} size={22} color={accentColor} />
          </View>
          <View style={styles.statusText}>
            <Text style={[styles.statusLabel, { color: textMuted }]}>Estado actual</Text>
            <Text style={[styles.statusValue, { color: textMain }]}>{statusText}</Text>
          </View>
        </View>

        {/* Info del alumno */}
        <View style={styles.alumnoInfo}>
          <Text style={[styles.alumnoNombre, { color: textMain }]}>
            {alumno.nombre} {alumno.apellidos}
          </Text>
          <Text style={[styles.alumnoGrupo, { color: textSecondary }]}>
            {alumno.grado}° {alumno.grupo} · {alumno.turno}
          </Text>
        </View>

        {/* Detalles */}
        {estado?.ultimoRegistro && (
          <View style={styles.detalles}>
            <View style={[styles.detalleItem, { borderColor: border }]}>
              <Feather name="clock" size={12} color={textMuted} />
              <Text style={[styles.detalleText, { color: textSecondary }]}>
                {estado.ultimoRegistro.tipoRegistro} a las {estado.ultimoRegistro.hora.slice(0, 5)}
              </Text>
            </View>

            {dentroDelPlantel && estado.tiempoEnEscuela && (
              <View style={[styles.detalleItem, { borderColor: border }]}>
                <Feather name="clock" size={12} color={textMuted} />
                <Text style={[styles.detalleText, { color: textSecondary }]}>
                  {estado.tiempoEnEscuela.texto} en la escuela
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  content: {
    paddingLeft: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
  },
  statusText: {
    flex: 1,
  },
  statusLabel: {
    fontSize: Theme.fontSize.xs,
    marginBottom: 2,
  },
  statusValue: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.semibold,
  },
  alumnoInfo: {
    marginBottom: Theme.spacing.md,
  },
  alumnoNombre: {
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.semibold,
    marginBottom: 2,
  },
  alumnoGrupo: {
    fontSize: Theme.fontSize.sm,
  },
  detalles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detalleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
  },
  detalleText: {
    fontSize: Theme.fontSize.xs,
  },
});
