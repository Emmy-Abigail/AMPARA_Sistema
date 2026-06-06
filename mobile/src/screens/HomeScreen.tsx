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
import { useMisDenuncias } from '../hooks/useDenuncias';
import { useCasosLocales } from '../hooks/useCasosLocales';
import type { AppColors } from '../theme';
import type { MainTabParamList, MainStackParamList, EstadoCaso, Denuncia, MensajeCaso } from '../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<MainStackParamList>
>;

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ value, label, colors }: { value: number | string; label: string; colors: AppColors }) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.kpiNumber, { color: colors.primary }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

// ─── Tarjeta de caso reciente ─────────────────────────────────────────────────

function CasoCard({ caso, colors, onPress }: { caso: Denuncia; colors: AppColors; onPress: () => void }) {
  const estadoConfig: Record<EstadoCaso, { color: string; icono: string; label: string }> = {
    nueva:                  { color: colors.primary, icono: 'radio-button-on',        label: 'Nueva' },
    asignada:               { color: colors.warning, icono: 'person-outline',          label: 'Asignada' },
    en_seguimiento:         { color: colors.warning, icono: 'sync-outline',            label: 'En seguimiento' },
    derivada:               { color: colors.success, icono: 'arrow-forward-circle-outline', label: 'Derivada' },
    pendiente_confirmacion: { color: colors.warning, icono: 'hourglass-outline',       label: 'Pendiente confirmación' },
    cerrada:                { color: colors.textDisabled, icono: 'checkmark-done-circle-outline', label: 'Cerrada' },
  };

  const config = estadoConfig[caso.estado];
  const fecha  = new Date(caso.fecha_denuncia).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <TouchableOpacity
      style={[styles.casoCard, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.casoIconBox, { backgroundColor: config.color + '20' }]}>
        <Ionicons name={config.icono as any} size={20} color={config.color} />
      </View>
      <View style={styles.casoContent}>
        <Text style={[styles.casoTipo, { color: colors.text }]}>
          {caso.tipos_violencia?.join(', ') ?? caso.tipo_violencia}
        </Text>
        <Text style={[styles.casoFecha, { color: colors.textSecondary }]}>{fecha}</Text>
        <View style={[styles.casoEstadoBadge, { backgroundColor: config.color }]}>
          <Text style={styles.casoEstadoText}>{config.label}</Text>
        </View>
      </View>
      {caso.hay_heridos && (
        <View style={[styles.urgenteBadge, { backgroundColor: colors.error }]}>
          <Ionicons name="alert" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Pantalla principal ────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }: Props) {
  const { colors }  = useTheme();
  const { usuario } = useAuth();
  const { data: apiData, isLoading: apiLoading } = useMisDenuncias(1, !!usuario);
  const { casosComoDenuncia, isLoading: localLoading } = useCasosLocales();
  const insets = useSafeAreaInsets();

  const primerNombre = usuario?.nombre?.split(' ')[0] ?? null;

  const denuncias: Denuncia[] = apiData?.data ?? casosComoDenuncia;
  const isLoading = apiLoading && localLoading && denuncias.length === 0;

  const total    = denuncias.length;
  const activas  = denuncias.filter((d) => d.estado !== 'cerrada').length;
  const cerradas = denuncias.filter((d) => d.estado === 'cerrada').length;
  const recientes = denuncias.slice(0, 3);

  // Badge de mensaje del operador no leído — busca en el primer caso activo
  const casoConMensaje = recientes.find((d) =>
    d.estado !== 'cerrada' && d.id && false // TODO: conectar con useMensajesCaso cuando haya n+1 caching
  );

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
            {primerNombre ? `Hola, ${primerNombre} 💜` : 'Hola, bienvenida 💜'}
          </Text>
          <Text style={[styles.saludoSub, { color: colors.textSecondary }]}>
            {primerNombre ? 'Estás acompañada en cada paso' : 'Este es un espacio seguro para ti'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.avatar, { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}
          onPress={() => navigation.navigate('Perfil')}
          activeOpacity={0.75}
        >
          <Text style={[styles.avatarInitial, { color: colors.primary }]}>
            {primerNombre ? primerNombre.charAt(0).toUpperCase() : '?'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Banner SOS — SIEMPRE PRIMERO ── */}
      <TouchableOpacity
        style={styles.sosBanner}
        onPress={() => navigation.navigate('SOS')}
        activeOpacity={0.88}
      >
        <View style={styles.sosBannerIconBox}>
          <Ionicons name="warning" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.sosBannerTexts}>
          <Text style={styles.sosBannerTitle}>¿Necesitas ayuda ahora?</Text>
          <Text style={styles.sosBannerSub}>Pedir ayuda de emergencia →</Text>
        </View>
      </TouchableOpacity>

      {/* ── Badge de mensaje del operador (si existe no leído) ── */}
      {casoConMensaje && (
        <TouchableOpacity
          style={[styles.mensajeBadge, { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}
          onPress={() => navigation.navigate('ReporteDetalle', { id: casoConMensaje.id })}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
          <Text style={[styles.mensajeBadgeText, { color: colors.primary }]}>
            El operador de tu caso te dejó un mensaje
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      )}

      {/* ── Botón denunciar ── */}
      <TouchableOpacity
        style={[styles.denunciarButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigation.navigate('Report')}
        activeOpacity={0.85}
      >
        <Ionicons name="document-text-outline" size={20} color={colors.primary} />
        <Text style={[styles.denunciarButtonText, { color: colors.primary }]}>
          Hacer una denuncia
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
      </TouchableOpacity>

      {/* ── KPIs ── */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Tu actividad</Text>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <View style={styles.kpiRow}>
          <KpiCard value={total}   label="Denuncias"     colors={colors} />
          <KpiCard value={activas} label="Activas"       colors={colors} />
          <KpiCard value={cerradas} label="Resueltas"    colors={colors} />
        </View>
      )}

      {/* ── Casos recientes ── */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Casos recientes</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : recientes.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.surface }]}>
          <Ionicons name="shield-checkmark-outline" size={32} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Sin denuncias aún
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            Cuando envíes una denuncia, podrás ver su estado aquí.
          </Text>
        </View>
      ) : (
        recientes.map((caso) => (
          <CasoCard
            key={caso.id}
            caso={caso}
            colors={colors}
            onPress={() => navigation.navigate('ReporteDetalle', { id: caso.id })}
          />
        ))
      )}
    </ScrollView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll:     { flex: 1 },
  container:  { paddingHorizontal: 20, paddingBottom: 40 },

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

  // SOS banner
  sosBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#E53935',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  sosBannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosBannerTexts: { flex: 1 },
  sosBannerTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  sosBannerSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },

  // Badge mensaje operador
  mensajeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  mensajeBadgeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    flex: 1,
  },

  denunciarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    marginBottom: 28,
    borderWidth: 1.5,
  },
  denunciarButtonText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14,
    flex: 1,
  },

  sectionTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 16,
    marginBottom: 12,
  },
  loader: {
    marginBottom: 28,
    alignSelf: 'flex-start',
  },

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

  casoCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  casoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  casoContent: { flex: 1, gap: 4 },
  casoTipo: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 13,
  },
  casoFecha: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
  },
  casoEstadoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  casoEstadoText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  urgenteBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
});
