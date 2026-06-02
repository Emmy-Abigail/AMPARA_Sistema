// HomeScreen

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { useMisReportes, useAlertasZona } from '../hooks/useReportes';
import type { AppColors } from '../theme';
import type { MainTabParamList, MainStackParamList, NivelAlerta, AlertaZona } from '../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<MainStackParamList>
>;

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  value: number | string;
  label: string;
  colors: AppColors;
}

function KpiCard({ value, label, colors }: KpiCardProps) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.kpiNumber, { color: colors.primary }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

// ─── Skeleton de carga ────────────────────────────────────────────────────────

function AlertaSkeleton({ colors }: { colors: AppColors }) {
  return (
    <View style={[styles.alertCard, { backgroundColor: colors.surface }]}>
      <View style={[styles.skeletonBadge, { backgroundColor: colors.surfaceVariant }]} />
      <View style={styles.alertContent}>
        <View style={[styles.skeletonLine, { backgroundColor: colors.surfaceVariant, width: '60%' }]} />
        <View style={[styles.skeletonLine, { backgroundColor: colors.surfaceVariant, width: '90%', marginTop: 6 }]} />
      </View>
    </View>
  );
}

// ─── Alerta Card ──────────────────────────────────────────────────────────────

interface AlertaCardProps {
  alerta: AlertaZona;
  colors: AppColors;
}

function AlertaCard({ alerta, colors }: AlertaCardProps) {
  const nivelConfig: Record<NivelAlerta, { bg: string; icono: string }> = {
    Alto:  { bg: colors.error,   icono: 'alert-circle'      },
    Medio: { bg: colors.warning, icono: 'warning'           },
    Bajo:  { bg: colors.success, icono: 'checkmark-circle'  },
  };

  const { bg, icono } = nivelConfig[alerta.nivel];

  return (
    <View
      style={[
        styles.alertCard,
        { backgroundColor: colors.surface },
        alerta.es_mi_zona && { borderLeftWidth: 3, borderLeftColor: colors.primary },
      ]}
    >
      {/* Badge de nivel */}
      <View style={[styles.alertIconBox, { backgroundColor: bg + '20' }]}>
        <Ionicons name={icono as any} size={20} color={bg} />
      </View>

      {/* Contenido */}
      <View style={styles.alertContent}>
        <View style={styles.alertTopRow}>
          <Text style={[styles.alertZona, { color: colors.text }]} numberOfLines={1}>
            {alerta.zona}
          </Text>
          {alerta.es_mi_zona && (
            <View style={[styles.miZonaBadge, { backgroundColor: colors.primarySubtle }]}>
              <Text style={[styles.miZonaText, { color: colors.primary }]}>Mi zona</Text>
            </View>
          )}
        </View>
        <Text style={[styles.alertDesc, { color: colors.textSecondary }]} numberOfLines={2}>
          {alerta.descripcion}
        </Text>
        <View style={styles.alertFooter}>
          <View style={[styles.nivelBadge, { backgroundColor: bg }]}>
            <Text style={styles.nivelText}>{alerta.nivel}</Text>
          </View>
          <Text style={[styles.alertCount, { color: colors.textDisabled }]}>
            {alerta.total_reportes} reporte{alerta.total_reportes !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Pantalla principal ────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { usuario } = useAuth();
  const { data: reportesData, isLoading: loadingReportes } = useMisReportes();
  const {
    data: alertasData,
    isLoading: loadingAlertas,
    isError: errorAlertas,
    refetch: refetchAlertas,
  } = useAlertasZona();
  const insets = useSafeAreaInsets();

  const primerNombre = usuario?.nombre?.split(' ')[0] ?? 'Ciudadano';

  const reportesEnviados  = reportesData?.total ?? 0;
  const reportesEnRevision = reportesData?.data?.filter((r) => r.estado === 'en_revision').length ?? 0;
  const reportesResueltos = reportesData?.data?.filter((r) => r.estado === 'resuelto').length ?? 0;

  const alertas       = alertasData?.alertas ?? [];
  const tieneZona     = alertasData?.tiene_zona ?? false;

  // ── Sección alertas ─────────────────────────────────────────────────────────

  const renderAlertas = () => {
    if (loadingAlertas) {
      return (
        <>
          <AlertaSkeleton colors={colors} />
          <AlertaSkeleton colors={colors} />
          <AlertaSkeleton colors={colors} />
        </>
      );
    }

    if (errorAlertas) {
      return (
        <View style={[styles.emptyBox, { backgroundColor: colors.surface }]}>
          <Ionicons name="cloud-offline-outline" size={32} color={colors.textDisabled} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Sin conexión
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            No se pudieron cargar las alertas.
          </Text>
          <TouchableOpacity
            style={[styles.emptyAction, { backgroundColor: colors.primary }]}
            onPress={() => refetchAlertas()}
          >
            <Text style={[styles.emptyActionText, { color: colors.textOnPrimary }]}>
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (alertas.length === 0) {
      // Usuario sin ubicación configurada
      if (!tieneZona) {
        return (
          <View style={[styles.emptyBox, { backgroundColor: colors.surface }]}>
            <Ionicons name="location-outline" size={32} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Configura tu ubicación
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Agrega tu distrito en tu perfil para ver alertas relevantes de tu zona.
            </Text>
            <TouchableOpacity
              style={[styles.emptyAction, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Perfil')}
            >
              <Text style={[styles.emptyActionText, { color: colors.textOnPrimary }]}>
                Ir a perfil
              </Text>
            </TouchableOpacity>
          </View>
        );
      }

      // Usuario con ubicación pero sin reportes recientes en su zona
      return (
        <View style={[styles.emptyBox, { backgroundColor: colors.surface }]}>
          <Ionicons name="shield-checkmark-outline" size={32} color={colors.success} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Sin alertas activas
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            No se han reportado criaderos en tu zona en los últimos 30 días.
          </Text>
        </View>
      );
    }

    return alertas.map((alerta, idx) => (
      <AlertaCard key={`${alerta.departamento}-${alerta.provincia}-${idx}`} alerta={alerta} colors={colors} />
    ));
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Saludo ── */}
      <View style={styles.saludoRow}>
        <View style={styles.saludoTexts}>
          <Text style={[styles.saludo, { color: colors.text }]}>
            ¡Hola, {primerNombre}! 👋
          </Text>
          <Text style={[styles.saludoSub, { color: colors.textSecondary }]}>
            Gracias por cuidar tu comunidad
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.avatar, { backgroundColor: colors.surfaceVariant, borderColor: colors.primary }]}
          onPress={() => navigation.navigate('Perfil')}
          activeOpacity={0.75}
        >
          <Text style={[styles.avatarInitial, { color: colors.primary }]}>
            {primerNombre.charAt(0).toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Botón reportar ── */}
      <TouchableOpacity
        style={[styles.reportButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('Report')}
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle-outline" size={22} color={colors.textOnPrimary} />
        <Text style={[styles.reportButtonText, { color: colors.textOnPrimary }]}>
          Reportar un criadero ahora
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textOnPrimary} />
      </TouchableOpacity>

      {/* ── KPIs ── */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Tu impacto</Text>
      {loadingReportes ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <View style={styles.kpiRow}>
          <KpiCard value={reportesEnviados}   label="Reportes enviados" colors={colors} />
          <KpiCard value={reportesEnRevision} label="En revisión"        colors={colors} />
          <KpiCard value={reportesResueltos}  label="Resueltos"          colors={colors} />
        </View>
      )}

      {/* ── Alertas ── */}
      <View style={styles.alertasHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Alertas en tu zona</Text>
        {!loadingAlertas && !errorAlertas && alertas.length > 0 && (
          <Text style={[styles.alertasSubtitle, { color: colors.textSecondary }]}>
            Últimos 30 días
          </Text>
        )}
      </View>

      {renderAlertas()}
    </ScrollView>
  );
}

// ─── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Saludo
  saludoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  saludoTexts: { flex: 1 },
  saludo: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 22,
  },
  saludoSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginTop: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginLeft: 12,
  },
  avatarInitial: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 18,
  },

  // Botón reportar
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    marginBottom: 28,
    gap: 10,
  },
  reportButtonText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14,
    flex: 1,
  },

  // Secciones
  sectionTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 16,
    marginBottom: 12,
  },
  loader: {
    marginBottom: 28,
    alignSelf: 'flex-start',
  },
  alertasHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  alertasSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginBottom: 12,
  },

  // KPIs
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiNumber: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 26,
  },
  kpiLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },

  // Skeleton
  skeletonBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginRight: 12,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },

  // Alertas
  alertCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  alertIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  alertContent: { flex: 1, gap: 4 },
  alertTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  alertZona: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 13,
    flex: 1,
  },
  miZonaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miZonaText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 10,
  },
  alertDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  nivelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  nivelText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  alertCount: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
  },

  // Estados vacíos / error
  emptyBox: {
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14,
    marginTop: 4,
  },
  emptyDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyAction: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyActionText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 13,
  },
});
