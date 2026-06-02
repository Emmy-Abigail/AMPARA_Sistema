import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../theme';
import { useMisReportes } from '../hooks/useReportes';
import type { MainTabParamList, MainStackParamList, Reporte, EstadoReporte } from '../types';

// ─── Tipos y constantes ───────────────────────────────────────────────────────

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'MyReports'>,
  NativeStackScreenProps<MainStackParamList>
>;

type Filtro = 'Todos' | EstadoReporte;

const FILTROS: { label: string; value: Filtro }[] = [
  { label: 'Todos',       value: 'Todos' },
  { label: 'Enviado',     value: 'enviado' },
  { label: 'En revisión', value: 'en_revision' },
  { label: 'Resuelto',    value: 'resuelto' },
  { label: 'Rechazado',   value: 'rechazado' },
];

const ESTADO_CONFIG: Record<EstadoReporte, { label: string; icono: string }> = {
  enviado:     { label: 'Enviado',     icono: 'time-outline' },
  en_revision: { label: 'En revisión', icono: 'search-outline' },
  resuelto:    { label: 'Resuelto',    icono: 'checkmark-done-circle-outline' },
  rechazado:   { label: 'Rechazado',   icono: 'close-circle-outline' },
};

// ─── Componente de tarjeta ────────────────────────────────────────────────────

interface ReporteCardProps {
  reporte: Reporte;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
}

function ReporteCard({ reporte, colors, onPress }: ReporteCardProps) {
  const estadoColors: Record<EstadoReporte, string> = {
    enviado:     colors.primary,
    en_revision: colors.warning,
    resuelto:    colors.success,
    rechazado:   colors.error,
  };

  const config = ESTADO_CONFIG[reporte.estado];
  const color  = estadoColors[reporte.estado];
  const fecha  = new Date(reporte.fecha_reporte).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Ícono de estado */}
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        <Ionicons name={config.icono as any} size={22} color={color} />
      </View>

      {/* Contenido */}
      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <Text
            style={[styles.cardTitulo, { color: colors.text }]}
            numberOfLines={1}
          >
            {reporte.tipo_lugar} · {reporte.tipo_objeto}
          </Text>
          <View style={[styles.estadoBadge, { backgroundColor: color }]}>
            <Text style={styles.estadoText}>{config.label}</Text>
          </View>
        </View>
        <Text style={[styles.cardCoordenadas, { color: colors.textSecondary }]}>
          📍 {reporte.latitud.toFixed(4)}, {reporte.longitud.toFixed(4)}
        </Text>
        <Text style={[styles.cardFecha, { color: colors.textDisabled }]}>
          {fecha}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
    </TouchableOpacity>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function MyReportsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch, isRefetching } = useMisReportes();
  const [filtroActivo, setFiltroActivo] = useState<Filtro>('Todos');

  const reportes = data?.data ?? [];

  const reportesFiltrados = filtroActivo === 'Todos'
    ? reportes
    : reportes.filter((r) => r.estado === filtroActivo);

  const total      = reportes.length;
  const resueltos  = reportes.filter((r) => r.estado === 'resuelto').length;
  const enRevision = reportes.filter((r) => r.estado === 'en_revision').length;
  const enviados   = reportes.filter((r) => r.estado === 'enviado').length;

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textDisabled} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          No se pudieron cargar tus reportes.{'\n'}Verifica tu conexión o vuelve a iniciar sesión.
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          onPress={() => refetch()}
        >
          <Text style={[styles.retryText, { color: colors.textOnPrimary }]}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Stats header */}
      <View style={[styles.statsRow, { backgroundColor: colors.primary, paddingTop: insets.top + 16 }]}>
        {[
          { num: total,      label: 'Total',       color: colors.textOnPrimary },
          { num: resueltos,  label: 'Resueltos',   color: colors.successText },
          { num: enRevision, label: 'En revisión', color: colors.warningText },
          { num: enviados,   label: 'Enviados',    color: colors.textOnPrimary },
        ].map(({ num, label, color }) => (
          <View key={label} style={styles.statBox}>
            <Text style={[styles.statNum, { color }]}>{num}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtroScroll}
        contentContainerStyle={styles.filtroContainer}
      >
        {FILTROS.map(({ label, value }) => {
          const activo = filtroActivo === value;
          return (
            <TouchableOpacity
              key={value}
              style={[
                styles.filtroChip,
                {
                  backgroundColor: activo ? colors.primary : colors.surface,
                  borderColor: activo ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFiltroActivo(value)}
            >
              <Text
                style={[
                  styles.filtroText,
                  { color: activo ? colors.textOnPrimary : colors.textSecondary },
                  activo && styles.filtroTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Lista */}
      <FlatList
        data={reportesFiltrados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={refetch}
        renderItem={({ item }) => (
          <ReporteCard
            reporte={item}
            colors={colors}
            onPress={() => navigation.navigate('ReporteDetalle', { id: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="document-outline" size={48} color={colors.textDisabled} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filtroActivo === 'Todos'
                ? 'Aún no has enviado reportes.'
                : 'No hay reportes en esta categoría.'}
            </Text>
            {filtroActivo === 'Todos' && (
              <TouchableOpacity onPress={() => navigation.navigate('Report')}>
                <Text style={[styles.emptyLink, { color: colors.primary }]}>
                  Crear primer reporte
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingVertical: 10,
  },
  statNum: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 22,
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  filtroScroll: {
    maxHeight: 56,
    marginVertical: 12,
  },
  filtroContainer: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  filtroChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filtroText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  filtroTextActive: {
    fontFamily: 'Montserrat-ExtraBold',
  },
  lista: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitulo: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 13,
    flex: 1,
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  estadoText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  cardCoordenadas: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
  cardFecha: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  emptyLink: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14,
  },
});
