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
import { useReporte } from '../hooks/useReportes';
import type { MainStackParamList, EstadoReporte } from '../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<MainStackParamList, 'ReporteDetalle'>;

// ─── Constantes ───────────────────────────────────────────────────────────────

const ESTADO_CONFIG: Record<EstadoReporte, { label: string; icono: string }> = {
  enviado:     { label: 'Enviado',     icono: 'time-outline' },
  en_revision: { label: 'En revisión', icono: 'search-outline' },
  resuelto:    { label: 'Resuelto',    icono: 'checkmark-done-circle-outline' },
  rechazado:   { label: 'Rechazado',   icono: 'close-circle-outline' },
};

// ─── Componente de fila de detalle ────────────────────────────────────────────

interface DetalleFilaProps {
  icono: string;
  label: string;
  valor: string;
  colors: ReturnType<typeof useTheme>['colors'];
  ultimo?: boolean;
}

function DetalleFila({ icono, label, valor, colors, ultimo }: DetalleFilaProps) {
  return (
    <>
      <View style={styles.fila}>
        <View style={[styles.filaIconBox, { backgroundColor: colors.primarySubtle }]}>
          <Ionicons name={icono as any} size={18} color={colors.primary} />
        </View>
        <View style={styles.filaContent}>
          <Text style={[styles.filaLabel, { color: colors.textSecondary }]}>
            {label}
          </Text>
          <Text style={[styles.filaValor, { color: colors.text }]}>
            {valor}
          </Text>
        </View>
      </View>
      {!ultimo && (
        <View style={[styles.filaDivider, { backgroundColor: colors.divider }]} />
      )}
    </>
  );
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function ReporteDetalleScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: reporte, isLoading, isError } = useReporte(id);

  // ─── Estados de carga ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !reporte) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          No se pudo cargar el reporte.
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.errorLink, { color: colors.primary }]}>
            Volver
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Datos derivados ───────────────────────────────────────────────────────

  const estadoConfig = ESTADO_CONFIG[reporte.estado];

  const estadoColors: Record<EstadoReporte, string> = {
    enviado:     colors.primary,
    en_revision: colors.warning,
    resuelto:    colors.success,
    rechazado:   colors.error,
  };

  const estadoColor = estadoColors[reporte.estado];

  const fecha = new Date(reporte.fecha_reporte).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const fechaActualizacion = new Date(reporte.fecha_actualizacion).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Filas del detalle — se construyen dinámicamente para no repetir JSX
  const filas = [
    { icono: 'location-outline',      label: 'Coordenadas',        valor: `${reporte.latitud.toFixed(6)}, ${reporte.longitud.toFixed(6)}` },
    { icono: 'home-outline',           label: 'Tipo de lugar',      valor: reporte.tipo_lugar },
    { icono: 'cube-outline',           label: 'Tipo de objeto',     valor: reporte.tipo_objeto },
    { icono: 'eye-outline',            label: '¿Observaste larvas?',valor: reporte.observa_larvas },
    ...(reporte.conocimiento_dengue_cercano
      ? [{ icono: 'alert-circle-outline', label: '¿Dengue cercano?', valor: reporte.conocimiento_dengue_cercano }]
      : []),
    ...(reporte.comentarios
      ? [{ icono: 'chatbox-outline', label: 'Comentarios', valor: reporte.comentarios }]
      : []),
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Botón volver */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back-outline" size={20} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>
          Mis reportes
        </Text>
      </TouchableOpacity>

      {/* Encabezado con estado */}
      <View style={styles.encabezado}>
        <View style={styles.encabezadoTextos}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>
            Reporte
          </Text>
          <Text style={[styles.fecha, { color: colors.textSecondary }]}>
            {fecha}
          </Text>
        </View>
        <View style={[styles.estadoBadge, { backgroundColor: estadoColor + '20' }]}>
          <Ionicons name={estadoConfig.icono as any} size={14} color={estadoColor} />
          <Text style={[styles.estadoText, { color: estadoColor }]}>
            {estadoConfig.label}
          </Text>
        </View>
      </View>

      {/* Foto */}
      {reporte.foto_url ? (
        <Image
          source={{ uri: reporte.foto_url }}
          style={styles.foto}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.fotoVacia, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
          <Ionicons name="image-outline" size={40} color={colors.textDisabled} />
          <Text style={[styles.fotoVaciaText, { color: colors.textDisabled }]}>
            Sin foto adjunta
          </Text>
        </View>
      )}

      {/* Card de detalles */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Detalles del hallazgo
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {filas.map((fila, index) => (
          <DetalleFila
            key={fila.label}
            icono={fila.icono}
            label={fila.label}
            valor={fila.valor}
            colors={colors}
            ultimo={index === filas.length - 1}
          />
        ))}
      </View>

      {/* Última actualización */}
      <Text style={[styles.actualizacion, { color: colors.textDisabled }]}>
        Última actualización: {fechaActualizacion}
      </Text>

    </ScrollView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: 20,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    textAlign: 'center',
  },
  errorLink: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14,
  },

  // Navegación
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  backText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },

  // Encabezado
  encabezado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  encabezadoTextos: {
    flex: 1,
    gap: 4,
  },
  pageTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 26,
  },
  fecha: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  estadoText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 12,
  },

  // Foto
  foto: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    marginBottom: 24,
  },
  fotoVacia: {
    height: 160,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  fotoVaciaText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },

  // Sección
  sectionTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 16,
    marginBottom: 12,
  },

  // Card
  card: {
    borderRadius: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
  },
  filaIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaContent: {
    flex: 1,
    gap: 3,
  },
  filaLabel: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  filaValor: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  filaDivider: {
    height: 1,
    marginLeft: 48,
  },

  // Footer
  actualizacion: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
  },
});