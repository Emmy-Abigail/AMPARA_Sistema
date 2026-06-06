import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
  Alert,
  BackHandler,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import * as Location from 'expo-location';

import { useTheme } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { storage, StorageKeys } from '../store/storage';
import { api } from '../services/api';
import { ICONOS, aplicarIcono, type IconoId, type IconoOpcion } from '../services/iconCamouflage';
import { buscarServiciosLocales } from '../services/serviciosEstaticos';
import { limpiarCasosLocales, obtenerCasosLocales } from '../services/casosLocales';
import type { MainStackParamList } from '../types';

type Props = NativeStackScreenProps<MainStackParamList, 'Perfil'>;

interface Contacto {
  id: string;
  nombre: string;
  telefono: string;
  created_at: string;
}

interface ServicioInfo {
  nombre: string;
  lat: number;
  lon: number;
  telefono: string;
  distancia_km: number;
  distrito?: string;
  horario?: string;
}

// ─── Fila de servicio cercano ─────────────────────────────────────────────────

function ServicioRow({
  servicio,
  tipo,
  colors,
}: {
  servicio: ServicioInfo;
  tipo: 'comisaria' | 'cem';
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const accentColor = tipo === 'comisaria' ? '#1565C0' : '#6A1B9A';
  const icono       = tipo === 'comisaria' ? 'shield-outline' : 'heart-circle-outline';

  const abrirMapa = () => {
    const query = encodeURIComponent(servicio.nombre);
    const url   = Platform.OS === 'ios'
      ? `maps://?q=${query}&ll=${servicio.lat},${servicio.lon}`
      : `geo:${servicio.lat},${servicio.lon}?q=${query}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.lineaRow}>
      <View style={[styles.lineaIconBox, { backgroundColor: accentColor + '18' }]}>
        <Ionicons name={icono as any} size={22} color={accentColor} />
      </View>
      <View style={styles.lineaTextos}>
        <Text style={[styles.lineaLabel, { color: colors.text }]} numberOfLines={1}>
          {servicio.nombre}
        </Text>
        <Text style={[styles.servicioMeta, { color: colors.textSecondary }]}>
          {servicio.distrito ? `${servicio.distrito} · ` : ''}{servicio.distancia_km} km
          {servicio.horario ? ` · ${servicio.horario}` : ''}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <TouchableOpacity
          style={[styles.llamarBtn, { backgroundColor: accentColor }]}
          onPress={() => Linking.openURL(`tel:${servicio.telefono}`)}
          accessibilityLabel={`Llamar a ${servicio.nombre}`}
        >
          <Ionicons name="call" size={14} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.llamarBtn, { backgroundColor: colors.surfaceVariant }]}
          onPress={abrirMapa}
          accessibilityLabel={`Cómo llegar a ${servicio.nombre}`}
        >
          <Ionicons name="navigate-outline" size={14} color={accentColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

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

// ─── Sección círculo de confianza ─────────────────────────────────────────────
// Funciona en dos modos:
//   isGuest = false → API backend, máx 4 contactos (usuaria con cuenta)
//   isGuest = true  → AsyncStorage local, máx 1 contacto (usuaria sin cuenta)

function CirculoConfianza({
  colors,
  isGuest,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  isGuest: boolean;
}) {
  const maxContactos = isGuest ? 2 : 4;

  const [contactos,  setContactos]  = useState<Contacto[]>([]);
  const [cargando,   setCargando]   = useState(true);
  const [guardando,  setGuardando]  = useState(false);
  const [mostrando,  setMostrando]  = useState(false);
  const [nombre,     setNombre]     = useState('');
  const [telefono,   setTelefono]   = useState('');

  // ── Helpers para leer/escribir lista local de contactos (modo invitada) ───
  const _leerLocales = useCallback(async (): Promise<Contacto[]> => {
    const raw = await storage.getItem(StorageKeys.TRUSTED_CONTACT);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Retrocompat: el formato viejo era un objeto {nombre, numero/telefono}
    const lista: { nombre: string; telefono?: string; numero?: string }[] =
      Array.isArray(parsed) ? parsed : [parsed];
    return lista.map((c, idx) => ({
      id:         `local_${idx}`,
      nombre:     c.nombre,
      telefono:   c.telefono ?? c.numero ?? '',
      created_at: '',
    }));
  }, []);

  const _guardarLocales = useCallback(async (lista: Contacto[]) => {
    const payload = lista.map((c) => ({ nombre: c.nombre, telefono: c.telefono }));
    await storage.setItem(StorageKeys.TRUSTED_CONTACT, JSON.stringify(payload));
  }, []);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    try {
      if (isGuest) {
        setContactos(await _leerLocales());
      } else {
        const resp = await api.get<{ data: Contacto[] }>('/usuarios/me/circulo');
        setContactos(resp.data.data ?? []);
      }
    } catch {
      // Sin conexión — la lista queda vacía y el botón de agregar sigue visible
    } finally {
      setCargando(false);
    }
  }, [isGuest, _leerLocales]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Agregar ────────────────────────────────────────────────────────────────
  const agregar = async () => {
    const nom = nombre.trim();
    const tel = telefono.trim();
    if (!nom || !tel) return;

    setGuardando(true);
    try {
      if (isGuest) {
        const actuales = await _leerLocales();
        const nueva = [...actuales, { id: `local_${actuales.length}`, nombre: nom, telefono: tel, created_at: '' }];
        await _guardarLocales(nueva);
        setContactos(nueva);
      } else {
        const resp = await api.post<{ data: Contacto }>('/usuarios/me/circulo', { nombre: nom, telefono: tel });
        setContactos((prev) => [...prev, resp.data.data]);
      }
      setNombre('');
      setTelefono('');
      setMostrando(false);
    } catch (err: any) {
      const detalle = err?.response?.data?.detail ?? 'No se pudo agregar el contacto.';
      Alert.alert('Error', String(detalle));
    } finally {
      setGuardando(false);
    }
  };

  // ── Eliminar ───────────────────────────────────────────────────────────────
  const eliminar = (contacto: Contacto) => {
    Alert.alert(
      'Eliminar contacto',
      `¿Eliminar a ${contacto.nombre} del círculo de confianza?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isGuest) {
                const actuales = await _leerLocales();
                const filtrada = actuales.filter((c) => c.id !== contacto.id);
                await _guardarLocales(filtrada);
                setContactos(filtrada);
              } else {
                await api.delete(`/usuarios/me/circulo/${contacto.id}`);
                setContactos((prev) => prev.filter((c) => c.id !== contacto.id));
              }
            } catch {
              Alert.alert('Error', 'No se pudo eliminar. Intenta de nuevo.');
            }
          },
        },
      ],
    );
  };

  const puedeAgregar = contactos.length < maxContactos;

  if (cargando) {
    return (
      <ActivityIndicator size="small" color={colors.primary} style={{ alignSelf: 'flex-start', marginBottom: 8 }} />
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* Aviso para usuarias sin cuenta */}
      {isGuest && (
        <View style={[styles.settingRow, { paddingBottom: 0 }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textDisabled} style={{ marginLeft: 2 }} />
          <Text style={[styles.settingDesc, { color: colors.textDisabled, flex: 1 }]}>
            Solo en este dispositivo · Inicia sesión para sincronizar hasta 4 contactos
          </Text>
        </View>
      )}

      {/* Lista de contactos */}
      {contactos.map((c, idx) => (
        <React.Fragment key={c.id}>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <View style={[styles.settingRow, { paddingRight: 8 }]}>
            <View style={[styles.settingIconBox, { backgroundColor: colors.primarySubtle }]}>
              <Ionicons name="person-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{c.nombre}</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>{c.telefono}</Text>
            </View>
            <TouchableOpacity
              onPress={() => eliminar(c)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[styles.eliminarBtn, { backgroundColor: colors.errorLight }]}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </React.Fragment>
      ))}

      {/* Separador antes del formulario solo si ya hay contactos */}
      {contactos.length > 0 && !mostrando && <View style={[styles.divider, { backgroundColor: colors.divider }]} />}

      {/* Formulario inline */}
      {mostrando ? (
        <>
          {contactos.length > 0 && <View style={[styles.divider, { backgroundColor: colors.divider }]} />}
          <View style={styles.addForm}>
            <TextInput
              style={[styles.addInput, { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.border }]}
              placeholder="Nombre"
              placeholderTextColor={colors.textDisabled}
              value={nombre}
              onChangeText={setNombre}
              autoCapitalize="words"
              maxLength={100}
              autoFocus
            />
            <TextInput
              style={[styles.addInput, { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.border }]}
              placeholder="Teléfono (+51987654321)"
              placeholderTextColor={colors.textDisabled}
              value={telefono}
              onChangeText={setTelefono}
              keyboardType="phone-pad"
              maxLength={20}
            />
            <View style={styles.addFormBtns}>
              <TouchableOpacity
                style={[styles.addFormBtn, { borderColor: colors.border }]}
                onPress={() => { setMostrando(false); setNombre(''); setTelefono(''); }}
              >
                <Text style={[styles.addFormBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addFormBtn, styles.addFormBtnPrimary, { backgroundColor: colors.primary }]}
                onPress={agregar}
                disabled={guardando || !nombre.trim() || !telefono.trim()}
              >
                {guardando
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={[styles.addFormBtnText, { color: '#FFF' }]}>Guardar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : puedeAgregar ? (
        <TouchableOpacity style={styles.settingRow} onPress={() => setMostrando(true)} activeOpacity={0.7}>
          <View style={[styles.settingIconBox, { backgroundColor: colors.primarySubtle }]}>
            <Ionicons name="person-add-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingLabel, { color: colors.primary }]}>
              Agregar contacto{!isGuest && contactos.length > 0 ? ` (${contactos.length}/${maxContactos})` : ''}
            </Text>
            <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
              Recibirá un SMS cuando actives el SOS
            </Text>
          </View>
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.settingRow}>
          <View style={[styles.settingIconBox, { backgroundColor: colors.surfaceVariant }]}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.textSecondary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>
              {maxContactos} contacto{maxContactos > 1 ? 's' : ''} — límite alcanzado
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function PerfilScreen({ navigation }: Props) {
  const { colors, mode, setThemeMode } = useTheme();
  const { usuario, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [notifCasos,      setNotifCasos]      = useState(true);
  const [notifMensajes,   setNotifMensajes]   = useState(true);
  const [modoSilencioso,  setModoSilencioso]  = useState(false);
  const [iconoActivo,     setIconoActivo]     = useState<IconoId>('default');
  const [aplicandoIcono,  setAplicandoIcono]  = useState(false);
  const [serviciosCercanos, setServiciosCercanos] = useState<{ comisarias: ServicioInfo[]; cems: ServicioInfo[] } | null>(null);
  const [cargandoServicios, setCargandoServicios] = useState(false);
  const [serviciosBuscados, setServiciosBuscados] = useState(false);

  useEffect(() => {
    Promise.all([
      storage.getItem(StorageKeys.NOTIF_CASOS),
      storage.getItem(StorageKeys.NOTIF_MENSAJES),
      storage.getItem(StorageKeys.NOTIF_SILENCIOSO),
      storage.getItem(StorageKeys.ICONO_CAMUFLAJE),
    ]).then(([casos, mensajes, silencioso, icono]) => {
      if (casos      !== null) setNotifCasos(casos === 'true');
      if (mensajes   !== null) setNotifMensajes(mensajes === 'true');
      if (silencioso !== null) setModoSilencioso(silencioso === 'true');
      if (icono      !== null) setIconoActivo(icono as IconoId);
    });
  }, []);

  const buscarServicios = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso de ubicación',
        'Para ver servicios cercanos, activa el GPS en Ajustes.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    setCargandoServicios(true);
    setServiciosBuscados(true);
    try {
      const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
      const pos  = last ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lon } = pos.coords;
      try {
        // Intenta el servidor primero (puede incluir datos en tiempo real de Mininter)
        const r = await api.get<{ data: { comisarias: ServicioInfo[]; cems: ServicioInfo[] } }>(
          '/servicios/cercanos',
          { params: { lat, lon }, timeout: 5000 },
        );
        setServiciosCercanos(r.data.data);
      } catch {
        // Fallback offline: dataset estático incluido en la app
        setServiciosCercanos(buscarServiciosLocales(lat, lon));
      }
    } catch {
      Alert.alert(
        'Sin ubicación',
        'No se pudo obtener tu posición GPS. Intenta de nuevo.',
      );
      setServiciosBuscados(false);
    } finally {
      setCargandoServicios(false);
    }
  }, []);

  const toggleNotifCasos = (val: boolean) => {
    setNotifCasos(val);
    storage.setItem(StorageKeys.NOTIF_CASOS, String(val));
  };
  const toggleNotifMensajes = (val: boolean) => {
    setNotifMensajes(val);
    storage.setItem(StorageKeys.NOTIF_MENSAJES, String(val));
  };
  const toggleModoSilencioso = (val: boolean) => {
    setModoSilencioso(val);
    storage.setItem(StorageKeys.NOTIF_SILENCIOSO, String(val));
  };

  const seleccionarIcono = async (opcion: IconoOpcion) => {
    if (aplicandoIcono || opcion.id === iconoActivo) return;
    setAplicandoIcono(true);
    const exito = await aplicarIcono(opcion);
    if (exito || opcion.id === 'default') {
      setIconoActivo(opcion.id);
      storage.setItem(StorageKeys.ICONO_CAMUFLAJE, opcion.id);
    } else {
      // El paquete no está disponible en esta build — guarda la preferencia igual
      setIconoActivo(opcion.id);
      storage.setItem(StorageKeys.ICONO_CAMUFLAJE, opcion.id);
      Alert.alert(
        'Ícono guardado',
        'La preferencia fue guardada. El ícono de camuflaje se aplicará en la próxima actualización de la app.',
        [{ text: 'Entendido' }],
      );
    }
    setAplicandoIcono(false);
  };

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


  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Botón volver */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back-outline" size={20} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>Inicio</Text>
      </TouchableOpacity>

      {/* Avatar y datos */}
      <View style={[styles.profileHeader, { backgroundColor: colors.surface }]}>
        <View style={[styles.avatarLarge, {
          backgroundColor: usuario ? colors.primarySubtle : colors.surfaceVariant,
          borderColor: usuario ? colors.primary : colors.border,
        }]}>
          {usuario
            ? <Text style={[styles.avatarText, { color: colors.primary }]}>{iniciales}</Text>
            : <Ionicons name="person-outline" size={28} color={colors.textDisabled} />
          }
        </View>
        <View style={styles.profileInfo}>
          {usuario ? (
            <>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {usuario.nombre} {usuario.apellido}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                {usuario.email}
              </Text>
              {usuario.telefono ? (
                <Text style={[styles.profileTelefono, { color: colors.textSecondary }]}>
                  {usuario.telefono}
                </Text>
              ) : null}
              <View style={[styles.rolBadge, { backgroundColor: colors.primarySubtle }]}>
                <Text style={[styles.rolText, { color: colors.primary }]}>
                  {rolLabel[usuario.rol ?? 'usuario'] ?? 'Usuaria'}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.profileName, { color: colors.text }]}>Usuaria anónima</Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                Sin cuenta — datos solo en este dispositivo
              </Text>
              <View style={[styles.rolBadge, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.rolText, { color: colors.textSecondary }]}>Modo anónimo</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Círculo de confianza — visible siempre; modo API si hay cuenta, local si es invitada */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Círculo de confianza</Text>
      <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
        Cuando actives el SOS, Ampara les enviará tu ubicación por SMS automáticamente.
      </Text>
      <CirculoConfianza colors={colors} isGuest={!usuario} />

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
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <SettingRow
          icono="volume-mute-outline"
          label="Modo silencioso total"
          descripcion="Sin notificaciones. Recomendado cuando el riesgo es alto."
          colors={colors}
          rightElement={
            <Switch
              value={modoSilencioso}
              onValueChange={toggleModoSilencioso}
              trackColor={{ false: colors.border, true: colors.errorLight }}
              thumbColor={modoSilencioso ? colors.error : colors.textDisabled}
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

      {/* Ícono de camuflaje */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Ícono de camuflaje</Text>
      <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
        Cambia el ícono de la app para que parezca otra aplicación. Solo visible en tu pantalla de inicio.
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface, padding: 14 }]}>
        <View style={styles.iconosGrid}>
          {ICONOS.map((op) => {
            const activo = iconoActivo === op.id;
            return (
              <TouchableOpacity
                key={op.id}
                style={[
                  styles.iconoChip,
                  {
                    backgroundColor: activo ? colors.primarySubtle : colors.surfaceVariant,
                    borderColor: activo ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => seleccionarIcono(op)}
                disabled={aplicandoIcono}
                activeOpacity={0.7}
                accessibilityLabel={`Ícono ${op.label}`}
              >
                <Text style={styles.iconoEmoji}>{op.emoji}</Text>
                <Text
                  style={[
                    styles.iconoLabel,
                    { color: activo ? colors.primary : colors.textSecondary },
                    activo && { fontFamily: 'Montserrat-ExtraBold' },
                  ]}
                >
                  {op.label}
                </Text>
                {activo && (
                  <View style={[styles.iconoCheck, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={10} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Cuenta y seguridad */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Cuenta y seguridad</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {usuario ? (
          <>
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
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          </>
        ) : (
          <>
            <View style={[styles.settingRow, { paddingBottom: 12 }]}>
              <View style={[styles.settingIconBox, { backgroundColor: colors.primarySubtle }]}>
                <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Modo anónimo</Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                  Tus datos se guardan solo en este dispositivo. Crea una cuenta para sincronizarlos y poder recuperarlos.
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          </>
        )}
        <SettingRow
          icono="exit-outline"
          label="Salir y borrar historial visible"
          descripcion="Cierra la app y limpia mensajes en caché"
          colors={colors}
          peligroso
          onPress={salidaRapida}
        />
      </View>

      {/* Servicios cerca de ti */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Servicios cerca de ti</Text>
      <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
        Las 4 comisarías y los 2 CEMs más cercanos a tu ubicación actual.
      </Text>

      {/* Botón para buscar — solo cuando aún no se ha buscado */}
      {!serviciosBuscados && !cargandoServicios && (
        <TouchableOpacity
          style={[styles.buscarServiciosBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={buscarServicios}
          activeOpacity={0.8}
        >
          <Ionicons name="location-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.buscarServiciosBtnLabel, { color: colors.primary }]}>
              Buscar servicios más cercanos
            </Text>
            <Text style={[styles.buscarServiciosBtnDesc, { color: colors.textSecondary }]}>
              Requiere GPS activo · Las 4 comisarías y 2 CEMs más próximos
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
        </TouchableOpacity>
      )}

      {cargandoServicios && (
        <View style={[styles.card, { backgroundColor: colors.surface, padding: 20, alignItems: 'center' }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {serviciosBuscados && !cargandoServicios && serviciosCercanos && (
        <>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {[
              ...serviciosCercanos.comisarias.map((s) => ({ ...s, tipo: 'comisaria' as const })),
              ...serviciosCercanos.cems.map((s) => ({ ...s, tipo: 'cem' as const })),
            ].map((s, idx) => (
              <React.Fragment key={s.nombre}>
                {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.divider }]} />}
                <ServicioRow servicio={s} tipo={s.tipo} colors={colors} />
              </React.Fragment>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.refrescarBtn, { borderColor: colors.border }]}
            onPress={buscarServicios}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.refrescarText, { color: colors.textSecondary }]}>
              Actualizar ubicación
            </Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={[styles.version, { color: colors.textDisabled }]}>
        Ampara v2.0.0
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
    marginBottom: 6,
    marginTop: 4,
  },
  sectionDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
    marginTop: -2,
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

  eliminarBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addForm: { padding: 14, gap: 10 },
  addInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  addFormBtns: { flexDirection: 'row', gap: 10 },
  addFormBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  addFormBtnPrimary: { borderWidth: 0 },
  addFormBtnText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 13 },

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
  lineaTextos:  { flex: 1 },
  lineaLabel:   { fontFamily: 'Montserrat-ExtraBold', fontSize: 12 },
  lineaNumero:  { fontFamily: 'Montserrat-ExtraBold', fontSize: 22 },
  servicioMeta: { fontFamily: 'Inter-Regular', fontSize: 11, marginTop: 2, lineHeight: 16 },
  llamarBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  llamarText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 12, color: '#FFFFFF' },

  version: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },

  buscarServiciosBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  buscarServiciosBtnLabel: { fontFamily: 'Montserrat-ExtraBold', fontSize: 13 },
  buscarServiciosBtnDesc:  { fontFamily: 'Inter-Regular', fontSize: 11, marginTop: 2 },

  refrescarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, marginBottom: 20,
  },
  refrescarText: { fontFamily: 'Inter-Regular', fontSize: 12 },

  iconosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconoChip: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    position: 'relative',
  },
  iconoEmoji: { fontSize: 22 },
  iconoLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    flex: 1,
  },
  iconoCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
