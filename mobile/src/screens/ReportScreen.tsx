import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { useTheme } from '../theme';
import { insertPendingDenuncia } from '../services/db';
import { syncPendingDenuncias } from '../services/sync';
import { guardarCasoLocal } from '../services/casosLocales';
import { storage, StorageKeys } from '../store/storage';
import type {
  MainTabParamList,
  TipoViolencia,
  RelacionAgresor,
  FactorRiesgo,
  NivelRiesgo,
  PreferenciaContacto,
} from '../types';

type Props = BottomTabScreenProps<MainTabParamList, 'Report'>;

const TOTAL_STEPS = 6;

// ─── Datos del formulario ────────────────────────────────────────────────────

interface TipoConfig { value: TipoViolencia; icono: string; desc: string }
const TIPOS_VIOLENCIA: TipoConfig[] = [
  { value: 'Física',      icono: 'body-outline',              desc: 'Golpes, empujones, daño corporal'         },
  { value: 'Psicológica', icono: 'sad-outline',               desc: 'Control, humillación, amenazas'           },
  { value: 'Verbal',      icono: 'megaphone-outline',         desc: 'Insultos, gritos, intimidación'           },
  { value: 'Sexual',      icono: 'warning-outline',           desc: 'Actos sin tu consentimiento'              },
  { value: 'Económica',   icono: 'card-outline',              desc: 'Control del dinero o recursos'            },
  { value: 'Digital',     icono: 'phone-portrait-outline',    desc: 'Acoso o vigilancia en línea'              },
];

interface RelacionConfig { value: RelacionAgresor; icono: string }
const RELACIONES: RelacionConfig[] = [
  { value: 'Pareja o expareja',   icono: 'heart-dislike-outline' },
  { value: 'Familiar',            icono: 'people-outline'         },
  { value: 'Conocido/a',          icono: 'person-outline'         },
  { value: 'Figura de autoridad', icono: 'briefcase-outline'      },
  { value: 'Desconocido/a',       icono: 'help-outline'           },
];

interface FactorConfig { value: FactorRiesgo; label: string }
const FACTORES: FactorConfig[] = [
  { value: 'amenazas_muerte',           label: 'Ha habido amenazas de muerte'               },
  { value: 'acceso_armas',              label: 'Tiene acceso a armas'                        },
  { value: 'violencia_escalando',       label: 'La violencia ha aumentado en frecuencia o gravedad' },
  { value: 'convive',                   label: 'Convivo con esta persona'                    },
  { value: 'seguimiento_vigilancia',    label: 'Me ha seguido o vigilado recientemente'      },
  { value: 'orden_alejamiento_violada', label: 'Ha violado una orden de alejamiento'         },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcularNivelRiesgo(
  relacion: RelacionAgresor | null,
  hayHeridos: boolean,
  factores: FactorRiesgo[],
): NivelRiesgo {
  if (hayHeridos || factores.includes('amenazas_muerte') || factores.includes('acceso_armas'))
    return 'urgente';
  if (relacion === 'Pareja o expareja' || factores.includes('convive') || factores.includes('violencia_escalando'))
    return 'alto';
  if (factores.includes('seguimiento_vigilancia') || factores.includes('orden_alejamiento_violada'))
    return 'medio';
  return 'bajo';
}

function generarToken(): string {
  const chars  = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const random = (n: number) =>
    Array.from(Crypto.getRandomBytes(n))
      .map((b) => chars[b % chars.length])
      .join('');
  return `AMP-${random(4)}-${random(4)}`;
}

function generarCodigoAcceso(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(Crypto.getRandomBytes(6))
    .map((b) => chars[b % chars.length])
    .join('');
}

async function getOrCreateDeviceId(): Promise<string> {
  let id = await storage.getItem(StorageKeys.DEVICE_ID);
  if (!id) {
    id = Crypto.randomUUID();
    await storage.setItem(StorageKeys.DEVICE_ID, id);
  }
  return id;
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function ProgressBar({ step, colors }: { step: number; colors: ReturnType<typeof useTheme>['colors'] }) {
  const pct = ((step + 1) / TOTAL_STEPS) * 100;
  return (
    <View style={[pb.track, { backgroundColor: colors.border }]}>
      <View style={[pb.fill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
    </View>
  );
}
const pb = StyleSheet.create({
  track: { height: 3, borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  fill:  { height: 3, borderRadius: 2 },
});

// Grid 2x3 para tipos de violencia
function TipoChip({
  config, selected, onPress, colors,
}: {
  config: TipoConfig;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <TouchableOpacity
      style={[
        tc.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor:     selected ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons
        name={config.icono as any}
        size={22}
        color={selected ? colors.textOnPrimary : colors.primary}
      />
      <Text style={[tc.valor, { color: selected ? colors.textOnPrimary : colors.text }]}>
        {config.value}
      </Text>
      <Text style={[tc.desc, { color: selected ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
        {config.desc}
      </Text>
    </TouchableOpacity>
  );
}
const tc = StyleSheet.create({
  chip: {
    flex: 1,
    minWidth: '46%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
    alignItems: 'flex-start',
  },
  valor: { fontFamily: 'Montserrat-ExtraBold', fontSize: 13 },
  desc:  { fontFamily: 'Inter-Regular', fontSize: 11, lineHeight: 16 },
});

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function ReportScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Estado del formulario
  const [step, setStep]                   = useState(0);
  const [tiposViolencia, setTiposViolencia] = useState<TipoViolencia[]>([]);
  const [relacionAgresor, setRelacionAgresor] = useState<RelacionAgresor | null>(null);
  const [factoresRiesgo, setFactoresRiesgo]   = useState<FactorRiesgo[]>([]);
  const [hayHeridos, setHayHeridos]           = useState<boolean | null>(null);
  const [fotoUri, setFotoUri]                 = useState<string | null>(null);
  const [descripcion, setDescripcion]         = useState('');
  const [preferenciaContacto, setPreferenciaContacto] = useState<PreferenciaContacto | null>(null);
  const [horarioContacto, setHorarioContacto]   = useState('');
  const [gps, setGps]                           = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [submitted, setSubmitted]               = useState(false);
  const [tokenGenerado, setTokenGenerado]       = useState('');
  const [codigoAcceso, setCodigoAcceso]         = useState('');
  const [nivelRiesgo, setNivelRiesgo]           = useState<NivelRiesgo>('bajo');

  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const localIdRef = useRef(Crypto.randomUUID());

  // GPS capturado en background desde que se abre el formulario
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
        if (last) { setGps({ lat: last.coords.latitude, lng: last.coords.longitude }); return; }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch { /* GPS no disponible */ }
    })();
  }, []);

  // Recalcular nivel de riesgo cuando cambian los factores relevantes
  useEffect(() => {
    setNivelRiesgo(calcularNivelRiesgo(relacionAgresor, hayHeridos ?? false, factoresRiesgo));
  }, [relacionAgresor, hayHeridos, factoresRiesgo]);

  // Animación entre pasos
  const goToStep = (next: number) => {
    const dir = next > step ? 1 : -1;
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -dir * 24, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(dir * 24);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    });
  };

  // Toggle selección múltiple de tipos
  const toggleTipo = (tipo: TipoViolencia) => {
    setTiposViolencia((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo],
    );
  };

  // Toggle factor de riesgo
  const toggleFactor = (f: FactorRiesgo) => {
    setFactoresRiesgo((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  };

  // Foto — NO guardar en carrete del teléfono
  const handleTomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara para adjuntar la evidencia.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: false,
      quality: 0.7,
      saveToPhotos: false, // CRÍTICO: no guardar en el carrete del teléfono
    });
    if (!result.canceled && result.assets[0]) {
      const tempUri = result.assets[0].uri;
      try {
        const dir  = `${FileSystem.documentDirectory}ampara_evidencia/`;
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        const dest = `${dir}${localIdRef.current}.jpg`;
        await FileSystem.copyAsync({ from: tempUri, to: dest });
        setFotoUri(dest);
      } catch {
        setFotoUri(tempUri);
      }
    }
  };

  // Submit
  const handleSubmit = () => {
    if (!relacionAgresor || hayHeridos === null || !preferenciaContacto || tiposViolencia.length === 0) return;
    _submit();
  };

  const _submit = async () => {
    setIsSubmitting(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      const token    = generarToken();
      const codigo   = generarCodigoAcceso();
      const ahora    = new Date().toISOString();
      const nivel    = calcularNivelRiesgo(relacionAgresor, hayHeridos ?? false, factoresRiesgo);

      await insertPendingDenuncia({
        local_id:             localIdRef.current,
        device_id:            deviceId,
        token_anonimo:        token,
        codigo_acceso:        codigo,
        tipos_violencia:      tiposViolencia,
        relacion_agresor:     relacionAgresor!,
        factores_riesgo:      factoresRiesgo,
        hay_heridos:          hayHeridos!,
        foto_local_uri:       fotoUri,
        latitud:              gps?.lat,
        longitud:             gps?.lng,
        preferencia_contacto: preferenciaContacto!,
        horario_contacto:     horarioContacto || undefined,
        descripcion:          descripcion || undefined,
      });

      await guardarCasoLocal({
        token_anonimo:    token,
        codigo_acceso:    codigo,
        local_id:         localIdRef.current,
        tipos_violencia:  tiposViolencia,
        tipo_violencia:   tiposViolencia[0] ?? 'Física',
        relacion_agresor: relacionAgresor!,
        factores_riesgo:  factoresRiesgo,
        nivel_riesgo:     nivel,
        hay_heridos:      hayHeridos!,
        fecha_denuncia:   ahora,
        es_anonima:       true,
        foto_url:         fotoUri,
        descripcion:      descripcion || null,
      });

      syncPendingDenuncias().catch(() => {});
      setTokenGenerado(token);
      setCodigoAcceso(codigo);
      setNivelRiesgo(nivel);
      setSubmitted(true);
    } catch {
      Alert.alert('Error', 'No se pudo guardar la denuncia. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setTiposViolencia([]);
    setRelacionAgresor(null);
    setFactoresRiesgo([]);
    setHayHeridos(null);
    setFotoUri(null);
    setDescripcion('');
    setPreferenciaContacto(null);
    setHorarioContacto('');
    setSubmitted(false);
    setTokenGenerado('');
    setCodigoAcceso('');
    localIdRef.current = Crypto.randomUUID();
    fadeAnim.setValue(1);
    slideAnim.setValue(0);
  };

  const canContinue = (): boolean => {
    switch (step) {
      case 0: return true;                          // Ubicación — siempre puede continuar
      case 1: return tiposViolencia.length > 0;
      case 2: return relacionAgresor !== null;
      case 3: return hayHeridos !== null;
      case 4: return true;                          // Evidencia — opcional
      case 5: return preferenciaContacto !== null;
      default: return false;
    }
  };

  // ── Pantalla de confirmación ──────────────────────────────────────────────

  if (submitted) {
    const nivelLabel: Record<NivelRiesgo, { label: string; color: string }> = {
      urgente:  { label: 'URGENTE',  color: '#C62828' },
      alto:     { label: 'ALTO',     color: '#E65100' },
      medio:    { label: 'MEDIO',    color: '#F59E0B' },
      bajo:     { label: 'BAJO',     color: '#15803D' },
      moderado: { label: 'MODERADO', color: '#F59E0B' },
    };
    const nConfig = nivelLabel[nivelRiesgo];

    return (
      <ScrollView
        style={[{ flex: 1, backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.confirmedScreen,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.confirmedIconBox, { backgroundColor: colors.successLight }]}>
          <Ionicons name="shield-checkmark" size={48} color={colors.success} />
        </View>
        <Text style={[styles.confirmedTitle, { color: colors.text }]}>Estás acompañada</Text>
        <Text style={[styles.confirmedDesc, { color: colors.textSecondary }]}>
          Tu denuncia fue registrada de forma segura. El equipo de Ampara revisará tu caso.
        </Text>

        {/* Código de acceso — primero y prominente */}
        <View style={[styles.codigoCard, { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}>
          <Text style={[styles.codigoLabel, { color: colors.primary }]}>Tu código de seguimiento</Text>
          <Text style={[styles.codigoBig, { color: colors.primary }]}>{codigoAcceso}</Text>
          <Text style={[styles.codigoSub, { color: colors.textSecondary }]}>
            Con este código puedes consultar el estado de tu caso en cualquier dispositivo,
            sin necesidad de crear una cuenta.
          </Text>
        </View>

        {/* Número interno + nivel de riesgo */}
        <View style={[styles.confirmedMeta, { backgroundColor: colors.surface }]}>
          <View style={styles.confirmedMetaRow}>
            <Text style={[styles.confirmedMetaLabel, { color: colors.textSecondary }]}>Referencia</Text>
            <Text style={[styles.confirmedMetaValor, { color: colors.textSecondary }]} numberOfLines={1}>{tokenGenerado}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <View style={styles.confirmedMetaRow}>
            <Text style={[styles.confirmedMetaLabel, { color: colors.textSecondary }]}>Nivel de riesgo</Text>
            <View style={[styles.nivelBadge, { backgroundColor: nConfig.color }]}>
              <Text style={styles.nivelBadgeText}>{nConfig.label}</Text>
            </View>
          </View>
        </View>

        {/* Oferta de identidad — solo en confirmación, nunca antes */}
        <View style={[styles.identidadCard, { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}>
          <Ionicons name="person-add-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.identidadTitle, { color: colors.primary }]}>
              ¿Quieres agregar tus datos?
            </Text>
            <Text style={[styles.identidadDesc, { color: colors.textSecondary }]}>
              Un nombre o teléfono nos permite darte seguimiento más preciso.
            </Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.btnSecondaryOutline, { borderColor: colors.primary }]} onPress={() => { resetForm(); navigation.navigate('Home'); }}>
          <Text style={[styles.btnSecondaryOutlineText, { color: colors.primary }]}>Agregar mis datos →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
          onPress={() => { resetForm(); navigation.navigate('MyReports'); }}
        >
          <Ionicons name="folder-outline" size={18} color={colors.textOnPrimary} />
          <Text style={[styles.btnPrimaryText, { color: colors.textOnPrimary }]}>Ver mi caso</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnLink} onPress={() => { resetForm(); navigation.navigate('Home'); }}>
          <Text style={[styles.btnLinkText, { color: colors.textSecondary }]}>Ir al inicio</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Render de cada paso ───────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {

      // Paso 1 — Ubicación (confirmación silenciosa)
      case 0:
        return (
          <>
            <Text style={[styles.stepQ, { color: colors.text }]}>Ubicación capturada</Text>
            <Text style={[styles.stepHint, { color: colors.textSecondary }]}>
              Tu posición fue capturada de forma silenciosa y cifrada. Solo se comparte si tú lo autorizas al enviar.
            </Text>
            <View style={[styles.gpsCard, { backgroundColor: gps ? colors.successLight : colors.surfaceVariant }]}>
              <Ionicons
                name={gps ? 'location' : 'location-outline'}
                size={22}
                color={gps ? colors.success : colors.textDisabled}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.gpsCardTitle, { color: gps ? colors.successText : colors.textDisabled }]}>
                  {gps ? 'Ubicación lista para compartir' : 'Capturando ubicación...'}
                </Text>
                {gps && (
                  <Text style={[styles.gpsCardCoords, { color: colors.textSecondary }]}>
                    {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
                  </Text>
                )}
              </View>
              {gps && <Ionicons name="lock-closed-outline" size={16} color={colors.success} />}
            </View>
          </>
        );

      // Paso 2 — Tipos de violencia (multi-select grid 2×3)
      case 1:
        return (
          <>
            <Text style={[styles.stepQ, { color: colors.text }]}>¿Qué está pasando?</Text>
            <Text style={[styles.stepHint, { color: colors.textSecondary }]}>
              Puedes seleccionar más de una situación.
            </Text>
            <View style={styles.tiposGrid}>
              {TIPOS_VIOLENCIA.map((cfg) => (
                <TipoChip
                  key={cfg.value}
                  config={cfg}
                  selected={tiposViolencia.includes(cfg.value)}
                  onPress={() => toggleTipo(cfg.value)}
                  colors={colors}
                />
              ))}
            </View>
          </>
        );

      // Paso 3 — Quién es la persona + factores de riesgo
      case 2:
        return (
          <>
            <Text style={[styles.stepQ, { color: colors.text }]}>¿Quién es esta persona para ti?</Text>
            {/* Sección A — Relación */}
            <View style={styles.chipList}>
              {RELACIONES.map(({ value, icono }) => {
                const sel = relacionAgresor === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: sel ? colors.primary : colors.surface,
                        borderColor:     sel ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setRelacionAgresor(value)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={icono as any} size={18} color={sel ? colors.textOnPrimary : colors.primary} />
                    <Text style={[styles.chipLabel, { color: sel ? colors.textOnPrimary : colors.text }, sel && styles.chipLabelSel]}>
                      {value}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Sección B — Factores de riesgo */}
            <Text style={[styles.factoresTitle, { color: colors.textSecondary }]}>
              ¿Alguna de estas situaciones aplica? (opcional)
            </Text>
            {FACTORES.map(({ value, label }) => {
              const sel = factoresRiesgo.includes(value);
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.factorRow, { backgroundColor: colors.surface }]}
                  onPress={() => toggleFactor(value)}
                  activeOpacity={0.75}
                >
                  <View style={[
                    styles.factorCheck,
                    {
                      backgroundColor: sel ? colors.primary : 'transparent',
                      borderColor:     sel ? colors.primary : colors.border,
                    },
                  ]}>
                    {sel && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.factorLabel, { color: colors.text }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </>
        );

      // Paso 4 — Atención médica
      case 3:
        return (
          <>
            <Text style={[styles.stepQ, { color: colors.text }]}>¿Hay alguien que necesite atención médica?</Text>
            <Text style={[styles.stepHint, { color: colors.textSecondary }]}>
              Esto nos permite coordinar ayuda de emergencia si es necesario.
            </Text>
            <View style={styles.binaryGroup}>
              {([
                { val: true,  icono: 'medkit-outline',          titulo: 'Sí, hay heridos',  desc: 'Necesitamos atención urgente', bgActive: colors.error,   fgActive: '#fff' },
                { val: false, icono: 'checkmark-circle-outline', titulo: 'No, por ahora no', desc: 'Sin lesiones físicas inmediatas', bgActive: colors.success, fgActive: '#fff' },
              ] as const).map(({ val, icono, titulo, desc, bgActive, fgActive }) => {
                const sel = hayHeridos === val;
                return (
                  <TouchableOpacity
                    key={String(val)}
                    style={[styles.binaryBtn, { backgroundColor: sel ? bgActive : colors.surface, borderColor: sel ? bgActive : colors.border }]}
                    onPress={() => { setHayHeridos(val); setTimeout(() => goToStep(4), 280); }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={icono as any} size={22} color={sel ? fgActive : (val ? colors.error : colors.success)} />
                    <View style={styles.binaryTexts}>
                      <Text style={[styles.binaryTitle, { color: sel ? fgActive : colors.text }]}>{titulo}</Text>
                      <Text style={[styles.binaryDesc,  { color: sel ? `${fgActive}CC` : colors.textSecondary }]}>{desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        );

      // Paso 5 — Evidencia (opcional)
      case 4:
        return (
          <>
            <Text style={[styles.stepQ, { color: colors.text }]}>Adjunta evidencia (opcional)</Text>
            <Text style={[styles.stepHint, { color: colors.textSecondary }]}>
              Una foto puede ser clave para tu caso. Puedes saltarte este paso.
            </Text>

            <TouchableOpacity
              style={[styles.evidenciaBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleTomarFoto}
              activeOpacity={0.8}
            >
              {fotoUri ? (
                <Image source={{ uri: fotoUri }} style={styles.fotoPreview} resizeMode="cover" />
              ) : (
                <View style={styles.evidenciaBtnInner}>
                  <View style={[styles.evidenciaIconBox, { backgroundColor: colors.primarySubtle }]}>
                    <Ionicons name="camera-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.evidenciaTextos}>
                    <Text style={[styles.evidenciaBtnTitle, { color: colors.text }]}>Tomar foto</Text>
                    <Text style={[styles.evidenciaBtnDesc,  { color: colors.textSecondary }]}>Lesiones, mensajes, entorno</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
                </View>
              )}
            </TouchableOpacity>

            {fotoUri && (
              <TouchableOpacity style={styles.retakeBtn} onPress={handleTomarFoto}>
                <Ionicons name="refresh-outline" size={14} color={colors.primary} />
                <Text style={[styles.retakeBtnText, { color: colors.primary }]}>Tomar otra foto</Text>
              </TouchableOpacity>
            )}

            {/* Nota de seguridad */}
            <View style={[styles.fotaNotaBadge, { backgroundColor: colors.successLight }]}>
              <Ionicons name="lock-closed-outline" size={14} color={colors.success} />
              <Text style={[styles.fotaNotaText, { color: colors.successText }]}>
                La foto solo se guarda en el servidor cifrado, no en tu carrete
              </Text>
            </View>

            {/* Audio — próxima versión */}
            <View style={[styles.evidenciaBtn, styles.evidenciaBtnDisabled, { backgroundColor: colors.surfaceVariant, borderColor: colors.divider }]}>
              <View style={styles.evidenciaBtnInner}>
                <View style={[styles.evidenciaIconBox, { backgroundColor: colors.border }]}>
                  <Ionicons name="mic-outline" size={24} color={colors.textDisabled} />
                </View>
                <View style={styles.evidenciaTextos}>
                  <Text style={[styles.evidenciaBtnTitle, { color: colors.textDisabled }]}>Grabar audio</Text>
                  <Text style={[styles.evidenciaBtnDesc,  { color: colors.textDisabled }]}>Disponible en próxima versión</Text>
                </View>
              </View>
            </View>
          </>
        );

      // Paso 6 — Cuéntanos más + preferencia de contacto
      case 5:
        return (
          <>
            <Text style={[styles.stepQ, { color: colors.text }]}>¿Algo más que quieras agregar?</Text>
            <TextInput
              style={[styles.descripcionInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={descripcion}
              onChangeText={(t) => setDescripcion(t.slice(0, 500))}
              placeholder={'Si quieres agregar algo más, escríbelo aquí.\n\nPor ejemplo: si tiene una orden de alejamiento, si tus hijos están con él, si estás en el baño escondida...'}
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              returnKeyType="done"
            />
            <Text style={[styles.charCount, { color: colors.textDisabled }]}>
              {descripcion.length}/500
            </Text>

            <Text style={[styles.stepQ, { color: colors.text, marginTop: 16, fontSize: 16 }]}>
              ¿Cómo podemos contactarte de forma segura?
            </Text>

            {([
              { value: 'app'     as PreferenciaContacto, icono: 'chatbubble-outline', titulo: 'Mensaje dentro de esta app', desc: 'Más seguro y privado. Solo tú verás los mensajes.', recomendado: true  },
              { value: 'llamada' as PreferenciaContacto, icono: 'call-outline',       titulo: 'Llamada telefónica',         desc: 'El equipo te llamará en el horario que indiques.',   recomendado: false },
              { value: 'ninguno' as PreferenciaContacto, icono: 'eye-off-outline',    titulo: 'No me contacten',            desc: 'Yo revisaré el estado de mi caso en la app.',       recomendado: false },
            ]).map(({ value, icono, titulo, desc, recomendado }) => {
              const sel = preferenciaContacto === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.contactoOption, { backgroundColor: sel ? colors.primarySubtle : colors.surface, borderColor: sel ? colors.primary : colors.border }]}
                  onPress={() => setPreferenciaContacto(value)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.contactoIconBox, { backgroundColor: sel ? colors.primary : colors.surfaceVariant }]}>
                    <Ionicons name={icono as any} size={20} color={sel ? colors.textOnPrimary : colors.primary} />
                  </View>
                  <View style={styles.contactoTextos}>
                    <View style={styles.contactoTituloRow}>
                      <Text style={[styles.contactoTitulo, { color: colors.text }]}>{titulo}</Text>
                      {recomendado && (
                        <View style={[styles.recomBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.recomText}>Recomendado</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.contactoDesc, { color: colors.textSecondary }]}>{desc}</Text>
                  </View>
                  <Ionicons
                    name={sel ? 'radio-button-on' : 'radio-button-off-outline'}
                    size={20}
                    color={sel ? colors.primary : colors.textDisabled}
                  />
                </TouchableOpacity>
              );
            })}

            {preferenciaContacto === 'llamada' && (
              <View style={styles.horarioBox}>
                <Text style={[styles.horarioLabel, { color: colors.textSecondary }]}>
                  ¿En qué horario puedo llamarte?
                </Text>
                <TextInput
                  style={[styles.horarioInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={horarioContacto}
                  onChangeText={setHorarioContacto}
                  placeholder="Ej: Lunes a viernes 10am – 12pm"
                  placeholderTextColor={colors.textDisabled}
                  returnKeyType="done"
                />
              </View>
            )}
          </>
        );

      default:
        return null;
    }
  };

  // ── Render principal ─────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <ProgressBar step={step} colors={colors} />
          <Text style={[styles.stepCounter, { color: colors.textSecondary }]}>
            Paso {step + 1} de {TOTAL_STEPS}
          </Text>
        </View>

        {/* SOS siempre visible en el header del formulario */}
        <TouchableOpacity
          style={styles.sosBtnHeader}
          onPress={() => navigation.navigate('SOS')}
        >
          <Text style={styles.sosBtnHeaderText}>SOS</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
          {renderStep()}
        </Animated.View>
      </ScrollView>

      {/* Barra de navegación inferior */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8, backgroundColor: colors.background, borderTopColor: colors.divider }]}>
        {step > 0 && (
          <TouchableOpacity
            style={[styles.btnBack, { borderColor: colors.border }]}
            onPress={() => goToStep(step - 1)}
          >
            <Ionicons name="arrow-back-outline" size={18} color={colors.primary} />
            <Text style={[styles.btnBackText, { color: colors.primary }]}>Atrás</Text>
          </TouchableOpacity>
        )}

        {step < TOTAL_STEPS - 1 ? (
          <TouchableOpacity
            style={[
              styles.btnNext,
              { backgroundColor: canContinue() ? colors.primary : colors.border },
              step === 0 && styles.btnNextFull,
            ]}
            onPress={() => canContinue() && goToStep(step + 1)}
            disabled={!canContinue()}
          >
            <Text style={[styles.btnNextText, { color: canContinue() ? colors.textOnPrimary : colors.textDisabled }]}>
              {step === 4 && !fotoUri ? 'Continuar sin evidencia →' : 'Continuar →'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.btnSubmit, { backgroundColor: canContinue() && !isSubmitting ? colors.primary : colors.border }]}
            onPress={handleSubmit}
            disabled={!canContinue() || isSubmitting}
          >
            {isSubmitting
              ? <ActivityIndicator size="small" color={colors.textOnPrimary} />
              : <Ionicons name="send-outline" size={18} color={colors.textOnPrimary} />
            }
            <Text style={[styles.btnSubmitText, { color: colors.textOnPrimary }]}>
              {isSubmitting ? 'Enviando...' : 'Enviar denuncia'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen:  { flex: 1 },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },

  topBar:       { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 4, gap: 12 },
  topBarCenter: { flex: 1 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  stepCounter: { fontFamily: 'Inter-Regular', fontSize: 11 },
  sosBtnHeader: {
    backgroundColor: '#E53935',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, marginBottom: 4,
  },
  sosBtnHeaderText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 12, color: '#FFFFFF', letterSpacing: 1 },

  stepQ:    { fontFamily: 'Montserrat-ExtraBold', fontSize: 20, lineHeight: 28, marginBottom: 8 },
  stepHint: { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 22, marginBottom: 24, color: '#000' },

  // GPS card
  gpsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 16, marginTop: 8,
  },
  gpsCardTitle:  { fontFamily: 'Montserrat-ExtraBold', fontSize: 14 },
  gpsCardCoords: { fontFamily: 'Inter-Regular', fontSize: 12, marginTop: 2 },

  // Grid tipos violencia
  tiposGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  // Chips de relación
  chipList:  { gap: 8, marginBottom: 20 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1.5,
  },
  chipLabel:    { fontFamily: 'Inter-Regular', fontSize: 14, flex: 1 },
  chipLabelSel: { fontFamily: 'Montserrat-ExtraBold' },

  // Factores de riesgo
  factoresTitle: { fontFamily: 'Montserrat-ExtraBold', fontSize: 13, marginBottom: 10 },
  factorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 10, marginBottom: 8,
  },
  factorCheck: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  factorLabel: { fontFamily: 'Inter-Regular', fontSize: 13, flex: 1, lineHeight: 20 },

  // Binary (heridos)
  binaryGroup: { gap: 12 },
  binaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 14, borderWidth: 1.5,
  },
  binaryTexts: { flex: 1 },
  binaryTitle: { fontFamily: 'Montserrat-ExtraBold', fontSize: 15 },
  binaryDesc:  { fontFamily: 'Inter-Regular', fontSize: 13, marginTop: 2 },

  // Evidencia
  evidenciaBtn: { borderRadius: 14, borderWidth: 1.5, marginBottom: 12, overflow: 'hidden' },
  evidenciaBtnDisabled: { opacity: 0.6 },
  evidenciaBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  evidenciaIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  evidenciaTextos:   { flex: 1 },
  evidenciaBtnTitle: { fontFamily: 'Montserrat-ExtraBold', fontSize: 14 },
  evidenciaBtnDesc:  { fontFamily: 'Inter-Regular', fontSize: 12, marginTop: 2 },
  fotoPreview:       { width: '100%', height: 180 },
  retakeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: -4 },
  retakeBtnText: { fontFamily: 'Inter-Regular', fontSize: 13 },
  fotaNotaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 10, marginBottom: 12,
  },
  fotaNotaText: { fontFamily: 'Inter-Regular', fontSize: 12, flex: 1 },

  // Contacto
  descripcionInput: {
    borderWidth: 1.5, borderRadius: 12, padding: 14,
    fontFamily: 'Inter-Regular', fontSize: 14, minHeight: 120, marginBottom: 4,
  },
  charCount: { fontFamily: 'Inter-Regular', fontSize: 11, textAlign: 'right', marginBottom: 24 },
  contactoOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 10,
  },
  contactoIconBox: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  contactoTextos:    { flex: 1 },
  contactoTituloRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  contactoTitulo:    { fontFamily: 'Montserrat-ExtraBold', fontSize: 14 },
  contactoDesc:      { fontFamily: 'Inter-Regular', fontSize: 12, marginTop: 3 },
  recomBadge:        { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  recomText:         { fontFamily: 'Montserrat-ExtraBold', fontSize: 9, color: '#FFFFFF' },
  horarioBox:        { marginTop: 4, marginBottom: 8 },
  horarioLabel:      { fontFamily: 'Inter-Regular', fontSize: 13, marginBottom: 8 },
  horarioInput: {
    height: 48, borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 14, fontFamily: 'Inter-Regular', fontSize: 14,
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1,
  },
  btnBack: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1.5,
  },
  btnBackText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 14 },
  btnNext: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12,
  },
  btnNextFull: { flex: 1 },
  btnNextText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 14 },
  btnSubmit: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12,
  },
  btnSubmitText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 14, color: '#FFFFFF' },

  // Confirmación
  confirmedScreen: { alignItems: 'center', paddingHorizontal: 24, gap: 16 },
  confirmedIconBox: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  confirmedTitle: { fontFamily: 'Montserrat-ExtraBold', fontSize: 24, textAlign: 'center' },
  confirmedDesc: {
    fontFamily: 'Inter-Regular', fontSize: 14, textAlign: 'center', lineHeight: 22,
  },
  codigoCard: {
    width: '100%', borderRadius: 16, borderWidth: 2,
    padding: 20, alignItems: 'center', gap: 8, marginBottom: 14,
  },
  codigoLabel: { fontFamily: 'Inter-Regular', fontSize: 12 },
  codigoBig: {
    fontFamily: 'Montserrat-ExtraBold', fontSize: 38, letterSpacing: 6,
  },
  codigoSub: { fontFamily: 'Inter-Regular', fontSize: 12, textAlign: 'center', lineHeight: 18 },

  confirmedMeta: {
    width: '100%', borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  confirmedMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  confirmedMetaLabel: { fontFamily: 'Montserrat-ExtraBold', fontSize: 12 },
  confirmedMetaValor: { fontFamily: 'Montserrat-ExtraBold', fontSize: 14 },
  divider: { height: 1, marginHorizontal: 14 },
  nivelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  nivelBadgeText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 11, color: '#FFFFFF' },

  identidadCard: {
    width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  identidadTitle: { fontFamily: 'Montserrat-ExtraBold', fontSize: 13 },
  identidadDesc:  { fontFamily: 'Inter-Regular', fontSize: 12, marginTop: 3, lineHeight: 18 },

  btnSecondaryOutline: {
    width: '100%', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1.5,
  },
  btnSecondaryOutlineText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 14 },
  btnPrimary: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 15, borderRadius: 13,
  },
  btnPrimaryText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 15, color: '#FFFFFF' },
  btnLink:        { paddingVertical: 10 },
  btnLinkText:    { fontFamily: 'Inter-Regular', fontSize: 14, textDecorationLine: 'underline' },
});
