// ReportScreen — offline-first
//
// Flow:
//   1. Photo taken  → copied to app's documents dir (persistent local URI).
//   2. Submit pressed → report inserted into SQLite (always succeeds locally).
//   3. syncPendingReports() fired immediately (fire-and-forget):
//        a. Uploads photo to backend storage if needed.
//        b. POST /reportes — with or without photo URL.
//        c. Marks SQLite record as 'enviado' on success, 'fallido' on error.
//   4. If no network, SQLite record stays 'pendiente' and is retried
//      automatically via NetInfo + AppState listeners in sync.ts.

import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboard } from '@react-native-community/hooks';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { useTheme } from '../theme';
import { insertPendingReport } from '../services/db';
import { syncPendingReports } from '../services/sync';
import { storage, StorageKeys } from '../store/storage';
import type {
  MainTabParamList,
  TipoLugar,
  TipoObjeto,
  ObservaLarvas,
  ConocimientoDengue,
} from '../types';

// ─── Tipos y constantes ───────────────────────────────────────────────────────

type Props = BottomTabScreenProps<MainTabParamList, 'Report'>;

const TIPOS_LUGAR: TipoLugar[] = [
  'Vivienda', 'Vía Pública', 'Terreno Abandonado', 'Mercado', 'Colegio', 'Otro',
];
const TIPOS_OBJETO: TipoObjeto[] = [
  'Llantas', 'Baldes', 'Plantas', 'Botellas', 'Canales', 'Otro',
];
const OPCIONES_LARVAS: ObservaLarvas[] = [
  'Sí, claramente', 'No estoy seguro', 'No',
];
const OPCIONES_DENGUE: ConocimientoDengue[] = [
  'Sí', 'No lo sé', 'No',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function _getOrCreateDeviceId(): Promise<string> {
  let id = await storage.getItem(StorageKeys.DEVICE_ID);
  if (!id) {
    id = Crypto.randomUUID();
    await storage.setItem(StorageKeys.DEVICE_ID, id);
  }
  return id;
}

// ─── Componente de chips reutilizable ────────────────────────────────────────

interface ChipGroupProps<T extends string> {
  opciones: T[];
  seleccionado: T | null;
  onSelect: (valor: T) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

function ChipGroup<T extends string>({ opciones, seleccionado, onSelect, colors }: ChipGroupProps<T>) {
  return (
    <View style={styles.chipGroup}>
      {opciones.map((opcion) => {
        const activo = seleccionado === opcion;
        return (
          <TouchableOpacity
            key={opcion}
            style={[
              styles.chip,
              {
                backgroundColor: activo ? colors.primary : colors.surface,
                borderColor: activo ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onSelect(opcion)}
          >
            <Text
              style={[
                styles.chipText,
                { color: activo ? colors.textOnPrimary : colors.text },
                activo && styles.chipTextActive,
              ]}
            >
              {opcion}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function ReportScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboard();

  // Estado del formulario
  const [tipoLugar, setTipoLugar] = useState<TipoLugar | null>(null);
  const [tipoObjeto, setTipoObjeto] = useState<TipoObjeto | null>(null);
  const [observaLarvas, setObservaLarvas] = useState<ObservaLarvas | null>(null);
  const [dengue, setDengue] = useState<ConocimientoDengue | null>(null);
  const [comentarios, setComentarios] = useState('');

  // Foto — path local persistente (en documentDirectory). No se sube al tomar;
  // la subida ocurre dentro del sync engine junto con el POST /reportes.
  const [fotoLocalUri, setFotoLocalUri] = useState<string | null>(null);

  // Estado de ubicación
  const [latitud, setLatitud] = useState<number | null>(null);
  const [longitud, setLongitud] = useState<number | null>(null);
  const [direccion, setDireccion] = useState<string | null>(null);
  const [obtenendoUbicacion, setObtenendoUbicacion] = useState(false);

  // Enviando: true durante el insertPendingReport + disparo de sync.
  const [isSubmitting, setIsSubmitting] = useState(false);

  // local_id único por sesión de formulario. Garantiza idempotencia si el usuario
  // presiona Enviar dos veces o si el sync reintenta el mismo reporte.
  const localIdRef = useRef<string>(Crypto.randomUUID());

  // ─── Lógica de foto ──────────────────────────────────────────────────────────

  const tomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara para tomar la foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      // 0.7: archivo ~2-4 MB antes de llegar al backend.
      // Pillow comprime a WebP ≤400 KB al guardar. Este valor equilibra
      // calidad de evidencia con velocidad de carga en zonas de señal débil.
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const tempUri = result.assets[0].uri;
      try {
        // Copiar a un directorio persistente dentro de la app.
        // ImagePicker devuelve URIs temporales que el SO puede limpiar.
        const fotosDir = `${FileSystem.documentDirectory}sivapre_fotos/`;
        await FileSystem.makeDirectoryAsync(fotosDir, { intermediates: true });
        const destUri = `${fotosDir}${localIdRef.current}.jpg`;
        await FileSystem.copyAsync({ from: tempUri, to: destUri });
        setFotoLocalUri(destUri);
      } catch {
        // Si la copia falla (raro), usar la URI temporal como fallback.
        setFotoLocalUri(tempUri);
      }
    }
  };

  // ─── Lógica de ubicación ──────────────────────────────────────────────────

  const obtenerUbicacion = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos tu ubicación para registrar el criadero.');
      return;
    }
    setObtenendoUbicacion(true);
    try {
      // Accuracy.Balanced: fix más rápido que High en zonas con señal GPS débil.
      // Precisión ~30m — suficiente para geolocalizar un criadero.
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;
      setLatitud(latitude);
      setLongitud(longitude);

      // Geocodificación inversa: obtiene la dirección postal legible.
      // Funciona offline en la mayoría de dispositivos (usa caché del SO).
      // Si falla (sin caché, sin red), simplemente no se guarda la dirección.
      try {
        const [lugar] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (lugar) {
          const partes = [
            lugar.street && lugar.streetNumber ? `${lugar.street} ${lugar.streetNumber}` : lugar.street,
            lugar.district || lugar.subregion,
            lugar.city || lugar.region,
          ].filter(Boolean);
          setDireccion(partes.join(', ') || null);
        }
      } catch {
        // Geocodificación fallida — no es crítico, continúa sin dirección.
      }
    } catch {
      Alert.alert('Error de GPS', 'No se pudo obtener la ubicación. Asegúrate de estar al aire libre e intenta de nuevo.');
    } finally {
      setObtenendoUbicacion(false);
    }
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const limpiarFormulario = () => {
    setTipoLugar(null);
    setTipoObjeto(null);
    setObservaLarvas(null);
    setDengue(null);
    setComentarios('');
    setFotoLocalUri(null);
    setLatitud(null);
    setLongitud(null);
    setDireccion(null);
    localIdRef.current = Crypto.randomUUID();
  };

  const handleSubmit = async () => {
    if (!fotoLocalUri) {
      Alert.alert('Foto requerida', 'Toma una foto del criadero antes de enviar.');
      return;
    }
    if (!latitud || !longitud) {
      Alert.alert('Ubicación requerida', 'Captura tu ubicación GPS antes de enviar.');
      return;
    }
    if (!tipoLugar || !tipoObjeto || !observaLarvas || !dengue) {
      Alert.alert('Campos incompletos', 'Completa todos los campos obligatorios.');
      return;
    }
    await _doSubmit();
  };

  const _doSubmit = async () => {
    setIsSubmitting(true);
    try {
      const deviceId = await _getOrCreateDeviceId();

      // Insertar en SQLite — nunca falla por red.
      await insertPendingReport({
        local_id: localIdRef.current,
        device_id: deviceId,
        latitud: latitud!,
        longitud: longitud!,
        direccion,
        foto_local_uri: fotoLocalUri,
        tipo_lugar: tipoLugar!,
        tipo_objeto: tipoObjeto!,
        observa_larvas: observaLarvas!,
        conocimiento_dengue_cercano: dengue,
        comentarios: comentarios.trim() || null,
      });

      // Intentar sincronizar inmediatamente (fire-and-forget).
      // Si hay señal, el reporte llega al servidor en segundos.
      // Si no hay señal, los listeners de NetInfo/AppState lo reintentan.
      syncPendingReports().catch(() => {});

      Alert.alert(
        'Reporte registrado',
        'Tu reporte fue guardado y se enviará automáticamente al sistema cuando tengas conexión.',
        [
          {
            text: 'Ver mis reportes',
            onPress: () => {
              limpiarFormulario();
              navigation.navigate('MyReports');
            },
          },
          { text: 'Nuevo reporte', onPress: limpiarFormulario },
        ],
      );
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'No se pudo guardar el reporte. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ubicacionObtenida = latitud !== null && longitud !== null;
  const formularioValido = fotoLocalUri && ubicacionObtenida && tipoLugar && tipoObjeto && observaLarvas && dengue;

  const paddingBottom = keyboard.keyboardShown
    ? keyboard.keyboardHeight + 24
    : insets.bottom + 40;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 20, paddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Encabezado */}
        <Text style={[styles.pageTitle, { color: colors.text }]}>Nuevo Reporte</Text>
        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
          Completa el formulario en menos de 60 segundos
        </Text>

        {/* ── 1. Foto ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>1. Evidencia fotográfica</Text>

        <TouchableOpacity
          style={[
            styles.photoBox,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={tomarFoto}
          disabled={isSubmitting}
        >
          {fotoLocalUri ? (
            <Image source={{ uri: fotoLocalUri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera-outline" size={36} color={colors.textSecondary} />
              <Text style={[styles.photoText, { color: colors.textSecondary }]}>
                Toca para tomar una foto
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {fotoLocalUri && (
          <View style={styles.photoActions}>
            <TouchableOpacity
              style={styles.photoActionBtn}
              onPress={tomarFoto}
              disabled={isSubmitting}
            >
              <Ionicons name="refresh-outline" size={15} color={colors.primary} />
              <Text style={[styles.photoActionText, { color: colors.primary }]}>Tomar otra</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 2. Ubicación ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          2. Ubicación del criadero
        </Text>
        <TouchableOpacity
          style={[
            styles.locationButton,
            {
              backgroundColor: ubicacionObtenida ? colors.primary : colors.surface,
              borderColor: colors.primary,
              opacity: obtenendoUbicacion ? 0.7 : 1,
            },
          ]}
          onPress={obtenerUbicacion}
          disabled={obtenendoUbicacion || isSubmitting}
        >
          {obtenendoUbicacion ? (
            <ActivityIndicator
              color={ubicacionObtenida ? colors.textOnPrimary : colors.primary}
              size="small"
            />
          ) : (
            <Ionicons
              name={ubicacionObtenida ? 'location' : 'location-outline'}
              size={20}
              color={ubicacionObtenida ? colors.textOnPrimary : colors.primary}
            />
          )}
          <Text
            style={[
              styles.locationText,
              { color: ubicacionObtenida ? colors.textOnPrimary : colors.primary },
            ]}
          >
            {obtenendoUbicacion
              ? 'Obteniendo ubicación...'
              : ubicacionObtenida
              ? `✓ ${latitud!.toFixed(5)}, ${longitud!.toFixed(5)}`
              : 'Capturar mi ubicación GPS'}
          </Text>
        </TouchableOpacity>

        {/* ── 3. Tipo de lugar ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>3. Tipo de lugar</Text>
        <ChipGroup opciones={TIPOS_LUGAR} seleccionado={tipoLugar} onSelect={(v) => setTipoLugar(v)} colors={colors} />

        {/* ── 4. Tipo de objeto ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>4. Tipo de objeto</Text>
        <ChipGroup opciones={TIPOS_OBJETO} seleccionado={tipoObjeto} onSelect={(v) => setTipoObjeto(v)} colors={colors} />

        {/* ── 5. Larvas ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>5. ¿Observas larvas?</Text>
        <ChipGroup opciones={OPCIONES_LARVAS} seleccionado={observaLarvas} onSelect={(v) => setObservaLarvas(v)} colors={colors} />

        {/* ── 6. Dengue cercano ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          6. ¿Conoces casos de dengue cerca?
        </Text>
        <ChipGroup opciones={OPCIONES_DENGUE} seleccionado={dengue} onSelect={(v) => setDengue(v)} colors={colors} />

        {/* ── 7. Comentarios ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          7. Comentarios adicionales{' '}
          <Text style={{ color: colors.textSecondary, fontFamily: 'Inter-Regular', fontWeight: 'normal' }}>
            (opcional)
          </Text>
        </Text>
        <TextInput
          style={[
            styles.textArea,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          ]}
          placeholder="Describe lo que observas..."
          placeholderTextColor={colors.textDisabled}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={comentarios}
          onChangeText={setComentarios}
        />

        {/* ── Botón enviar ── */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary },
            (!formularioValido || isSubmitting) && { opacity: 0.6 },
          ]}
          onPress={handleSubmit}
          disabled={!formularioValido || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.textOnPrimary} size="small" />
          ) : (
            <Ionicons name="send-outline" size={18} color={colors.textOnPrimary} />
          )}
          <Text style={[styles.submitButtonText, { color: colors.textOnPrimary }]}>
            {isSubmitting ? 'GUARDANDO...' : 'ENVIAR REPORTE'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 20 },
  pageTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 24,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginBottom: 28,
  },
  sectionLabel: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 13,
    marginBottom: 10,
    marginTop: 8,
  },
  photoBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    height: 180,
    marginBottom: 6,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoActionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  locationText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    flex: 1,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  chipTextActive: {
    fontFamily: 'Montserrat-ExtraBold',
  },
  textArea: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    minHeight: 100,
    marginBottom: 28,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 8,
  },
  submitButtonText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 15,
    letterSpacing: 1,
  },
});
