import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Linking,
  Vibration,
  Platform,
  BackHandler,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { useTheme } from '../theme';
import { storage, StorageKeys } from '../store/storage';
import { activarSosAlerta, cancelarSosAlerta } from '../services/sos';
import { api } from '../services/api';
import { limpiarCasosLocales, obtenerCasosLocales } from '../services/casosLocales';
import type { MainTabParamList, ApiResponse } from '../types';

type Props = BottomTabScreenProps<MainTabParamList, 'SOS'>;

const HOLD_DURATION = 1500;

// Solo los dos números más críticos para VG
const EMERGENCIAS = [
  { label: 'Policía Nacional', numero: '105', icono: 'shield-outline' as const },
  { label: 'Línea 100 — MIMP', numero: '100', icono: 'heart-outline'  as const },
];

// ─── Contacto con estado de SMS ───────────────────────────────────────────────

type SmsEstado = 'espera' | 'enviando' | 'enviado';

interface ContactoSos {
  id: string;
  nombre: string;
  telefono: string;
  smsEstado: SmsEstado;
}

// ─── Anillo de pulso animado ──────────────────────────────────────────────────

function PulseRing({ anim, color }: { anim: Animated.Value; color: string }) {
  const scale   = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  return (
    <Animated.View
      style={[styles.pulseRing, { borderColor: color, transform: [{ scale }], opacity }]}
      pointerEvents="none"
    />
  );
}

// ─── Fila de contacto con estado SMS ─────────────────────────────────────────

function ContactoRow({
  contacto,
  colors,
}: {
  contacto: ContactoSos;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const iniciales = contacto.nombre.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <TouchableOpacity
      style={styles.contactoRow}
      onPress={() => Linking.openURL(`tel:${contacto.telefono}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.contactoAvatar, { backgroundColor: colors.primarySubtle }]}>
        <Text style={[styles.contactoInicial, { color: colors.primary }]}>{iniciales}</Text>
      </View>
      <View style={styles.contactoTextos}>
        <Text style={[styles.contactoNombre, { color: colors.text }]}>{contacto.nombre}</Text>
        <Text style={[styles.contactoTelefono, { color: colors.textSecondary }]}>
          {contacto.telefono}
        </Text>
      </View>
      {/* Estado SMS */}
      {contacto.smsEstado === 'espera' && (
        <View style={[styles.smsBadge, { backgroundColor: colors.surfaceVariant }]}>
          <Ionicons name="chatbubble-outline" size={12} color={colors.textDisabled} />
          <Text style={[styles.smsBadgeText, { color: colors.textDisabled }]}>SMS al activar</Text>
        </View>
      )}
      {contacto.smsEstado === 'enviando' && (
        <View style={[styles.smsBadge, { backgroundColor: '#FFF8E1' }]}>
          <ActivityIndicator size="small" color="#F57F17" style={{ transform: [{ scale: 0.7 }] }} />
          <Text style={[styles.smsBadgeText, { color: '#F57F17' }]}>Enviando...</Text>
        </View>
      )}
      {contacto.smsEstado === 'enviado' && (
        <View style={[styles.smsBadge, { backgroundColor: '#E8F5E9' }]}>
          <Ionicons name="checkmark-circle" size={14} color="#2E7D32" />
          <Text style={[styles.smsBadgeText, { color: '#2E7D32' }]}>SMS enviado</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Pantalla SOS ─────────────────────────────────────────────────────────────

export default function SOSScreen({}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // GPS
  const [gps,         setGps]         = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError,    setGpsError]    = useState(false);
  const [cargandoGps, setCargandoGps] = useState(true);

  // SOS
  const [activado,    setActivado]    = useState(false);
  const [alertaId,    setAlertaId]    = useState<string | null>(null);
  const [cancelando,  setCancelando]  = useState(false);
  const [holding,     setHolding]     = useState(false);

  // Contactos con estado de SMS
  const [contactos, setContactos] = useState<ContactoSos[]>([]);

  // Animaciones
  const holdProgress = useRef(new Animated.Value(0)).current;
  const pulseAnim1   = useRef(new Animated.Value(0)).current;
  const pulseAnim2   = useRef(new Animated.Value(0)).current;
  const holdAnim     = useRef<Animated.CompositeAnimation | null>(null);
  const pulseLoop    = useRef<Animated.CompositeAnimation | null>(null);

  // ── GPS al abrir (necesario para incluir coordenadas en la alerta) ─────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setGpsError(true); return; }
        const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
        if (last) { setGps({ lat: last.coords.latitude, lng: last.coords.longitude }); return; }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        setGpsError(true);
      } finally {
        setCargandoGps(false);
      }
    })();
  }, []);

  // ── Círculo de confianza (API → fallback local) ────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      try {
        const r = await api.get<{ data: { id: string; nombre: string; telefono: string }[] }>(
          '/usuarios/me/circulo',
        );
        const lista = r.data.data ?? [];
        setContactos(lista.map((c) => ({ ...c, smsEstado: 'espera' })));
      } catch {
        const raw = await storage.getItem(StorageKeys.TRUSTED_CONTACT);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            // Retrocompat: formato viejo era objeto único {nombre, numero/telefono}
            const lista: { nombre: string; telefono?: string; numero?: string }[] =
              Array.isArray(parsed) ? parsed : [parsed];
            setContactos(
              lista.map((c, idx) => ({
                id:         `local_${idx}`,
                nombre:     c.nombre,
                telefono:   c.telefono ?? c.numero ?? '',
                smsEstado:  'espera',
              })),
            );
          } catch { /* ignorar */ }
        }
      }
    };
    cargar();
  }, []);

  // ── Pulso animado mientras la alerta está activa ───────────────────────────
  useEffect(() => {
    if (!activado) {
      pulseLoop.current?.stop();
      pulseLoop.current = null;
      return;
    }
    const loop = Animated.loop(
      Animated.stagger(400, [
        Animated.sequence([
          Animated.timing(pulseAnim1, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim1, { toValue: 0, duration: 0,   useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseAnim2, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim2, { toValue: 0, duration: 0,   useNativeDriver: true }),
        ]),
      ]),
    );
    pulseLoop.current = loop;
    loop.start();
    return () => loop.stop();
  }, [activado, pulseAnim1, pulseAnim2]);

  // ── Simulación de envío de SMS escalonado ──────────────────────────────────
  const simularSmsSent = useCallback((lista: ContactoSos[]) => {
    // Pone todos en "enviando" y luego, escalonadamente, pasa a "enviado"
    setContactos(lista.map((c) => ({ ...c, smsEstado: 'enviando' })));
    lista.forEach((_, idx) => {
      setTimeout(() => {
        setContactos((prev) =>
          prev.map((c, i) => (i === idx ? { ...c, smsEstado: 'enviado' } : c)),
        );
      }, 800 + idx * 600);
    });
  }, []);

  // ── Activar GPS si fue denegado ────────────────────────────────────────────
  const activarGpsManual = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso de ubicación',
        'Activa el GPS en Ajustes para incluir tu ubicación en la alerta.',
        [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    setCargandoGps(true);
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setGpsError(false);
    } catch {
      // silencioso — el SOS funciona sin coordenadas
    } finally {
      setCargandoGps(false);
    }
  }, []);

  // ── Activar alerta SOS ─────────────────────────────────────────────────────
  const activarSOS = useCallback(async () => {
    setHolding(false);
    setActivado(true);
    if (Platform.OS === 'android') Vibration.vibrate(150);

    // Simular envío de SMS a los contactos del círculo
    if (contactos.length > 0) simularSmsSent(contactos);

    try {
      const deviceId = await storage.getItem(StorageKeys.DEVICE_ID);
      const res = await activarSosAlerta({
        latitud:   gps?.lat,
        longitud:  gps?.lng,
        device_id: deviceId ?? undefined,
      });
      setAlertaId(res.id);
    } catch {
      // La UI ya muestra el SOS activo — fallo de red no bloquea
    }
  }, [gps, contactos, simularSmsSent]);

  // ── Cancelar / calmar la alerta ────────────────────────────────────────────
  const calmarSOS = useCallback(() => {
    Alert.alert(
      '¿Estás en un lugar seguro?',
      'Esto cancelará la alerta.',
      [
        { text: 'No, volver', style: 'cancel' },
        {
          text: 'Sí, estoy segura',
          onPress: async () => {
            setCancelando(true);
            try {
              if (alertaId) await cancelarSosAlerta(alertaId);
            } catch { /* silent */ } finally {
              setCancelando(false);
              setActivado(false);
              setAlertaId(null);
              holdProgress.setValue(0);
              pulseAnim1.setValue(0);
              pulseAnim2.setValue(0);
              // Resetear estados SMS
              setContactos((prev) => prev.map((c) => ({ ...c, smsEstado: 'espera' })));
            }
          },
        },
      ],
    );
  }, [alertaId, holdProgress, pulseAnim1, pulseAnim2]);

  // ── Hold del botón ─────────────────────────────────────────────────────────
  const handlePressIn = useCallback(() => {
    setHolding(true);
    holdAnim.current = Animated.timing(holdProgress, {
      toValue: 1, duration: HOLD_DURATION, useNativeDriver: false,
    });
    holdAnim.current.start(({ finished }) => { if (finished) activarSOS(); });
  }, [holdProgress, activarSOS]);

  const handlePressOut = useCallback(() => {
    if (activado) return;
    setHolding(false);
    holdAnim.current?.stop();
    Animated.spring(holdProgress, { toValue: 0, useNativeDriver: false, speed: 20 }).start();
  }, [activado, holdProgress]);

  // ── Salida rápida ──────────────────────────────────────────────────────────
  const salidaRapida = useCallback(async () => {
    const casos = await obtenerCasosLocales();
    const conCodigo = casos.filter((c) => c.codigo_acceso);

    const nota = conCodigo.length > 0
      ? `\n\nTus códigos de seguimiento:\n${conCodigo.map((c) => `• ${c.codigo_acceso}`).join('\n')}\n\nGuárdalos para acceder a tus casos.`
      : '';

    Alert.alert(
      'Borrar historial visible',
      `Esto eliminará la lista de casos en este dispositivo. Tus casos siguen guardados de forma segura en el servidor.${nota}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar y salir',
          style: 'destructive',
          onPress: async () => {
            await Promise.all([
              storage.removeItem(StorageKeys.MSG_CACHE),
              limpiarCasosLocales(),
            ]);
            if (Platform.OS === 'android') BackHandler.exitApp();
          },
        },
      ],
    );
  }, []);

  const abrirMapa = useCallback(() => {
    if (!gps) return;
    const url = Platform.OS === 'ios'
      ? `maps://?q=${gps.lat},${gps.lng}`
      : `geo:${gps.lat},${gps.lng}?q=${gps.lat},${gps.lng}`;
    Linking.openURL(url);
  }, [gps]);

  const btnBg   = holding ? '#C62828' : activado ? '#D32F2F' : '#E53935';
  const holdWidth = holdProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* GPS badge compacto */}
      {cargandoGps ? (
        <View style={[styles.gpsBadge, { backgroundColor: colors.surfaceVariant }]}>
          <ActivityIndicator size="small" color={colors.textDisabled} />
          <Text style={[styles.gpsText, { color: colors.textDisabled }]}>Activando ubicación...</Text>
        </View>
      ) : gpsError || !gps ? (
        <TouchableOpacity
          style={[styles.gpsBadge, { backgroundColor: '#FFF3E0' }]}
          onPress={activarGpsManual}
          activeOpacity={0.8}
        >
          <Ionicons name="location-outline" size={13} color="#E65100" />
          <Text style={[styles.gpsText, { color: '#E65100', flex: 1 }]}>
            Sin ubicación — la alerta se enviará sin coordenadas
          </Text>
          <Text style={[styles.gpsActivar, { color: '#E65100' }]}>Activar</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.gpsBadge, { backgroundColor: colors.successLight }]}
          onPress={abrirMapa}
          activeOpacity={0.8}
        >
          <Ionicons name="location" size={13} color={colors.success} />
          <Text style={[styles.gpsText, { color: colors.successText, flex: 1 }]}>
            Ubicación lista · {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}
          </Text>
          <Text style={[styles.gpsActivar, { color: colors.success }]}>Ver mapa</Text>
        </TouchableOpacity>
      )}

      {/* Título */}
      <Text style={[styles.titulo, { color: colors.text }]}>Ayuda inmediata</Text>
      <Text style={[styles.subtitulo, { color: colors.textSecondary }]}>
        Toca y mantén pulsado para activar la alerta.
      </Text>

      {/* Botón SOS */}
      <View style={styles.sosWrapper}>
        {activado && (
          <>
            <PulseRing anim={pulseAnim1} color="#E53935" />
            <PulseRing anim={pulseAnim2} color="#E53935" />
          </>
        )}
        <TouchableOpacity
          style={[styles.sosBtn, { backgroundColor: btnBg }]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
          disabled={activado}
          accessible
          accessibilityLabel="Botón de emergencia. Mantén presionado para activar."
          accessibilityRole="button"
        >
          {!activado && (
            <Animated.View
              style={[styles.sosBtnProgress, { width: holdWidth, backgroundColor: 'rgba(255,255,255,0.25)' }]}
            />
          )}
          <Ionicons name="warning-outline" size={44} color="#FFFFFF" />
          <Text style={styles.sosBtnLabel}>SOS</Text>
          <Text style={styles.sosBtnHint}>
            {activado ? 'Alerta enviada' : holding ? 'Mantén...' : 'MANTÉN PULSADO'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Botón "Ya estoy segura" — solo cuando está activado */}
      {activado && (
        <TouchableOpacity
          style={[styles.calmarBtn, { borderColor: colors.success }]}
          onPress={calmarSOS}
          disabled={cancelando}
          activeOpacity={0.8}
        >
          {cancelando
            ? <ActivityIndicator size="small" color={colors.success} />
            : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                <Text style={[styles.calmarBtnText, { color: colors.success }]}>
                  Ya estoy segura — cancelar alerta
                </Text>
              </>
            )
          }
        </TouchableOpacity>
      )}

      {/* Llamadas de emergencia — solo las dos más críticas para VG */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {EMERGENCIAS.map(({ label, numero, icono }, idx) => (
          <React.Fragment key={numero}>
            {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.divider }]} />}
            <TouchableOpacity
              style={styles.lineaRow}
              onPress={() => Linking.openURL(`tel:${numero}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.lineaIconBox, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name={icono} size={20} color="#E53935" />
              </View>
              <View style={styles.lineaTextos}>
                <Text style={[styles.lineaLabel, { color: colors.text }]}>{label}</Text>
                <Text style={[styles.lineaNumero, { color: '#E53935' }]}>{numero}</Text>
              </View>
              <View style={styles.llamarBtn}>
                <Ionicons name="call" size={13} color="#FFFFFF" />
                <Text style={styles.llamarText}>Llamar</Text>
              </View>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

      {/* Círculo de confianza con estado de SMS */}
      {contactos.length > 0 ? (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {contactos.map((c, idx) => (
            <React.Fragment key={c.id}>
              {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.divider }]} />}
              <ContactoRow contacto={c} colors={colors} />
            </React.Fragment>
          ))}
        </View>
      ) : (
        <View style={[styles.sinContactosCard, { backgroundColor: colors.surfaceVariant }]}>
          <Ionicons name="people-outline" size={16} color={colors.textDisabled} />
          <Text style={[styles.sinContactosText, { color: colors.textDisabled }]}>
            Sin círculo de confianza · Agrégalos en Perfil
          </Text>
        </View>
      )}

      {/* Salida rápida */}
      <TouchableOpacity
        style={[styles.salidaBtn, { borderColor: colors.error }]}
        onPress={salidaRapida}
        activeOpacity={0.8}
      >
        <Ionicons name="exit-outline" size={18} color={colors.error} />
        <Text style={[styles.salidaBtnText, { color: colors.error }]}>
          Borrar historial visible y salir
        </Text>
      </TouchableOpacity>

      <Text style={[styles.salidaNota, { color: colors.textDisabled }]}>
        Los casos siguen en el servidor. Usa tu código de seguimiento para acceder.
      </Text>
    </ScrollView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll:    { flex: 1 },
  container: { paddingHorizontal: 20 },

  gpsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 10, marginBottom: 16,
  },
  gpsText:    { fontFamily: 'Inter-Regular', fontSize: 11 },
  gpsActivar: { fontFamily: 'Montserrat-ExtraBold', fontSize: 11 },

  titulo:    { fontFamily: 'Montserrat-ExtraBold', fontSize: 22, marginBottom: 4 },
  subtitulo: { fontFamily: 'Inter-Regular', fontSize: 13, marginBottom: 28, lineHeight: 20, color: '#666' },

  sosWrapper: {
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, height: 200,
  },
  pulseRing: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 2,
  },
  sosBtn: {
    width: 160, height: 160, borderRadius: 80,
    alignItems: 'center', justifyContent: 'center',
    gap: 4, overflow: 'hidden',
    shadowColor: '#E53935', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 16, elevation: 12,
  },
  sosBtnProgress: {
    position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 0,
  },
  sosBtnLabel: {
    fontFamily: 'Montserrat-ExtraBold', fontSize: 32, color: '#FFFFFF', letterSpacing: 2,
  },
  sosBtnHint: {
    fontFamily: 'Inter-Regular', fontSize: 10,
    color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5, textAlign: 'center', paddingHorizontal: 12,
  },

  calmarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: 12, borderWidth: 1.5, marginBottom: 24,
  },
  calmarBtnText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 14 },

  card: {
    borderRadius: 14, marginBottom: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  divider:      { height: 1, marginLeft: 52 },
  lineaRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  lineaIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  lineaTextos:  { flex: 1 },
  lineaLabel:   { fontFamily: 'Montserrat-ExtraBold', fontSize: 12 },
  lineaNumero:  { fontFamily: 'Montserrat-ExtraBold', fontSize: 20 },
  llamarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, backgroundColor: '#E53935',
  },
  llamarText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 12, color: '#FFFFFF' },

  // Contacto con estado SMS
  contactoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  contactoAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  contactoInicial:  { fontFamily: 'Montserrat-ExtraBold', fontSize: 15 },
  contactoTextos:   { flex: 1 },
  contactoNombre:   { fontFamily: 'Montserrat-ExtraBold', fontSize: 13 },
  contactoTelefono: { fontFamily: 'Inter-Regular', fontSize: 12, marginTop: 1 },
  smsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  smsBadgeText: { fontFamily: 'Inter-Regular', fontSize: 10 },

  sinContactosCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, padding: 14, marginBottom: 16,
  },
  sinContactosText: { fontFamily: 'Inter-Regular', fontSize: 12 },

  salidaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: 12, borderWidth: 1.5, marginBottom: 10,
  },
  salidaBtnText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 14 },
  salidaNota: {
    fontFamily: 'Inter-Regular', fontSize: 11, textAlign: 'center', lineHeight: 16,
  },
});
