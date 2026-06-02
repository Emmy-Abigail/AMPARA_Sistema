import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { storage, StorageKeys } from '../store/storage';
import type { MainStackParamList } from '../types';

type Props = NativeStackScreenProps<MainStackParamList, 'Perfil'>;

// ─── Centros de salud ─────────────────────────────────────────────────────────

interface CentroSalud {
  nombre: string;
  telefono: string;
  direccion: string;
  lat: number;
  lng: number;
  maps: string;
}

interface CentroConDistancia extends CentroSalud {
  distanciaKm: number;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type HospitalEntry = { n: string; t: string; d: string; a: number; o: number };

// 617 hospitales de todo el Perú — funciona 100% offline usando GPS.
// Datos: OpenStreetMap (mayo 2026). Claves abreviadas para reducir tamaño.
function buscarTresMasCercanos(lat: number, lng: number): CentroConDistancia[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const data: HospitalEntry[] = require('../data/hospitales.json');
  return data
    .map((h) => ({
      nombre:      h.n,
      telefono:    h.t,
      direccion:   h.d,
      lat:         h.a,
      lng:         h.o,
      maps:        `https://maps.google.com/?q=${h.a},${h.o}`,
      distanciaKm: haversineKm(lat, lng, h.a, h.o),
    }))
    .sort((a, b) => a.distanciaKm - b.distanciaKm)
    .slice(0, 3);
}

// ─── Componente de fila de ajuste ─────────────────────────────────────────────

interface SettingRowProps {
  icono: string;
  label: string;
  descripcion?: string;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress?: () => void;
  rightElement?: React.ReactNode;
  peligroso?: boolean;
}

function SettingRow({ icono, label, descripcion, colors, onPress, rightElement, peligroso }: SettingRowProps) {
  const textColor = peligroso ? colors.error : colors.text;
  const iconColor = peligroso ? colors.error : colors.primary;

  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIconBox, { backgroundColor: peligroso ? colors.errorLight : colors.primarySubtle }]}>
        <Ionicons name={icono as any} size={18} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: textColor }]}>{label}</Text>
        {descripcion ? (
          <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>{descripcion}</Text>
        ) : null}
      </View>
      {rightElement ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} /> : null)}
    </TouchableOpacity>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function PerfilScreen({ navigation }: Props) {
  const { colors, mode, setThemeMode } = useTheme();
  const { usuario, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [notifAlertas, setNotifAlertas] = useState(true);
  const [notifEstado, setNotifEstado] = useState(true);
  const [buscandoCentros, setBuscandoCentros] = useState(false);
  const [centrosCercanos, setCentrosCercanos] = useState<CentroConDistancia[] | null>(null);

  useEffect(() => {
    Promise.all([
      storage.getItem(StorageKeys.NOTIF_ALERTAS),
      storage.getItem(StorageKeys.NOTIF_ESTADO_REPORTE),
    ]).then(([alertas, estado]) => {
      if (alertas !== null) setNotifAlertas(alertas === 'true');
      if (estado !== null) setNotifEstado(estado === 'true');
    });
  }, []);

  const toggleNotifAlertas = (val: boolean) => {
    setNotifAlertas(val);
    storage.setItem(StorageKeys.NOTIF_ALERTAS, String(val));
  };

  const toggleNotifEstado = (val: boolean) => {
    setNotifEstado(val);
    storage.setItem(StorageKeys.NOTIF_ESTADO_REPORTE, String(val));
  };

  const iniciales = `${usuario?.nombre?.charAt(0) ?? '?'}${usuario?.apellido?.charAt(0) ?? ''}`.toUpperCase();
  const ubicacion = [usuario?.distrito, usuario?.provincia, usuario?.departamento].filter(Boolean).join(', ');

  const handleBuscarCentros = async () => {
    setBuscandoCentros(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos tu ubicación para encontrar centros cercanos.');
        return;
      }

      // Intenta la última posición conocida primero (respuesta inmediata)
      let location = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });

      // Si no hay posición reciente, solicita una nueva con timeout de 8s
      if (!location) {
        location = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 8000),
          ),
        ]);
      }

      const { latitude, longitude } = location.coords;
      setCentrosCercanos(buscarTresMasCercanos(latitude, longitude));
    } catch (err: any) {
      if (err?.message === 'timeout') {
        Alert.alert(
          'Sin señal GPS',
          'No se pudo obtener tu ubicación a tiempo. Intenta de nuevo al aire libre.',
        );
      } else {
        Alert.alert('Error', 'No se pudo determinar tu ubicación.');
      }
    } finally {
      setBuscandoCentros(false);
    }
  };

  const handleCerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
      ],
    );
  };

  const TEMA_OPCIONES: { label: string; value: 'light' | 'dark' | 'system'; icono: string }[] = [
    { label: 'Claro',   value: 'light',  icono: 'sunny-outline'    },
    { label: 'Oscuro',  value: 'dark',   icono: 'moon-outline'     },
    { label: 'Sistema', value: 'system', icono: 'contrast-outline' },
  ];

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Encabezado */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back-outline" size={20} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>Inicio</Text>
      </TouchableOpacity>

      {/* Avatar y datos */}
      <View style={[styles.profileHeader, { backgroundColor: colors.surface }]}>
        <View style={[styles.avatarLarge, { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{iniciales}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.text }]}>
            {usuario?.nombre} {usuario?.apellido}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
            {usuario?.email}
          </Text>
          {ubicacion ? (
            <View style={styles.ubicacionRow}>
              <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.ubicacionText, { color: colors.textSecondary }]}>{ubicacion}</Text>
            </View>
          ) : null}
          <View style={[styles.rolBadge, { backgroundColor: colors.primarySubtle }]}>
            <Text style={[styles.rolText, { color: colors.primary }]}>
              {usuario?.rol === 'ciudadano' ? 'Ciudadano' : usuario?.rol === 'inspector' ? 'Inspector' : 'Admin'}
            </Text>
          </View>
        </View>
      </View>

      {/* Notificaciones */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Notificaciones</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <SettingRow
          icono="notifications-outline"
          label="Alertas en mi zona"
          descripcion="Recibe alertas cuando detecten criaderos cerca de ti"
          colors={colors}
          rightElement={
            <Switch
              value={notifAlertas}
              onValueChange={toggleNotifAlertas}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={notifAlertas ? colors.primary : colors.textDisabled}
            />
          }
        />
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <SettingRow
          icono="document-text-outline"
          label="Estado de mis reportes"
          descripcion="Notificaciones cuando tu reporte cambie de estado"
          colors={colors}
          rightElement={
            <Switch
              value={notifEstado}
              onValueChange={toggleNotifEstado}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={notifEstado ? colors.primary : colors.textDisabled}
            />
          }
        />
      </View>

      {/* Apariencia */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Apariencia</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.temaRow}>
          {TEMA_OPCIONES.map((op) => {
            const activo = mode === op.value;
            return (
              <TouchableOpacity
                key={op.value}
                style={[
                  styles.temaChip,
                  {
                    backgroundColor: activo ? colors.primary : colors.surfaceVariant,
                    borderColor: activo ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setThemeMode(op.value)}
              >
                <Ionicons
                  name={op.icono as any}
                  size={16}
                  color={activo ? colors.textOnPrimary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.temaText,
                    { color: activo ? colors.textOnPrimary : colors.textSecondary },
                    activo && { fontFamily: 'Montserrat-ExtraBold' },
                  ]}
                >
                  {op.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Cuenta y seguridad */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Cuenta y seguridad</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <SettingRow
          icono="person-outline"
          label="Editar perfil"
          descripcion="Nombre, teléfono y ubicación"
          colors={colors}
          onPress={() => navigation.navigate('EditarPerfil')}
        />
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <SettingRow
          icono="lock-closed-outline"
          label="Cambiar contraseña"
          colors={colors}
          onPress={() => navigation.navigate('CambiarPassword')}
        />
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <SettingRow
          icono="log-out-outline"
          label="Cerrar sesión"
          colors={colors}
          peligroso
          onPress={handleCerrarSesion}
        />
      </View>

      {/* Emergencia */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Emergencia</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {[
          { label: 'MINSA — Salud en Línea',       numero: '117', icono: 'medical-outline' },
          { label: 'SAMU — Emergencias Médicas',   numero: '106', icono: 'car-outline'     },
          { label: 'Central de Emergencias',        numero: '113', icono: 'shield-outline'  },
        ].map(({ label, numero, icono }, idx) => (
          <React.Fragment key={numero}>
            {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.divider }]} />}
            <TouchableOpacity
              style={styles.emergenciaLlamada}
              onPress={() => Linking.openURL(`tel:${numero}`)}
            >
              <View style={[styles.emergenciaIconBox, { backgroundColor: '#FFF3F3' }]}>
                <Ionicons name={icono as any} size={22} color={colors.error} />
              </View>
              <View style={styles.emergenciaTextos}>
                <Text style={[styles.emergenciaLabel, { color: colors.text }]}>{label}</Text>
                <Text style={[styles.emergenciaNumero, { color: colors.error }]}>{numero}</Text>
              </View>
              <View style={[styles.llamarBtn, { backgroundColor: colors.error }]}>
                <Ionicons name="call" size={16} color="#FFFFFF" />
                <Text style={styles.llamarText}>Llamar</Text>
              </View>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

      {/* Centros de salud cercanos */}
      <Text style={[styles.subsectionTitle, { color: colors.text }]}>Centros de salud cercanos</Text>

      {!centrosCercanos ? (
        <TouchableOpacity
          style={[styles.buscarBtn, { backgroundColor: colors.primary, opacity: buscandoCentros ? 0.7 : 1 }]}
          onPress={handleBuscarCentros}
          disabled={buscandoCentros}
        >
          {buscandoCentros ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="location-outline" size={18} color="#FFFFFF" />
          )}
          <Text style={styles.buscarBtnText}>
            {buscandoCentros ? 'Buscando...' : 'Encontrar los 3 más cercanos'}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {centrosCercanos.map((centro, idx) => (
            <React.Fragment key={centro.nombre}>
              {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.divider }]} />}
              <View style={styles.centroRow}>
                <View style={[styles.centroIconBox, { backgroundColor: colors.primarySubtle }]}>
                  <Ionicons name="business-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.centroContent}>
                  <View style={styles.centroTopRow}>
                    <Text style={[styles.centroNombre, { color: colors.text }]} numberOfLines={2}>
                      {centro.nombre}
                    </Text>
                    <View style={[styles.distanciaBadge, { backgroundColor: colors.primarySubtle }]}>
                      <Text style={[styles.distanciaText, { color: colors.primary }]}>
                        {centro.distanciaKm < 1
                          ? `${Math.round(centro.distanciaKm * 1000)} m`
                          : `${centro.distanciaKm.toFixed(1)} km`}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.centroDireccion, { color: colors.textSecondary }]}>
                    {centro.direccion}
                  </Text>
                  <View style={styles.centroAcciones}>
                    <TouchableOpacity
                      style={[styles.centroBtn, { borderColor: colors.primary }]}
                      onPress={() => Linking.openURL(`tel:${centro.telefono.replace(/[^0-9]/g, '')}`)}
                    >
                      <Ionicons name="call-outline" size={12} color={colors.primary} />
                      <Text style={[styles.centroBtnText, { color: colors.primary }]}>
                        {centro.telefono}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.centroBtn, { borderColor: colors.primary }]}
                      onPress={() => Linking.openURL(centro.maps)}
                    >
                      <Ionicons name="map-outline" size={12} color={colors.primary} />
                      <Text style={[styles.centroBtnText, { color: colors.primary }]}>Ver en mapa</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}

      <Text style={[styles.version, { color: colors.textDisabled }]}>
        SIVAPRE v1.0.0 — Sistema de Vigilancia Preventiva
      </Text>
    </ScrollView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { paddingHorizontal: 20 },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  backText: { fontFamily: 'Inter-Regular', fontSize: 14 },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 24 },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontFamily: 'Montserrat-ExtraBold', fontSize: 16 },
  profileEmail: { fontFamily: 'Inter-Regular', fontSize: 13 },
  ubicacionRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ubicacionText: { fontFamily: 'Inter-Regular', fontSize: 12 },
  rolBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 4,
  },
  rolText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 11 },

  sectionTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14,
    marginBottom: 10,
    marginTop: 4,
  },
  subsectionTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 13,
    marginBottom: 10,
    marginTop: 16,
  },

  card: {
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  divider: { height: 1, marginLeft: 56 },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: { flex: 1 },
  settingLabel: { fontFamily: 'Montserrat-ExtraBold', fontSize: 13 },
  settingDesc: { fontFamily: 'Inter-Regular', fontSize: 11, marginTop: 2 },

  temaRow: { flexDirection: 'row', gap: 8, padding: 14 },
  temaChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  temaText: { fontFamily: 'Inter-Regular', fontSize: 12 },

  emergenciaLlamada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  emergenciaIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergenciaTextos: { flex: 1 },
  emergenciaLabel: { fontFamily: 'Montserrat-ExtraBold', fontSize: 12 },
  emergenciaNumero: { fontFamily: 'Montserrat-ExtraBold', fontSize: 20 },
  llamarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  llamarText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 12, color: '#FFFFFF' },

  buscarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  buscarBtnText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 14, color: '#FFFFFF' },

  centroRow: { flexDirection: 'row', gap: 12, padding: 14, alignItems: 'flex-start' },
  centroIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  centroContent: { flex: 1, gap: 4 },
  centroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  centroNombre: { fontFamily: 'Montserrat-ExtraBold', fontSize: 12, lineHeight: 18, flex: 1 },
  distanciaBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  distanciaText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 11 },
  centroDireccion: { fontFamily: 'Inter-Regular', fontSize: 11 },
  centroAcciones: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  centroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  centroBtnText: { fontFamily: 'Inter-Regular', fontSize: 11 },

  version: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
});
