import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { useMisDenuncias } from '../hooks/useDenuncias';
import { useCasosLocales, casoLocalADenuncia } from '../hooks/useCasosLocales';
import type { MainTabParamList, MainStackParamList, EstadoCaso, NivelRiesgo, Denuncia } from '../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'MyReports'>,
  NativeStackScreenProps<MainStackParamList>
>;

type Filtro = 'todas' | 'activas' | 'cerradas';

// ─── Configuración de estados ─────────────────────────────────────────────────

const ESTADO_CONFIG: Record<EstadoCaso, { label: string; icono: string }> = {
  nueva:                  { label: 'Nueva',               icono: 'radio-button-on-outline'       },
  asignada:               { label: 'Asignada',             icono: 'person-outline'                },
  en_seguimiento:         { label: 'En seguimiento',       icono: 'sync-outline'                  },
  derivada:               { label: 'Derivada',             icono: 'arrow-forward-circle-outline'  },
  pendiente_confirmacion: { label: 'Pend. confirmación',   icono: 'hourglass-outline'             },
  cerrada:                { label: 'Cerrada',              icono: 'checkmark-done-circle-outline' },
};

const ESTADO_COLOR = (estado: EstadoCaso, colors: ReturnType<typeof useTheme>['colors']): string => {
  const map: Record<EstadoCaso, string> = {
    nueva:                  colors.primary,
    asignada:               colors.warning,
    en_seguimiento:         colors.warning,
    derivada:               colors.success,
    pendiente_confirmacion: colors.warning,
    cerrada:                colors.textDisabled,
  };
  return map[estado];
};

const RIESGO_CONFIG: Record<NivelRiesgo, { label: string; color: string }> = {
  urgente:  { label: 'URGENTE',  color: '#D32F2F' },
  alto:     { label: 'ALTO',     color: '#C2410C' },
  medio:    { label: 'MEDIO',    color: '#D97706' },
  bajo:     { label: 'BAJO',     color: '#15803D' },
  moderado: { label: 'MODERADO', color: '#0369A1' },
};

const ESTADOS_ACTIVOS: EstadoCaso[] = ['nueva', 'asignada', 'en_seguimiento', 'derivada', 'pendiente_confirmacion'];

// ─── Tarjeta de caso ──────────────────────────────────────────────────────────

function CasoCard({
  denuncia,
  colors,
  onPress,
}: {
  denuncia: Denuncia;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
}) {
  const estadoColor  = ESTADO_COLOR(denuncia.estado, colors);
  const estadoConfig = ESTADO_CONFIG[denuncia.estado];
  const riesgoConfig = RIESGO_CONFIG[denuncia.nivel_riesgo];

  const fecha = new Date(denuncia.fecha_denuncia).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Indicador de riesgo (borde izquierdo de color) */}
      <View style={[styles.cardRisk, { backgroundColor: riesgoConfig.color }]} />

      <View style={styles.cardBody}>
        {/* Fila superior: tipo + badge urgente */}
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardTipo, { color: colors.text }]} numberOfLines={1}>
            {denuncia.tipos_violencia?.join(', ') ?? denuncia.tipo_violencia}
          </Text>
          {denuncia.hay_heridos && (
            <View style={[styles.urgenteBadge, { backgroundColor: '#D32F2F' }]}>
              <Ionicons name="medical-outline" size={10} color="#fff" />
              <Text style={styles.urgenteText}>Heridos</Text>
            </View>
          )}
        </View>

        {/* Fila media: estado + fecha */}
        <View style={styles.cardMidRow}>
          <View style={[styles.estadoBadge, { backgroundColor: estadoColor + '20' }]}>
            <Ionicons name={estadoConfig.icono as any} size={12} color={estadoColor} />
            <Text style={[styles.estadoText, { color: estadoColor }]}>{estadoConfig.label}</Text>
          </View>
          <Text style={[styles.cardFecha, { color: colors.textDisabled }]}>{fecha}</Text>
        </View>

        {/* Nivel de riesgo */}
        <View style={styles.cardBottomRow}>
          <View style={[styles.riesgoBadge, { backgroundColor: riesgoConfig.color + '15' }]}>
            <Text style={[styles.riesgoText, { color: riesgoConfig.color }]}>
              Riesgo {riesgoConfig.label}
            </Text>
          </View>
          {denuncia.es_anonima && (
            <View style={[styles.anonimaBadge, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="eye-off-outline" size={11} color={colors.textSecondary} />
              <Text style={[styles.anonimaText, { color: colors.textSecondary }]}>Anónima</Text>
            </View>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} style={styles.cardChevron} />
    </TouchableOpacity>
  );
}

// ─── Skeleton de carga ────────────────────────────────────────────────────────

function CasoSkeleton({ colors }: { colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={[styles.card, styles.skeletonCard, { backgroundColor: colors.surface }]}>
      <View style={[styles.cardRisk, { backgroundColor: colors.border }]} />
      <View style={styles.cardBody}>
        <View style={[styles.skeletonLine, { backgroundColor: colors.surfaceVariant, width: '50%', height: 16, marginBottom: 10 }]} />
        <View style={[styles.skeletonLine, { backgroundColor: colors.surfaceVariant, width: '35%', height: 12, marginBottom: 8 }]} />
        <View style={[styles.skeletonLine, { backgroundColor: colors.surfaceVariant, width: '25%', height: 12 }]} />
      </View>
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function MyReportsScreen({ navigation }: Props) {
  const { colors }    = useTheme();
  const { usuario }   = useAuth();
  const insets        = useSafeAreaInsets();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [refreshing, setRefreshing] = useState(false);

  const { data: apiData, isLoading: apiLoading, isError: apiError, refetch } = useMisDenuncias(1, !!usuario);
  const { casosComoDenuncia, isLoading: localLoading, refetch: refetchLocal } = useCasosLocales();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refetch(), refetchLocal()]);
    setRefreshing(false);
  }, [refetch, refetchLocal]);

  // Prioridad: datos del servidor cuando están disponibles,
  // datos locales como fallback inmediato (funciona sin conexión)
  const denuncias: Denuncia[] = apiData?.data ?? casosComoDenuncia;
  const isLoading = apiData === undefined && localLoading;
  // Solo mostramos error si tampoco hay datos locales
  const isError   = apiError && casosComoDenuncia.length === 0;

  const denunciasFiltradas = denuncias.filter((d) => {
    if (filtro === 'activas')  return ESTADOS_ACTIVOS.includes(d.estado);
    if (filtro === 'cerradas') return d.estado === 'cerrada';
    return true;
  });

  const contadores = {
    todas:    denuncias.length,
    activas:  denuncias.filter((d) => ESTADOS_ACTIVOS.includes(d.estado)).length,
    cerradas: denuncias.filter((d) => d.estado === 'cerrada').length,
  };

  // ── Estado vacío ─────────────────────────────────────────────────────────

  const renderVacio = () => {
    const config: Record<Filtro, { icono: string; titulo: string; desc: string }> = {
      todas:    { icono: 'folder-open-outline',   titulo: 'Sin denuncias aún',    desc: 'Cuando envíes una denuncia, aparecerá aquí.' },
      activas:  { icono: 'shield-checkmark-outline', titulo: 'Sin casos activos', desc: 'No tienes casos en proceso actualmente.' },
      cerradas: { icono: 'checkmark-done-circle-outline', titulo: 'Sin casos cerrados', desc: 'Los casos resueltos aparecerán aquí.' },
    };
    const { icono, titulo, desc } = config[filtro];
    return (
      <View style={[styles.emptyBox, { backgroundColor: colors.surface }]}>
        <Ionicons name={icono as any} size={40} color={colors.primary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{titulo}</Text>
        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>{desc}</Text>
      </View>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Encabezado */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTexts}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Mis casos</Text>
          {denuncias.length > 0 && (
            <View style={[styles.totalBadge, { backgroundColor: colors.primarySubtle }]}>
              <Text style={[styles.totalText, { color: colors.primary }]}>{denuncias.length}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
          Sigue el estado de tus denuncias
        </Text>

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosScroll} contentContainerStyle={styles.filtrosContainer}>
          {(['todas', 'activas', 'cerradas'] as Filtro[]).map((f) => {
            const activo = filtro === f;
            const label  = f.charAt(0).toUpperCase() + f.slice(1);
            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filtroChip,
                  {
                    backgroundColor: activo ? colors.primary : colors.surface,
                    borderColor:     activo ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setFiltro(f)}
              >
                <Text style={[styles.filtroText, { color: activo ? colors.textOnPrimary : colors.textSecondary }, activo && styles.filtroTextActive]}>
                  {label}
                </Text>
                <View style={[styles.filtroBadge, { backgroundColor: activo ? 'rgba(255,255,255,0.25)' : colors.surfaceVariant }]}>
                  <Text style={[styles.filtroBadgeText, { color: activo ? colors.textOnPrimary : colors.textSecondary }]}>
                    {contadores[f]}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Banner de datos locales cuando la API no está disponible */}
      {apiError && casosComoDenuncia.length > 0 && (
        <View style={[styles.offlineBanner, { backgroundColor: colors.warningLight }]}>
          <Ionicons name="cloud-offline-outline" size={14} color={colors.warning} />
          <Text style={[styles.offlineBannerText, { color: colors.warningText }]}>
            Sin conexión — mostrando casos guardados localmente
          </Text>
        </View>
      )}

      {/* Lista */}
      {isLoading ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {[1, 2, 3].map((i) => <CasoSkeleton key={i} colors={colors} />)}
        </ScrollView>
      ) : isError ? (
        <View style={styles.errorBox}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textDisabled} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Sin conexión. Revisa tu internet e inténtalo de nuevo.
          </Text>
          <TouchableOpacity style={[styles.retryCTA, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
            <Text style={[styles.retryCTAText, { color: colors.textOnPrimary }]}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={denunciasFiltradas}
          keyExtractor={(d) => d.id}
          renderItem={({ item }) => (
            <CasoCard
              denuncia={item}
              colors={colors}
              onPress={() => navigation.navigate('ReporteDetalle', { id: item.id })}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            denunciasFiltradas.length === 0 && styles.listContentEmpty,
            { paddingBottom: insets.bottom + 40 },
          ]}
          ListEmptyComponent={renderVacio}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTexts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  pageTitle:    { fontFamily: 'Montserrat-ExtraBold', fontSize: 26 },
  pageSubtitle: { fontFamily: 'Inter-Regular', fontSize: 13, marginBottom: 16 },
  totalBadge:   { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  totalText:    { fontFamily: 'Montserrat-ExtraBold', fontSize: 14 },

  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  offlineBannerText: { fontFamily: 'Inter-Regular', fontSize: 12 },

  filtrosScroll:    { marginBottom: 4 },
  filtrosContainer: { gap: 8, paddingRight: 4 },
  filtroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filtroText:       { fontFamily: 'Inter-Regular', fontSize: 13 },
  filtroTextActive: { fontFamily: 'Montserrat-ExtraBold' },
  filtroBadge:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, minWidth: 22, alignItems: 'center' },
  filtroBadgeText:  { fontFamily: 'Montserrat-ExtraBold', fontSize: 11 },

  listContent:      { paddingHorizontal: 20, paddingTop: 12 },
  listContentEmpty: { flex: 1 },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardRisk:    { width: 4 },
  cardBody:    { flex: 1, padding: 14, gap: 6 },
  cardTopRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardMidRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTipo:    { fontFamily: 'Montserrat-ExtraBold', fontSize: 15, flex: 1 },
  cardFecha:   { fontFamily: 'Inter-Regular', fontSize: 11, marginLeft: 'auto' },
  cardChevron: { alignSelf: 'center', marginRight: 12 },

  urgenteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgenteText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 10, color: '#FFFFFF' },

  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  estadoText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 11 },

  riesgoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  riesgoText:  { fontFamily: 'Montserrat-ExtraBold', fontSize: 10 },

  anonimaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  anonimaText: { fontFamily: 'Inter-Regular', fontSize: 10 },

  // Skeleton
  skeletonCard: { minHeight: 90 },
  skeletonLine: { borderRadius: 6 },

  // Vacío / Error
  emptyBox: {
    flex: 1,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  emptyTitle: { fontFamily: 'Montserrat-ExtraBold', fontSize: 16, marginTop: 4 },
  emptyDesc:  { fontFamily: 'Inter-Regular', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorText:    { fontFamily: 'Inter-Regular', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  retryCTA:     { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryCTAText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 14 },
});
