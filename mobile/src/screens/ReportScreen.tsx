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
  Dimensions,
  Platform,
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
import { storage, StorageKeys } from '../store/storage';
import type { MainTabParamList, TipoViolencia, RelacionAgresor, NivelRiesgo, PreferenciaContacto } from '../types';

// ─── Constantes ───────────────────────────────────────────────────────────────

type Props = BottomTabScreenProps<MainTabParamList, 'Report'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const TOTAL_STEPS  = 5;

const TIPOS_VIOLENCIA: { value: TipoViolencia; icono: string }[] = [
  { value: 'Física',       icono: 'body-outline'          },
  { value: 'Psicológica',  icono: 'sad-outline'           },
  { value: 'Sexual',       icono: 'warning-outline'       },
  { value: 'Económica',    icono: 'card-outline'          },
  { value: 'Otra',         icono: 'ellipsis-horizontal-outline' },
];

const RELACIONES_AGRESOR: { value: RelacionAgresor; icono: string }[] = [
  { value: 'Cónyuge',      icono: 'heart-dislike-outline' },
  { value: 'Expareja',     icono: 'person-remove-outline' },
  { value: 'Familiar',     icono: 'people-outline'        },
  { value: 'Conocido',     icono: 'person-outline'        },
  { value: 'Desconocido',  icono: 'help-outline'          },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcularNivelRiesgo(relacion: RelacionAgresor, heridos: boolean): NivelRiesgo {
  if (heridos) return 'urgente';
  if (relacion === 'Cónyuge' || relacion === 'Expareja') return 'alto';
  return 'moderado';
}

function generarToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = 'AMP-';
  for (let i = 0; i < 8; i++) {
    if (i === 4) token += '-';
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
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
  const progress = ((step + 1) / TOTAL_STEPS) * 100;
  return (
    <View style={[pbStyles.track, { backgroundColor: colors.border }]}>
      <View style={[pbStyles.fill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
    </View>
  );
}
const pbStyles = StyleSheet.create({
  track: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  fill:  { height: 4, borderRadius: 2 },
});

function StepLabel({ current, total, colors }: { current: number; total: number; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <Text style={[stepLabelStyles.text, { color: colors.textSecondary }]}>
      Paso {current + 1} de {total}
    </Text>
  );
}
const stepLabelStyles = StyleSheet.create({
  text: { fontFamily: 'Inter-Regular', fontSize: 12, marginBottom: 24 },
});

interface ChipOptionProps<T extends string> {
  value: T;
  label: string;
  icono: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}
function ChipOption<T extends string>({ label, icono, selected, onPress, colors }: ChipOptionProps<T>) {
  return (
    <TouchableOpacity
      style={[
        chipStyles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor:     selected ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons name={icono as any} size={18} color={selected ? colors.textOnPrimary : colors.primary} />
      <Text style={[chipStyles.label, { color: selected ? colors.textOnPrimary : colors.text }, selected && chipStyles.labelSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  label:         { fontFamily: 'Inter-Regular', fontSize: 14, flex: 1 },
  labelSelected: { fontFamily: 'Montserrat-ExtraBold' },
});

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function ReportScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // ── Estado del formulario ──────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [tipoViolencia,      setTipoViolencia]      = useState<TipoViolencia | null>(null);
  const [relacionAgresor,    setRelacionAgresor]     = useState<RelacionAgresor | null>(null);
  const [hayHeridos,         setHayHeridos]          = useState<boolean | null>(null);
  const [fotoUri,            setFotoUri]             = useState<string | null>(null);
  const [preferenciaContacto, setPreferenciaContacto] = useState<PreferenciaContacto | null>(null);
  const [horarioContacto,    setHorarioContacto]     = useState('');
  const [gps,                setGps]                 = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting,       setIsSubmitting]        = useState(false);
  const [submitted,          setSubmitted]           = useState(false);
  const [tokenGenerado,      setTokenGenerado]       = useState('');

  // ── Animación de transición entre pasos ───────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ── ID único por sesión de formulario (idempotencia) ──────────────────────
  const localIdRef = useRef(Crypto.randomUUID());

  // ── Captura GPS silenciosa al abrir el formulario ─────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        // Primero intenta con la última posición conocida (respuesta inmediata)
        const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
        if (last) {
          setGps({ lat: last.coords.latitude, lng: last.coords.longitude });
          return;
        }

        // Si no hay caché, solicita una posición nueva
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setGps({ lat: current.coords.latitude, lng: current.coords.longitude });
      } catch {
        // GPS no disponible — continúa sin coordenadas
      }
    })();
  }, []);

  // ── Transición animada entre pasos ───────────────────────────────────────
  const goToStep = (nextStep: number) => {
    const direction = nextStep > step ? 1 : -1;

    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -direction * 24, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(direction * 24);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    });
  };

  const selectAndAdvance = <T,>(setter: (v: T) => void, value: T, nextStep: number) => {
    setter(value);
    setTimeout(() => goToStep(nextStep), 280);
  };

  // ── Panic button ──────────────────────────────────────────────────────────
  const handlePanic = () => {
    navigation.navigate('Home');
  };

  // ── Foto ──────────────────────────────────────────────────────────────────
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
    });
    if (!result.canceled && result.assets[0]) {
      const tempUri = result.assets[0].uri;
      try {
        const dir = `${FileSystem.documentDirectory}ampara_evidencia/`;
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        const dest = `${dir}${localIdRef.current}.jpg`;
        await FileSystem.copyAsync({ from: tempUri, to: dest });
        setFotoUri(dest);
      } catch {
        setFotoUri(tempUri);
      }
    }
  };

  // ── Envío SOS rápido ──────────────────────────────────────────────────────
  const handleSOS = async () => {
    Alert.alert(
      'Enviar alerta urgente',
      'Se enviará una alerta de emergencia con tu ubicación actual sin completar el formulario.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar ahora',
          style: 'destructive',
          onPress: () => _submitDenuncia({
            tipo:    'Física',
            relacion: 'Desconocido',
            heridos:  true,
            contacto: 'ninguno',
          }),
        },
      ],
    );
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!tipoViolencia || !relacionAgresor || hayHeridos === null || !preferenciaContacto) return;
    _submitDenuncia({
      tipo:    tipoViolencia,
      relacion: relacionAgresor,
      heridos:  hayHeridos,
      contacto: preferenciaContacto,
      horario:  horarioContacto || undefined,
    });
  };

  const _submitDenuncia = async (params: {
    tipo: TipoViolencia;
    relacion: RelacionAgresor;
    heridos: boolean;
    contacto: PreferenciaContacto;
    horario?: string;
  }) => {
    setIsSubmitting(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      const token    = generarToken();

      await insertPendingDenuncia({
        local_id:             localIdRef.current,
        device_id:            deviceId,
        token_anonimo:        token,
        tipo_violencia:       params.tipo,
        relacion_agresor:     params.relacion,
        hay_heridos:          params.heridos,
        foto_local_uri:       fotoUri,
        latitud:              gps?.lat,
        longitud:             gps?.lng,
        preferencia_contacto: params.contacto,
        horario_contacto:     params.horario,
      });

      // Sync fire-and-forget: si hay red, la denuncia llega en segundos
      syncPendingDenuncias().catch(() => {});

      setTokenGenerado(token);
      setSubmitted(true);
    } catch {
      Alert.alert('Error', 'No se pudo guardar la denuncia. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setTipoViolencia(null);
    setRelacionAgresor(null);
    setHayHeridos(null);
    setFotoUri(null);
    setPreferenciaContacto(null);
    setHorarioContacto('');
    setSubmitted(false);
    setTokenGenerado('');
    localIdRef.current = Crypto.randomUUID();
    fadeAnim.setValue(1);
    slideAnim.setValue(0);
  };

  // ── Pantalla de confirmación ──────────────────────────────────────────────
  if (submitted) {
    return (
      <View style={[styles.confirmedScreen, { backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}>
        <View style={[styles.confirmedIconBox, { backgroundColor: colors.successLight }]}>
          <Ionicons name="shield-checkmark" size={48} color={colors.success} />
        </View>

        <Text style={[styles.confirmedTitle, { color: colors.text }]}>
          Denuncia enviada de forma segura
        </Text>
        <Text style={[styles.confirmedDesc, { color: colors.textSecondary }]}>
          Tu alerta ha sido registrada. El equipo de Ampara revisará tu caso y te contactará según tu preferencia.
        </Text>

        <View style={[styles.tokenCard, { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}>
          <Text style={[styles.tokenLabel, { color: colors.primary }]}>Tu código de seguimiento</Text>
          <Text style={[styles.tokenValue, { color: colors.text }]}>{tokenGenerado}</Text>
          <Text style={[styles.tokenHint, { color: colors.textSecondary }]}>
            Guárdalo en un lugar seguro. Lo necesitarás para consultar el estado de tu caso en "Mis casos".
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
          onPress={() => { resetForm(); navigation.navigate('MyReports'); }}
        >
          <Ionicons name="folder-outline" size={18} color={colors.textOnPrimary} />
          <Text style={[styles.btnPrimaryText, { color: colors.textOnPrimary }]}>Ver mis casos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnSecondary} onPress={() => { resetForm(); navigation.navigate('Home'); }}>
          <Text style={[styles.btnSecondaryText, { color: colors.primary }]}>Ir al inicio</Text>
        </TouchableOpacity>

        <Text style={[styles.confirmedNote, { color: colors.textDisabled }]}>
          Cuando estés en un lugar seguro, completa tu perfil para un seguimiento más preciso.
        </Text>
      </View>
    );
  }

  // ── Render del paso activo ────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      // ── Paso 1: Tipo de violencia ────────────────────────────────────────
      case 0:
        return (
          <>
            <Text style={[styles.stepQuestion, { color: colors.text }]}>
              ¿Qué tipo de violencia estás experimentando?
            </Text>
            <Text style={[styles.stepHint, { color: colors.textSecondary }]}>
              Puedes seleccionar la que mejor describe tu situación.
            </Text>
            <View style={styles.chipList}>
              {TIPOS_VIOLENCIA.map(({ value, icono }) => (
                <ChipOption
                  key={value}
                  value={value}
                  label={value}
                  icono={icono}
                  selected={tipoViolencia === value}
                  onPress={() => selectAndAdvance(setTipoViolencia, value, 1)}
                  colors={colors}
                />
              ))}
            </View>
          </>
        );

      // ── Paso 2: Relación con el agresor ──────────────────────────────────
      case 1:
        return (
          <>
            <Text style={[styles.stepQuestion, { color: colors.text }]}>
              ¿Cuál es tu relación con el agresor?
            </Text>
            <Text style={[styles.stepHint, { color: colors.textSecondary }]}>
              Esta información ayuda a evaluar el nivel de protección que necesitas.
            </Text>
            <View style={styles.chipList}>
              {RELACIONES_AGRESOR.map(({ value, icono }) => (
                <ChipOption
                  key={value}
                  value={value}
                  label={value}
                  icono={icono}
                  selected={relacionAgresor === value}
                  onPress={() => selectAndAdvance(setRelacionAgresor, value, 2)}
                  colors={colors}
                />
              ))}
            </View>
          </>
        );

      // ── Paso 3: ¿Hay heridos? ────────────────────────────────────────────
      case 2:
        return (
          <>
            <Text style={[styles.stepQuestion, { color: colors.text }]}>
              ¿Hay alguien que necesite atención médica?
            </Text>
            <Text style={[styles.stepHint, { color: colors.textSecondary }]}>
              Esto nos permite coordinar ayuda médica si es necesario.
            </Text>
            <View style={styles.binaryGroup}>
              <TouchableOpacity
                style={[
                  styles.binaryBtn,
                  {
                    backgroundColor: hayHeridos === true ? colors.error : colors.surface,
                    borderColor:     hayHeridos === true ? colors.error : colors.border,
                  },
                ]}
                onPress={() => selectAndAdvance(setHayHeridos, true, 3)}
                activeOpacity={0.8}
              >
                <Ionicons name="medkit-outline" size={22} color={hayHeridos === true ? '#fff' : colors.error} />
                <View style={styles.binaryBtnTexts}>
                  <Text style={[styles.binaryBtnTitle, { color: hayHeridos === true ? '#fff' : colors.text }]}>
                    Sí, hay heridos
                  </Text>
                  <Text style={[styles.binaryBtnDesc, { color: hayHeridos === true ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
                    Necesitamos atención médica urgente
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.binaryBtn,
                  {
                    backgroundColor: hayHeridos === false ? colors.success : colors.surface,
                    borderColor:     hayHeridos === false ? colors.success : colors.border,
                  },
                ]}
                onPress={() => selectAndAdvance(setHayHeridos, false, 3)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle-outline" size={22} color={hayHeridos === false ? '#fff' : colors.success} />
                <View style={styles.binaryBtnTexts}>
                  <Text style={[styles.binaryBtnTitle, { color: hayHeridos === false ? '#fff' : colors.text }]}>
                    No, por ahora no
                  </Text>
                  <Text style={[styles.binaryBtnDesc, { color: hayHeridos === false ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
                    No hay lesiones físicas inmediatas
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        );

      // ── Paso 4: Evidencia ────────────────────────────────────────────────
      case 3:
        return (
          <>
            <Text style={[styles.stepQuestion, { color: colors.text }]}>
              Adjunta evidencia (opcional)
            </Text>
            <Text style={[styles.stepHint, { color: colors.textSecondary }]}>
              Una foto puede ser clave para tu caso. Puedes saltar este paso.
            </Text>

            {/* Foto */}
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
                    <Text style={[styles.evidenciaBtnDesc, { color: colors.textSecondary }]}>
                      Lesiones, mensajes, entorno
                    </Text>
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

            {/* Audio — requiere expo-av, disponible en próxima versión */}
            <View style={[styles.evidenciaBtn, styles.evidenciaBtnDisabled, { backgroundColor: colors.surfaceVariant, borderColor: colors.divider }]}>
              <View style={styles.evidenciaBtnInner}>
                <View style={[styles.evidenciaIconBox, { backgroundColor: colors.border }]}>
                  <Ionicons name="mic-outline" size={24} color={colors.textDisabled} />
                </View>
                <View style={styles.evidenciaTextos}>
                  <Text style={[styles.evidenciaBtnTitle, { color: colors.textDisabled }]}>Grabar audio</Text>
                  <Text style={[styles.evidenciaBtnDesc, { color: colors.textDisabled }]}>Disponible en próxima versión</Text>
                </View>
                <View style={[styles.proximamenteBadge, { backgroundColor: colors.border }]}>
                  <Text style={[styles.proximamenteText, { color: colors.textDisabled }]}>Próximo</Text>
                </View>
              </View>
            </View>

            {/* GPS status */}
            <View style={[styles.gpsStatus, { backgroundColor: gps ? colors.successLight : colors.surfaceVariant }]}>
              <Ionicons name={gps ? 'location' : 'location-outline'} size={14} color={gps ? colors.success : colors.textDisabled} />
              <Text style={[styles.gpsStatusText, { color: gps ? colors.successText : colors.textDisabled }]}>
                {gps
                  ? `Ubicación capturada (${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)})`
                  : 'Capturando ubicación GPS...'}
              </Text>
            </View>
          </>
        );

      // ── Paso 5: Preferencia de contacto ─────────────────────────────────
      case 4:
        return (
          <>
            <Text style={[styles.stepQuestion, { color: colors.text }]}>
              ¿Cómo podemos contactarte de forma segura?
            </Text>
            <Text style={[styles.stepHint, { color: colors.textSecondary }]}>
              Elige el canal con el que te sientas más segura.
            </Text>

            {[
              {
                value: 'app' as PreferenciaContacto,
                icono: 'chatbubble-outline',
                titulo: 'Mensaje en esta app',
                desc: 'Más seguro y privado. Solo tú verás los mensajes.',
                recomendado: true,
              },
              {
                value: 'llamada' as PreferenciaContacto,
                icono: 'call-outline',
                titulo: 'Llamada telefónica',
                desc: 'El equipo te llamará en el horario que indiques.',
                recomendado: false,
              },
              {
                value: 'ninguno' as PreferenciaContacto,
                icono: 'eye-off-outline',
                titulo: 'No me contacten',
                desc: 'Yo revisaré el estado de mi caso en la app.',
                recomendado: false,
              },
            ].map(({ value, icono, titulo, desc, recomendado }) => {
              const selected = preferenciaContacto === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.contactoOption,
                    {
                      backgroundColor: selected ? colors.primarySubtle : colors.surface,
                      borderColor:     selected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setPreferenciaContacto(value)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.contactoIconBox, { backgroundColor: selected ? colors.primary : colors.surfaceVariant }]}>
                    <Ionicons name={icono as any} size={20} color={selected ? colors.textOnPrimary : colors.primary} />
                  </View>
                  <View style={styles.contactoTextos}>
                    <View style={styles.contactoTituloRow}>
                      <Text style={[styles.contactoTitulo, { color: colors.text }]}>{titulo}</Text>
                      {recomendado && (
                        <View style={[styles.recomendadoBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.recomendadoText}>Recomendado</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.contactoDesc, { color: colors.textSecondary }]}>{desc}</Text>
                  </View>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off-outline'}
                    size={20}
                    color={selected ? colors.primary : colors.textDisabled}
                  />
                </TouchableOpacity>
              );
            })}

            {/* Horario para llamada */}
            {preferenciaContacto === 'llamada' && (
              <View style={styles.horarioBox}>
                <Text style={[styles.horarioLabel, { color: colors.textSecondary }]}>
                  ¿En qué horario puedo llamarte?
                </Text>
                <TextInput
                  style={[
                    styles.horarioInput,
                    { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                  ]}
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

  const canContinue = () => {
    if (step === 0) return tipoViolencia !== null;
    if (step === 1) return relacionAgresor !== null;
    if (step === 2) return hayHeridos !== null;
    if (step === 3) return true;
    if (step === 4) return preferenciaContacto !== null;
    return false;
  };

  // ─── Render principal ─────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Barra superior */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        {/* Botón pánico */}
        <TouchableOpacity style={[styles.panicBtn, { backgroundColor: colors.surfaceVariant }]} onPress={handlePanic}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <ProgressBar step={step} colors={colors} />
          <StepLabel current={step} total={TOTAL_STEPS} colors={colors} />
        </View>

        {/* Botón SOS */}
        <TouchableOpacity style={[styles.sosBtn, { backgroundColor: colors.error }]} onPress={handleSOS}>
          <Text style={styles.sosBtnText}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* Contenido del paso con animación */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
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
              { backgroundColor: colors.primary, opacity: canContinue() ? 1 : 0.4 },
              step === 0 && styles.btnNextFull,
            ]}
            onPress={() => canContinue() && goToStep(step + 1)}
            disabled={!canContinue()}
          >
            <Text style={[styles.btnNextText, { color: colors.textOnPrimary }]}>
              {step === 3 ? 'Continuar sin evidencia' : 'Continuar'}
            </Text>
            <Ionicons name="arrow-forward-outline" size={18} color={colors.textOnPrimary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.btnSubmit, { backgroundColor: colors.primary, opacity: canContinue() && !isSubmitting ? 1 : 0.4 }]}
            onPress={handleSubmit}
            disabled={!canContinue() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <Ionicons name="send-outline" size={18} color={colors.textOnPrimary} />
            )}
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
  screen: { flex: 1 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 12,
  },
  topBarCenter: { flex: 1 },
  panicBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  sosBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 6,
  },
  sosBtnText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  // Scroll
  scroll:   { flex: 1 },
  content:  { paddingHorizontal: 20, paddingTop: 8 },

  // Step content
  stepQuestion: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 20,
    lineHeight: 28,
    marginBottom: 8,
  },
  stepHint: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  chipList: { gap: 2 },

  // Binary choice (heridos)
  binaryGroup: { gap: 12 },
  binaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  binaryBtnTexts: { flex: 1 },
  binaryBtnTitle: { fontFamily: 'Montserrat-ExtraBold', fontSize: 15 },
  binaryBtnDesc:  { fontFamily: 'Inter-Regular', fontSize: 13, marginTop: 2 },

  // Evidencia
  evidenciaBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
    overflow: 'hidden',
  },
  evidenciaBtnDisabled: { opacity: 0.7 },
  evidenciaBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  evidenciaIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenciaTextos:   { flex: 1 },
  evidenciaBtnTitle: { fontFamily: 'Montserrat-ExtraBold', fontSize: 14 },
  evidenciaBtnDesc:  { fontFamily: 'Inter-Regular', fontSize: 12, marginTop: 2 },
  fotoPreview:       { width: '100%', height: 180 },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    marginTop: -4,
  },
  retakeBtnText: { fontFamily: 'Inter-Regular', fontSize: 13 },
  proximamenteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proximamenteText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 10 },
  gpsStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  gpsStatusText: { fontFamily: 'Inter-Regular', fontSize: 12 },

  // Contacto
  contactoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  contactoIconBox: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactoTextos:    { flex: 1 },
  contactoTituloRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  contactoTitulo:    { fontFamily: 'Montserrat-ExtraBold', fontSize: 14 },
  contactoDesc:      { fontFamily: 'Inter-Regular', fontSize: 12, marginTop: 3 },
  recomendadoBadge:  { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  recomendadoText:   { fontFamily: 'Montserrat-ExtraBold', fontSize: 9, color: '#FFFFFF' },
  horarioBox:        { marginTop: 4, marginBottom: 8 },
  horarioLabel:      { fontFamily: 'Inter-Regular', fontSize: 13, marginBottom: 8 },
  horarioInput: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  btnBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  btnBackText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 14 },
  btnNext: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnNextFull:  { flex: 1 },
  btnNextText:  { fontFamily: 'Montserrat-ExtraBold', fontSize: 14 },
  btnSubmit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnSubmitText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 14 },

  // Confirmación
  confirmedScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 16,
  },
  confirmedIconBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  confirmedTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 22,
    textAlign: 'center',
    lineHeight: 30,
  },
  confirmedDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  tokenCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  tokenLabel: { fontFamily: 'Montserrat-ExtraBold', fontSize: 12, letterSpacing: 1 },
  tokenValue: { fontFamily: 'Montserrat-ExtraBold', fontSize: 28, letterSpacing: 3 },
  tokenHint:  { fontFamily: 'Inter-Regular', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  btnPrimary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 13,
    marginTop: 4,
  },
  btnPrimaryText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 15 },
  btnSecondary:   { paddingVertical: 10 },
  btnSecondaryText: { fontFamily: 'Inter-Regular', fontSize: 14, textDecorationLine: 'underline' },
  confirmedNote: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
});
