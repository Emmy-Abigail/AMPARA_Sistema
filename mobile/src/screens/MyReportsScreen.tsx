import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
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
import { denunciasService } from '../services/denuncias';
import { listarMisAlertas, cancelarSosAlerta, type SosAlertaResponse } from '../services/sos';
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

// ─── Tarjeta SOS ──────────────────────────────────────────────────────────────

function SosCard({
  alerta,
  colors,
  onVerMensajes,
  onCancelar,
  cancelando,
}: {
  alerta: SosAlertaResponse;
  colors: ReturnType<typeof useTheme>['colors'];
  onVerMensajes: () => void;
  onCancelar: () => void;
  cancelando: boolean;
}) {
  const enAtencion  = alerta.estado === 'en_atencion';
  const accentColor = enAtencion ? '#EA580C' : '#DC2626';
  const bgColor     = enAtencion ? '#FFF7ED' : '#FEF2F2';
  const borderColor = enAtencion ? '#FED7AA' : '#FECACA';

  const hace = (() => {
    const diff = Date.now() - new Date(alerta.fecha_activacion).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'hace un momento';
    if (mins < 60) return `hace ${mins} min`;
    return `hace ${Math.floor(mins / 60)} h`;
  })();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onVerMensajes}
      style={[sosCardStyles.card, { backgroundColor: bgColor, borderColor }]}
    >
      {/* Borde izquierdo de color */}
      <View style={[sosCardStyles.leftBar, { backgroundColor: accentColor }]} />

      <View style={sosCardStyles.body}>
        {/* Fila título + estado */}
        <View style={sosCardStyles.topRow}>
          <Text style={[sosCardStyles.titulo, { color: accentColor }]}>🆘 Alerta SOS</Text>
          <View style={[sosCardStyles.estadoBadge, { backgroundColor: accentColor }]}>
            <Text style={sosCardStyles.estadoText}>
              {enAtencion ? 'En atención' : 'Activa'}
            </Text>
          </View>
        </View>

        {/* Subtítulo */}
        <Text style={[sosCardStyles.subtitulo, { color: '#6B7280' }]}>
          {hace}
          {alerta.sms_enviados > 0
            ? `  ·  📨 ${alerta.sms_enviados} SMS enviado${alerta.sms_enviados > 1 ? 's' : ''} al círculo`
            : ''}
        </Text>

        {/* Mensaje de estado */}
        {enAtencion ? (
          <View style={[sosCardStyles.msgBox, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <Text style={[sosCardStyles.msgText, { color: '#92400E' }]}>
              Un operador está atendiendo tu alerta. Puedes leer sus mensajes en el chat.
            </Text>
          </View>
        ) : (
          <View style={[sosCardStyles.msgBox, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
            <Text style={[sosCardStyles.msgText, { color: '#991B1B' }]}>
              Tu alerta fue enviada. Un operador la revisará en breve.
            </Text>
          </View>
        )}

        {/* Acciones */}
        <View style={sosCardStyles.acciones}>
          <TouchableOpacity
            style={[sosCardStyles.btnPrimario, { backgroundColor: accentColor }]}
            onPress={onVerMensajes}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubbles-outline" size={14} color="#fff" />
            <Text style={sosCardStyles.btnPrimarioText}>Ver mensajes</Text>
          </TouchableOpacity>

          {alerta.estado === 'activa' && (
            <TouchableOpacity
              style={[sosCardStyles.btnSecundario, { borderColor }]}
              onPress={onCancelar}
              disabled={cancelando}
              activeOpacity={0.8}
            >
              {cancelando
                ? <ActivityIndicator size="small" color={accentColor} />
                : <Text style={[sosCardStyles.btnSecundarioText, { color: accentColor }]}>Cancelar</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={accentColor} style={sosCardStyles.chevron} />
    </TouchableOpacity>
  );
}

const sosCardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  leftBar:  { width: 5 },
  body:     { flex: 1, padding: 14, gap: 8 },
  topRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo:   { fontFamily: 'Montserrat-ExtraBold', fontSize: 15 },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  estadoText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 10, color: '#fff' },
  subtitulo:  { fontFamily: 'Inter-Regular', fontSize: 12 },
  msgBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  msgText:  { fontFamily: 'Inter-Regular', fontSize: 12, lineHeight: 18 },
  acciones: { flexDirection: 'row', gap: 8, marginTop: 2 },
  btnPrimario: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  btnPrimarioText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 13, color: '#fff' },
  btnSecundario: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecundarioText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 13 },
  chevron: { alignSelf: 'center', marginRight: 12 },
});

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

  // ── Alertas SOS ──────────────────────────────────────────────────────────
  const [sosAlertas, setSosAlertas]       = useState<SosAlertaResponse[]>([]);
  const [sosCancelando, setSosCancelando] = useState<string | null>(null);

  const cargarSos = useCallback(() => {
    listarMisAlertas().then(setSosAlertas).catch(() => {});
  }, []);

  useEffect(() => {
    cargarSos();
    const intervalo = setInterval(cargarSos, 30_000);
    return () => clearInterval(intervalo);
  }, [cargarSos]);

  const handleCancelarSos = async (id: string) => {
    setSosCancelando(id);
    try {
      await cancelarSosAlerta(id);
      setSosAlertas((prev) => prev.map((a) => a.id === id ? { ...a, estado: 'cancelada' } : a));
    } finally {
      setSosCancelando(null);
    }
  };

  const sosActivas = sosAlertas.filter((a) => a.estado === 'activa' || a.estado === 'en_atencion');

  // ── Acceso por código ────────────────────────────────────────────────────
  const [codigoExpanded, setCodigoExpanded] = useState(false);
  const [codigoInput, setCodigoInput]       = useState('');
  const [codigoBuscando, setCodigoBuscando] = useState(false);
  const [codigoError, setCodigoError]       = useState('');

  const buscarPorCodigo = async () => {
    if (codigoInput.trim().length < 4) return;
    setCodigoBuscando(true);
    setCodigoError('');
    try {
      const result = await denunciasService.buscarPorCodigo(codigoInput);
      navigation.navigate('ReporteDetalle', { id: result.id });
      setCodigoInput('');
      setCodigoExpanded(false);
    } catch {
      setCodigoError('Código no encontrado. Verifica que sea correcto.');
    } finally {
      setCodigoBuscando(false);
    }
  };

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
    todas:    denuncias.length + sosActivas.length,
    activas:  denuncias.filter((d) => ESTADOS_ACTIVOS.includes(d.estado)).length + sosActivas.length,
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

      {/* Las alertas SOS aparecen integradas en la lista de abajo */}

      {/* Acceso por código */}
      <TouchableOpacity
        style={[styles.codigoRow, { backgroundColor: colors.surface, borderColor: codigoExpanded ? colors.primary : colors.border }]}
        onPress={() => { setCodigoExpanded((v) => !v); setCodigoError(''); }}
        activeOpacity={0.8}
      >
        <Ionicons name="key-outline" size={15} color={colors.primary} />
        <Text style={[styles.codigoRowText, { color: colors.textSecondary }]}>
          ¿Tienes un código de acceso?
        </Text>
        <Ionicons
          name={codigoExpanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.textDisabled}
          style={{ marginLeft: 'auto' }}
        />
      </TouchableOpacity>

      {codigoExpanded && (
        <View style={[styles.codigoPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.codigoPanelLabel, { color: colors.textSecondary }]}>
            Ingresa el código que te dio el operador (ej: AB3F7K)
          </Text>
          <View style={styles.codigoInputRow}>
            <TextInput
              style={[
                styles.codigoInput,
                { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
              ]}
              value={codigoInput}
              onChangeText={(t) => { setCodigoInput(t.toUpperCase()); setCodigoError(''); }}
              placeholder="Código de acceso"
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="characters"
              maxLength={6}
              returnKeyType="search"
              onSubmitEditing={buscarPorCodigo}
            />
            <TouchableOpacity
              style={[
                styles.codigoBtnBuscar,
                { backgroundColor: colors.primary, opacity: codigoInput.trim().length < 4 || codigoBuscando ? 0.5 : 1 },
              ]}
              onPress={buscarPorCodigo}
              disabled={codigoInput.trim().length < 4 || codigoBuscando}
            >
              {codigoBuscando
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.codigoBtnText}>Buscar</Text>
              }
            </TouchableOpacity>
          </View>
          {!!codigoError && (
            <Text style={[styles.codigoError, { color: colors.error ?? '#D32F2F' }]}>{codigoError}</Text>
          )}
        </View>
      )}

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
          data={[
            // SOS activas primero (solo en filtro 'todas' o 'activas')
            ...(filtro !== 'cerradas'
              ? sosActivas.map((a) => ({ type: 'sos' as const, id: `sos-${a.id}`, alerta: a }))
              : []),
            // Casos normales (excluyendo el caso auto-creado por SOS si ya aparece como SOS)
            ...denunciasFiltradas
              .filter((d) =>
                !sosActivas.some((s) => s.denuncia_id === d.id)
              )
              .map((d) => ({ type: 'caso' as const, id: d.id, denuncia: d })),
          ]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if (item.type === 'sos') {
              return (
                <SosCard
                  alerta={item.alerta}
                  colors={colors}
                  onVerMensajes={() =>
                    item.alerta.denuncia_id
                      ? navigation.navigate('ReporteDetalle', { id: item.alerta.denuncia_id })
                      : undefined
                  }
                  onCancelar={() => handleCancelarSos(item.alerta.id)}
                  cancelando={sosCancelando === item.alerta.id}
                />
              );
            }
            return (
              <CasoCard
                denuncia={item.denuncia}
                colors={colors}
                onPress={() => navigation.navigate('ReporteDetalle', { id: item.denuncia.id })}
              />
            );
          }}
          contentContainerStyle={[
            styles.listContent,
            denunciasFiltradas.length === 0 && sosActivas.length === 0 && styles.listContentEmpty,
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

  // Código de acceso
  codigoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  codigoRowText: { fontFamily: 'Inter-Regular', fontSize: 13, flex: 1 },
  codigoPanel: {
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  codigoPanelLabel: { fontFamily: 'Inter-Regular', fontSize: 12, lineHeight: 18 },
  codigoInputRow: { flexDirection: 'row', gap: 8 },
  codigoInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 16,
    letterSpacing: 4,
  },
  codigoBtnBuscar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 72,
  },
  codigoBtnText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 13, color: '#FFFFFF' },
  codigoError: { fontFamily: 'Inter-Regular', fontSize: 12 },

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
