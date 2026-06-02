import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../theme';
import { useDenuncia, useMensajesCaso } from '../hooks/useDenuncias';
import { useCasosLocales, casoLocalADenuncia } from '../hooks/useCasosLocales';
import type { MainStackParamList, EstadoCaso, Denuncia } from '../types';

type Props = NativeStackScreenProps<MainStackParamList, 'ReporteDetalle'>;

const ESTADO_CONFIG: Record<EstadoCaso, { label: string; icono: string }> = {
  nueva:                  { label: 'Nueva',               icono: 'radio-button-on-outline'       },
  asignada:               { label: 'Asignada',             icono: 'person-outline'                },
  en_seguimiento:         { label: 'En seguimiento',       icono: 'sync-outline'                  },
  derivada:               { label: 'Derivada',             icono: 'arrow-forward-circle-outline'  },
  pendiente_confirmacion: { label: 'Pend. confirmación',   icono: 'hourglass-outline'             },
  cerrada:                { label: 'Cerrada',              icono: 'checkmark-done-circle-outline' },
};

const ESTADO_COLOR = (estado: EstadoCaso, c: ReturnType<typeof useTheme>['colors']) => ({
  nueva:                  c.primary,
  asignada:               c.warning,
  en_seguimiento:         c.warning,
  derivada:               c.success,
  pendiente_confirmacion: c.warning,
  cerrada:                c.textDisabled,
}[estado]);

function DetalleFila({ icono, label, valor, colors, ultimo }: {
  icono: string; label: string; valor: string;
  colors: ReturnType<typeof useTheme>['colors']; ultimo?: boolean;
}) {
  return (
    <>
      <View style={styles.fila}>
        <View style={[styles.filaIconBox, { backgroundColor: colors.primarySubtle }]}>
          <Ionicons name={icono as any} size={18} color={colors.primary} />
        </View>
        <View style={styles.filaContent}>
          <Text style={[styles.filaLabel, { color: colors.textSecondary }]}>{label}</Text>
          <Text style={[styles.filaValor, { color: colors.text }]}>{valor}</Text>
        </View>
      </View>
      {!ultimo && <View style={[styles.filaDivider, { backgroundColor: colors.divider }]} />}
    </>
  );
}

export default function ReporteDetalleScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // ── Buscar en almacén local primero ──────────────────────────────────────
  const { casos } = useCasosLocales();
  const casoLocal = casos.find(c => c.local_id === id || c.denuncia_id === id);

  // Si el caso existe localmente y no tiene ID de servidor, no llamamos a la API
  const esSoloLocal = casoLocal !== undefined && casoLocal.denuncia_id === null;

  // Para la API: usamos denuncia_id si lo tiene, id original si no hay caso local
  const apiId = esSoloLocal ? '' : (casoLocal?.denuncia_id ?? id);

  const { data: apiDenuncia, isLoading: apiLoading, isError: apiError } = useDenuncia(apiId);
  const { data: mensajes } = useMensajesCaso(apiId);

  // Resolver fuente final: API primero, local como fallback
  const denuncia: Denuncia | null =
    apiDenuncia ??
    (casoLocal ? casoLocalADenuncia(casoLocal) : null);

  const isLoading = !esSoloLocal && apiLoading && !casoLocal;
  const isError   = !denuncia;

  // ── Estados de carga / error ──────────────────────────────────────────────

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
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          No se pudo cargar el caso.
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.errorLink, { color: colors.primary }]}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const estadoConfig = ESTADO_CONFIG[denuncia.estado];
  const estadoColor  = ESTADO_COLOR(denuncia.estado, colors);

  const fecha = new Date(denuncia.fecha_denuncia).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const filas = [
    { icono: 'alert-circle-outline', label: 'Tipo de violencia',   valor: denuncia.tipo_violencia },
    { icono: 'person-outline',       label: 'Relación con agresor', valor: denuncia.relacion_agresor },
    { icono: 'medkit-outline',       label: '¿Hay heridos?',        valor: denuncia.hay_heridos ? 'Sí' : 'No' },
    ...(denuncia.latitud != null ? [{
      icono: 'location-outline',
      label: 'Ubicación capturada',
      valor: `${denuncia.latitud.toFixed(5)}, ${denuncia.longitud?.toFixed(5)}`,
    }] : []),
    {
      icono: 'chatbubble-outline',
      label: 'Contacto preferido',
      valor: denuncia.preferencia_contacto === 'app'
        ? 'Mensaje en app'
        : denuncia.preferencia_contacto === 'llamada'
        ? 'Llamada telefónica'
        : 'Sin contacto directo',
    },
  ];

  // Indicador de sincronización pendiente
  const pendienteSincronizacion = esSoloLocal;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back-outline" size={20} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>Mis casos</Text>
      </TouchableOpacity>

      {/* Encabezado */}
      <View style={styles.encabezado}>
        <View style={styles.encabezadoTextos}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Caso</Text>
          <Text style={[styles.fecha, { color: colors.textSecondary }]}>{fecha}</Text>
        </View>
        <View style={[styles.estadoBadge, { backgroundColor: estadoColor + '20' }]}>
          <Ionicons name={estadoConfig.icono as any} size={14} color={estadoColor} />
          <Text style={[styles.estadoText, { color: estadoColor }]}>{estadoConfig.label}</Text>
        </View>
      </View>

      {/* Aviso de sincronización pendiente */}
      {pendienteSincronizacion && (
        <View style={[styles.syncBanner, { backgroundColor: colors.warningLight }]}>
          <Ionicons name="cloud-upload-outline" size={16} color={colors.warning} />
          <Text style={[styles.syncText, { color: colors.warningText }]}>
            Pendiente de sincronizar — se enviará cuando haya conexión
          </Text>
        </View>
      )}

      {/* Evidencia fotográfica */}
      {denuncia.foto_url ? (
        <Image source={{ uri: denuncia.foto_url }} style={styles.foto} resizeMode="cover" />
      ) : (
        <View style={[styles.fotoVacia, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
          <Ionicons name="image-outline" size={40} color={colors.textDisabled} />
          <Text style={[styles.fotoVaciaText, { color: colors.textDisabled }]}>Sin foto adjunta</Text>
        </View>
      )}

      {/* Detalles */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Detalles del caso</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {filas.map((fila, i) => (
          <DetalleFila
            key={fila.label}
            icono={fila.icono}
            label={fila.label}
            valor={fila.valor}
            colors={colors}
            ultimo={i === filas.length - 1}
          />
        ))}
      </View>

      {/* Mensajes del operador — solo cuando está sincronizado */}
      {!pendienteSincronizacion && mensajes && mensajes.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Mensajes de seguimiento</Text>
          {mensajes.map((msg) => (
            <View
              key={msg.id}
              style={[styles.mensajeCard, { backgroundColor: colors.primarySubtle, borderLeftColor: colors.primary }]}
            >
              <View style={styles.mensajeHeader}>
                <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
                <Text style={[styles.mensajeAutor, { color: colors.primary }]}>Operador</Text>
                <Text style={[styles.mensajeFecha, { color: colors.textDisabled }]}>
                  {new Date(msg.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <Text style={[styles.mensajeContenido, { color: colors.text }]}>{msg.contenido}</Text>
            </View>
          ))}
        </>
      )}

      <Text style={[styles.actualizacion, { color: colors.textDisabled }]}>
        Última actualización:{' '}
        {new Date(denuncia.fecha_actualizacion).toLocaleDateString('es-PE', {
          day: 'numeric', month: 'long', year: 'numeric',
        })}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:    { flex: 1 },
  container: { paddingHorizontal: 20 },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 15, textAlign: 'center' },
  errorLink: { fontFamily: 'Montserrat-ExtraBold', fontSize: 14 },

  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backText:   { fontFamily: 'Inter-Regular', fontSize: 14 },

  encabezado:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 },
  encabezadoTextos: { flex: 1, gap: 4 },
  pageTitle:        { fontFamily: 'Montserrat-ExtraBold', fontSize: 26 },
  fecha:            { fontFamily: 'Inter-Regular', fontSize: 13 },
  estadoBadge:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginTop: 4 },
  estadoText:       { fontFamily: 'Montserrat-ExtraBold', fontSize: 12 },

  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  syncText: { fontFamily: 'Inter-Regular', fontSize: 12, flex: 1, lineHeight: 18 },

  foto:         { width: '100%', height: 220, borderRadius: 14, marginBottom: 24 },
  fotoVacia:    { height: 120, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 24, gap: 8 },
  fotoVaciaText:{ fontFamily: 'Inter-Regular', fontSize: 13 },

  sectionTitle: { fontFamily: 'Montserrat-ExtraBold', fontSize: 16, marginBottom: 12 },
  card: {
    borderRadius: 14, paddingHorizontal: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  fila:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  filaIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filaContent: { flex: 1, gap: 3 },
  filaLabel:   { fontFamily: 'Montserrat-ExtraBold', fontSize: 11, letterSpacing: 0.3 },
  filaValor:   { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 20 },
  filaDivider: { height: 1, marginLeft: 48 },

  mensajeCard:      { borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 3 },
  mensajeHeader:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  mensajeAutor:     { fontFamily: 'Montserrat-ExtraBold', fontSize: 12, flex: 1 },
  mensajeFecha:     { fontFamily: 'Inter-Regular', fontSize: 11 },
  mensajeContenido: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 20 },

  actualizacion: { fontFamily: 'Inter-Regular', fontSize: 11, textAlign: 'center', marginTop: 8, marginBottom: 8 },
});
