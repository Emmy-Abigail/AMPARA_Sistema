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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { storage, StorageKeys } from '../store/storage';
import type { MainStackParamList } from '../types';

type Props = NativeStackScreenProps<MainStackParamList, 'Perfil'>;

// ─── Fila de ajuste ───────────────────────────────────────────────────────────

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

  const [notifCasos,    setNotifCasos]    = useState(true);
  const [notifMensajes, setNotifMensajes] = useState(true);

  useEffect(() => {
    Promise.all([
      storage.getItem(StorageKeys.NOTIF_CASOS),
      storage.getItem(StorageKeys.NOTIF_MENSAJES),
    ]).then(([casos, mensajes]) => {
      if (casos    !== null) setNotifCasos(casos === 'true');
      if (mensajes !== null) setNotifMensajes(mensajes === 'true');
    });
  }, []);

  const toggleNotifCasos = (val: boolean) => {
    setNotifCasos(val);
    storage.setItem(StorageKeys.NOTIF_CASOS, String(val));
  };
  const toggleNotifMensajes = (val: boolean) => {
    setNotifMensajes(val);
    storage.setItem(StorageKeys.NOTIF_MENSAJES, String(val));
  };

  const iniciales = `${usuario?.nombre?.charAt(0) ?? '?'}${usuario?.apellido?.charAt(0) ?? ''}`.toUpperCase();

  const rolLabel: Record<string, string> = {
    usuario: 'Usuaria',
    operador: 'Operadora',
    admin: 'Admin',
  };

  const handleCerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás segura de que quieres cerrar sesión?',
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

  // Líneas de ayuda para violencia de género en Perú
  const LINEAS_AYUDA = [
    { label: 'Línea 100 — Apoyo a la Mujer',    numero: '100', icono: 'heart-outline',    color: '#E91E8C' },
    { label: 'Emergencias Policiales',           numero: '105', icono: 'shield-outline',   color: colors.error },
    { label: 'SAMU — Emergencias Médicas',       numero: '106', icono: 'car-outline',      color: colors.error },
    { label: 'Central de Emergencias',           numero: '911', icono: 'call-outline',     color: colors.error },
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
      {/* Botón volver */}
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
          {usuario?.telefono ? (
            <Text style={[styles.profileTelefono, { color: colors.textSecondary }]}>
              {usuario.telefono}
            </Text>
          ) : null}
          <View style={[styles.rolBadge, { backgroundColor: colors.primarySubtle }]}>
            <Text style={[styles.rolText, { color: colors.primary }]}>
              {rolLabel[usuario?.rol ?? 'usuario'] ?? 'Usuaria'}
            </Text>
          </View>
        </View>
      </View>

      {/* Notificaciones */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Notificaciones</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <SettingRow
          icono="folder-outline"
          label="Estado de mis casos"
          descripcion="Recibe notificaciones cuando tu caso cambie de estado"
          colors={colors}
          rightElement={
            <Switch
              value={notifCasos}
              onValueChange={toggleNotifCasos}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={notifCasos ? colors.primary : colors.textDisabled}
            />
          }
        />
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <SettingRow
          icono="chatbubble-outline"
          label="Mensajes del operador"
          descripcion="Notificaciones cuando recibas una respuesta"
          colors={colors}
          rightElement={
            <Switch
              value={notifMensajes}
              onValueChange={toggleNotifMensajes}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={notifMensajes ? colors.primary : colors.textDisabled}
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
          descripcion="Nombre, teléfono y preferencia de contacto"
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

      {/* Líneas de ayuda */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Líneas de ayuda</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {LINEAS_AYUDA.map(({ label, numero, icono, color }, idx) => (
          <React.Fragment key={numero}>
            {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.divider }]} />}
            <TouchableOpacity
              style={styles.lineaRow}
              onPress={() => Linking.openURL(`tel:${numero}`)}
            >
              <View style={[styles.lineaIconBox, { backgroundColor: color + '18' }]}>
                <Ionicons name={icono as any} size={22} color={color} />
              </View>
              <View style={styles.lineaTextos}>
                <Text style={[styles.lineaLabel, { color: colors.text }]}>{label}</Text>
                <Text style={[styles.lineaNumero, { color: color }]}>{numero}</Text>
              </View>
              <View style={[styles.llamarBtn, { backgroundColor: color }]}>
                <Ionicons name="call" size={14} color="#FFFFFF" />
                <Text style={styles.llamarText}>Llamar</Text>
              </View>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

      <Text style={[styles.version, { color: colors.textDisabled }]}>
        Ampara v1.0.0
      </Text>
    </ScrollView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll:    { flex: 1 },
  container: { paddingHorizontal: 20 },

  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backText:   { fontFamily: 'Inter-Regular', fontSize: 14 },

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
  avatarText:      { fontFamily: 'Montserrat-ExtraBold', fontSize: 24 },
  profileInfo:     { flex: 1, gap: 4 },
  profileName:     { fontFamily: 'Montserrat-ExtraBold', fontSize: 16 },
  profileEmail:    { fontFamily: 'Inter-Regular', fontSize: 13 },
  profileTelefono: { fontFamily: 'Inter-Regular', fontSize: 12 },
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

  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: { flex: 1 },
  settingLabel:   { fontFamily: 'Montserrat-ExtraBold', fontSize: 13 },
  settingDesc:    { fontFamily: 'Inter-Regular', fontSize: 11, marginTop: 2 },

  temaRow:  { flexDirection: 'row', gap: 8, padding: 14 },
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

  lineaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  lineaIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineaTextos: { flex: 1 },
  lineaLabel:  { fontFamily: 'Montserrat-ExtraBold', fontSize: 12 },
  lineaNumero: { fontFamily: 'Montserrat-ExtraBold', fontSize: 22 },
  llamarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  llamarText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 12, color: '#FFFFFF' },

  version: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
