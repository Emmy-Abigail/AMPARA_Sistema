import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../theme';
import { useDenuncia, useMensajesCaso, useResponderMensaje } from '../hooks/useDenuncias';
import { useCasosLocales, casoLocalADenuncia } from '../hooks/useCasosLocales';
import { denunciasService } from '../services/denuncias';
import type { MainStackParamList, EstadoCaso, Denuncia, MensajeCaso, NivelRiesgo } from '../types';

type Props = NativeStackScreenProps<MainStackParamList, 'ReporteDetalle'>;

// ─── Pipeline de estados ──────────────────────────────────────────────────────

const PIPELINE_ESTADOS: EstadoCaso[] = ['nueva', 'asignada', 'en_seguimiento', 'derivada', 'cerrada'];

const ESTADO_LABEL: Record<EstadoCaso, string> = {
  nueva:                  'Nueva',
  asignada:               'Asignada',
  en_seguimiento:         'En seguimiento',
  derivada:               'Derivada',
  pendiente_confirmacion: 'Pendiente',
  cerrada:                'Cerrada',
};

const ESTADO_COLOR = (estado: EstadoCaso, c: ReturnType<typeof useTheme>['colors']) => ({
  nueva:                  c.primary,
  asignada:               '#3B82F6',
  en_seguimiento:         c.warning,
  derivada:               '#F97316',
  pendiente_confirmacion: c.warning,
  cerrada:                c.textDisabled,
}[estado]);

// ─── Respuestas rápidas disponibles para la víctima ───────────────────────────

const RESPUESTAS_RAPIDAS = [
  { label: 'Estoy segura ✓',         value: 'Estoy segura.' },
  { label: 'Necesito ayuda ahora 🆘', value: 'Necesito ayuda ahora.' },
  { label: 'Él sigue aquí ⚠',        value: 'Él sigue aquí.' },
  { label: 'Entendido',               value: 'Entendido.' },
];

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function PipelineBar({
  estado, colors,
}: { estado: EstadoCaso; colors: ReturnType<typeof useTheme>['colors'] }) {
  const idxActual = PIPELINE_ESTADOS.indexOf(estado === 'pendiente_confirmacion' ? 'en_seguimiento' : estado);
  return (
    <View style={pipeline.container}>
      {PIPELINE_ESTADOS.map((e, i) => {
        const pasado  = i < idxActual;
        const activo  = i === idxActual;
        const color   = activo || pasado ? ESTADO_COLOR(e, colors) : colors.border;
        return (
          <React.Fragment key={e}>
            <View style={pipeline.step}>
              <View style={[pipeline.dot, { backgroundColor: activo || pasado ? color : colors.surface, borderColor: color }]}>
                {pasado && <Ionicons name="checkmark" size={10} color="#fff" />}
                {activo && <View style={[pipeline.dotInner, { backgroundColor: '#fff' }]} />}
              </View>
              <Text
                style={[
                  pipeline.label,
                  { color: activo ? color : pasado ? colors.textSecondary : colors.textDisabled },
                  activo && { fontFamily: 'Montserrat-ExtraBold' },
                ]}
                numberOfLines={1}
              >
                {ESTADO_LABEL[e]}
              </Text>
            </View>
            {i < PIPELINE_ESTADOS.length - 1 && (
              <View style={[pipeline.line, { backgroundColor: pasado ? color : colors.border }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}
const pipeline = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, paddingHorizontal: 4 },
  step:  { alignItems: 'center', gap: 4, flex: 0 },
  dot: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  dotInner: { width: 8, height: 8, borderRadius: 4 },
  line: { flex: 1, height: 2, marginTop: 11, marginHorizontal: 2 },
  label: { fontFamily: 'Inter-Regular', fontSize: 9, textAlign: 'center', width: 52 },
});

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

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function ReporteDetalleScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Estado canal de mensajes
  const [respuestaTexto, setRespuestaTexto] = useState('');
  const [enviandoResp, setEnviandoResp]     = useState(false);

  // Estado formulario "agregar información"
  const [mostrarFormInfo, setMostrarFormInfo] = useState(false);
  const [infoTexto, setInfoTexto]             = useState('');
  const [infoFotoUri, setInfoFotoUri]         = useState<string | null>(null);
  const [subiendoInfo, setSubiendoInfo]       = useState(false);

  const { casos } = useCasosLocales();
  const casoLocal = casos.find(c => c.local_id === id || c.denuncia_id === id);
  const esSoloLocal = casoLocal !== undefined && casoLocal.denuncia_id === null;
  const apiId = esSoloLocal ? '' : (casoLocal?.denuncia_id ?? id);

  const { data: apiDenuncia, isLoading: apiLoading } = useDenuncia(apiId);
  const { data: mensajes } = useMensajesCaso(apiId);

  const denuncia: Denuncia | null = apiDenuncia ?? (casoLocal ? casoLocalADenuncia(casoLocal) : null);
  const isLoading = !esSoloLocal && apiLoading && !casoLocal;
  const pendienteSincronizacion = esSoloLocal;

  // Token anónimo para autorizar respuestas sin sesión
  const tokenAnonimo = casoLocal?.token_anonimo ?? apiDenuncia?.token_anonimo;

  const responderMutation = useResponderMensaje(apiId);

  const handleResponder = async (texto: string) => {
    if (!texto.trim() || !apiId) return;
    setEnviandoResp(true);
    try {
      await responderMutation.mutateAsync({ contenido: texto, tokenAnonimo });
      setRespuestaTexto('');
    } catch {
      // Silencioso — no mostrar error sensible en pantalla
    } finally {
      setEnviandoResp(false);
    }
  };

  const handleTomarFotoInfo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'] as any,
      quality: 0.7,
      saveToPhotos: false,
    });
    if (!result.canceled && result.assets[0]) {
      setInfoFotoUri(result.assets[0].uri);
    }
  };

  const handleAgregarInfo = async () => {
    if (!infoTexto.trim() && !infoFotoUri) return;
    if (!apiId) return;
    setSubiendoInfo(true);
    try {
      let contenido = infoTexto.trim();
      if (infoFotoUri) {
        const fotoUrl = await denunciasService.subirFoto(infoFotoUri);
        contenido = [contenido, `📷 ${fotoUrl}`].filter(Boolean).join('\n');
      }
      await responderMutation.mutateAsync({ contenido, tokenAnonimo });
      setMostrarFormInfo(false);
      setInfoTexto('');
      setInfoFotoUri(null);
    } catch {
      Alert.alert('Error', 'No se pudo enviar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setSubiendoInfo(false);
    }
  };

  const cancelarFormInfo = () => {
    setMostrarFormInfo(false);
    setInfoTexto('');
    setInfoFotoUri(null);
  };

  // ── Loading / Error ─────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!denuncia) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>No se pudo cargar el caso.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.errorLink, { color: colors.primary }]}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const estadoColor = ESTADO_COLOR(denuncia.estado, colors);
  const fecha = new Date(denuncia.fecha_denuncia).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const tiposDisplay = denuncia.tipos_violencia?.join(', ')
    ?? denuncia.tipo_violencia
    ?? '—';

  const filas = [
    { icono: 'alert-circle-outline', label: 'Tipo de violencia',   valor: tiposDisplay },
    { icono: 'person-outline',       label: '¿Quién es?',          valor: denuncia.relacion_agresor },
    { icono: 'medkit-outline',       label: '¿Hay heridos?',       valor: denuncia.hay_heridos ? 'Sí' : 'No' },
    ...(denuncia.latitud != null ? [{
      icono: 'location-outline',
      label: 'Ubicación capturada',
      valor: `${denuncia.latitud.toFixed(5)}, ${denuncia.longitud?.toFixed(5)}`,
    }] : []),
    {
      icono: 'chatbubble-outline',
      label: 'Contacto preferido',
      valor: denuncia.preferencia_contacto === 'app'
        ? 'Mensaje en app' : denuncia.preferencia_contacto === 'llamada'
        ? 'Llamada telefónica' : 'Sin contacto directo',
    },
    ...(denuncia.descripcion ? [{
      icono: 'document-text-outline',
      label: 'Comentario adicional',
      valor: denuncia.descripcion,
    }] : []),
  ];

  const mensajesOperador = mensajes?.filter((m) => m.autor === 'operador' || m.autor === 'sistema') ?? [];
  const misRespuestas    = mensajes?.filter((m) => m.autor === 'usuaria') ?? [];

  // ── Render ──────────────────────────────────────────────────────────────

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
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back-outline" size={20} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>Mis casos</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTextos}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>
            {denuncia.token_anonimo ?? 'Caso'}
          </Text>
          <Text style={[styles.fecha, { color: colors.textSecondary }]}>{fecha}</Text>
        </View>
        <View style={[styles.estadoBadge, { backgroundColor: (estadoColor ?? colors.primary) + '20' }]}>
          <Text style={[styles.estadoText, { color: estadoColor ?? colors.primary }]}>
            {ESTADO_LABEL[denuncia.estado]}
          </Text>
        </View>
      </View>

      {/* Pipeline */}
      <PipelineBar estado={denuncia.estado} colors={colors} />

      {/* Banner sync */}
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

      {/* Canal de mensajes bidireccional */}
      {!pendienteSincronizacion && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Mensajes de seguimiento</Text>

          {mensajesOperador.length === 0 ? (
            <View style={[styles.mensajesVacio, { backgroundColor: colors.surface }]}>
              <Ionicons name="chatbubble-outline" size={28} color={colors.textDisabled} />
              <Text style={[styles.mensajesVacioText, { color: colors.textSecondary }]}>
                Aquí aparecerán los mensajes del operador asignado a tu caso.
              </Text>
            </View>
          ) : (
            mensajesOperador.map((msg) => (
              <View
                key={msg.id}
                style={[styles.mensajeCard, { backgroundColor: colors.primarySubtle, borderLeftColor: colors.primary }]}
              >
                <View style={styles.mensajeHeader}>
                  <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
                  <Text style={[styles.mensajeAutor, { color: colors.primary }]}>Operador</Text>
                  <Text style={[styles.mensajeFecha, { color: colors.textDisabled }]}>
                    {new Date(msg.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={[styles.mensajeContenido, { color: colors.text }]}>{msg.contenido}</Text>
              </View>
            ))
          )}

          {/* Mis respuestas anteriores */}
          {misRespuestas.map((msg) => (
            <View
              key={msg.id}
              style={[styles.mensajeCard, styles.miRespuesta, { backgroundColor: colors.surface, borderLeftColor: colors.textSecondary }]}
            >
              <View style={styles.mensajeHeader}>
                <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.mensajeAutor, { color: colors.textSecondary }]}>Tú</Text>
                <Text style={[styles.mensajeFecha, { color: colors.textDisabled }]}>
                  {new Date(msg.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Text style={[styles.mensajeContenido, { color: colors.text }]}>{msg.contenido}</Text>
            </View>
          ))}

          {/* Respuestas rápidas */}
          <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Respuesta rápida:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rpScroll}>
            {RESPUESTAS_RAPIDAS.map(({ label, value }) => (
              <TouchableOpacity
                key={label}
                style={[styles.rpChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleResponder(value)}
                activeOpacity={0.75}
                disabled={enviandoResp}
              >
                <Text style={[styles.rpChipText, { color: colors.primary }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Campo de texto libre */}
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.respuestaInput, { color: colors.text }]}
              value={respuestaTexto}
              onChangeText={setRespuestaTexto}
              placeholder="Escribe un mensaje al operador..."
              placeholderTextColor={colors.textDisabled}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: respuestaTexto.trim() ? colors.primary : colors.border }]}
              onPress={() => handleResponder(respuestaTexto)}
              disabled={!respuestaTexto.trim() || enviandoResp}
            >
              {enviandoResp
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={16} color="#FFFFFF" />
              }
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Botón / formulario de información adicional */}
      {!pendienteSincronizacion && !mostrarFormInfo && (
        <TouchableOpacity
          style={[styles.addInfoBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setMostrarFormInfo(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.addInfoText, { color: colors.primary }]}>
            Agregar información o evidencia nueva
          </Text>
        </TouchableOpacity>
      )}

      {!pendienteSincronizacion && mostrarFormInfo && (
        <View style={[styles.infoForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.infoFormTitle, { color: colors.text }]}>Nueva información para tu caso</Text>
          <TextInput
            style={[styles.infoInput, { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.border }]}
            value={infoTexto}
            onChangeText={setInfoTexto}
            placeholder="Describe lo que quieres agregar..."
            placeholderTextColor={colors.textDisabled}
            multiline
            maxLength={500}
            autoFocus
          />

          {/* Foto opcional */}
          <TouchableOpacity
            style={[styles.infoFotoBtn, { borderColor: colors.border }]}
            onPress={handleTomarFotoInfo}
            activeOpacity={0.8}
          >
            {infoFotoUri ? (
              <Image source={{ uri: infoFotoUri }} style={styles.infoFotoPreview} resizeMode="cover" />
            ) : (
              <>
                <Ionicons name="camera-outline" size={18} color={colors.primary} />
                <Text style={[styles.infoFotoBtnText, { color: colors.primary }]}>Adjuntar foto (opcional)</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.infoFormBtns}>
            <TouchableOpacity
              style={[styles.infoFormBtn, { borderColor: colors.border }]}
              onPress={cancelarFormInfo}
              disabled={subiendoInfo}
            >
              <Text style={[styles.infoFormBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.infoFormBtn,
                styles.infoFormBtnPrimary,
                { backgroundColor: (infoTexto.trim() || infoFotoUri) ? colors.primary : colors.border },
              ]}
              onPress={handleAgregarInfo}
              disabled={(!infoTexto.trim() && !infoFotoUri) || subiendoInfo}
            >
              {subiendoInfo
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={[styles.infoFormBtnText, { color: '#fff' }]}>Enviar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Nota de seguridad */}
      <View style={[styles.notaSeguridad, { backgroundColor: colors.surfaceVariant }]}>
        <Ionicons name="lock-closed-outline" size={14} color={colors.textDisabled} />
        <Text style={[styles.notaSeguridadText, { color: colors.textDisabled }]}>
          Los mensajes se eliminan al cerrar sesión · Cifrado de extremo a extremo
        </Text>
      </View>

      <Text style={[styles.actualizacion, { color: colors.textDisabled }]}>
        Última actualización:{' '}
        {new Date(denuncia.fecha_actualizacion).toLocaleDateString('es-PE', {
          day: 'numeric', month: 'long', year: 'numeric',
        })}
      </Text>
    </ScrollView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll:    { flex: 1 },
  container: { paddingHorizontal: 20 },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 15, textAlign: 'center' },
  errorLink: { fontFamily: 'Montserrat-ExtraBold', fontSize: 14 },

  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backText:   { fontFamily: 'Inter-Regular', fontSize: 14 },

  headerRow:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 },
  headerTextos: { flex: 1, gap: 4 },
  pageTitle:    { fontFamily: 'Montserrat-ExtraBold', fontSize: 22 },
  fecha:        { fontFamily: 'Inter-Regular', fontSize: 13 },
  estadoBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginTop: 4 },
  estadoText:   { fontFamily: 'Montserrat-ExtraBold', fontSize: 12 },

  syncBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginBottom: 16 },
  syncText:   { fontFamily: 'Inter-Regular', fontSize: 12, flex: 1, lineHeight: 18 },

  foto:          { width: '100%', height: 200, borderRadius: 14, marginBottom: 20 },
  fotoVacia:     { height: 90, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 20, gap: 8 },
  fotoVaciaText: { fontFamily: 'Inter-Regular', fontSize: 13 },

  sectionTitle: { fontFamily: 'Montserrat-ExtraBold', fontSize: 15, marginBottom: 10 },
  subLabel:     { fontFamily: 'Montserrat-ExtraBold', fontSize: 12, marginBottom: 8 },

  card: {
    borderRadius: 14, paddingHorizontal: 16, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  fila:         { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  filaIconBox:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filaContent:  { flex: 1, gap: 3 },
  filaLabel:    { fontFamily: 'Montserrat-ExtraBold', fontSize: 11, letterSpacing: 0.3 },
  filaValor:    { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 20 },
  filaDivider:  { height: 1, marginLeft: 48 },

  mensajesVacio:     {
    borderRadius: 14, padding: 20, alignItems: 'center', gap: 8, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  mensajesVacioText: { fontFamily: 'Inter-Regular', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  mensajeCard:    { borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 3 },
  miRespuesta:    { marginLeft: 20 },
  mensajeHeader:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  mensajeAutor:   { fontFamily: 'Montserrat-ExtraBold', fontSize: 12, flex: 1 },
  mensajeFecha:   { fontFamily: 'Inter-Regular', fontSize: 11 },
  mensajeContenido: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 20 },

  rpScroll:   { marginBottom: 12 },
  rpChip:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, marginRight: 8 },
  rpChipText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 12 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    borderWidth: 1.5, borderRadius: 14, padding: 10, marginBottom: 16,
  },
  respuestaInput: {
    flex: 1, fontFamily: 'Inter-Regular', fontSize: 14,
    maxHeight: 100, minHeight: 36,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },

  addInfoBtn:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 20 },
  addInfoText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 14 },

  infoForm: {
    borderRadius: 14, borderWidth: 1.5, padding: 16, marginBottom: 20, gap: 12,
  },
  infoFormTitle: { fontFamily: 'Montserrat-ExtraBold', fontSize: 14 },
  infoInput: {
    borderWidth: 1.5, borderRadius: 10, padding: 12, minHeight: 80,
    fontFamily: 'Inter-Regular', fontSize: 14, textAlignVertical: 'top',
  },
  infoFotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10, padding: 12,
  },
  infoFotoBtnText:  { fontFamily: 'Montserrat-ExtraBold', fontSize: 13 },
  infoFotoPreview:  { width: '100%', height: 120, borderRadius: 8 },
  infoFormBtns:     { flexDirection: 'row', gap: 10 },
  infoFormBtn:      { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  infoFormBtnPrimary: { borderWidth: 0 },
  infoFormBtnText:  { fontFamily: 'Montserrat-ExtraBold', fontSize: 13 },

  notaSeguridad:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginBottom: 16 },
  notaSeguridadText: { fontFamily: 'Inter-Regular', fontSize: 11, flex: 1 },

  actualizacion: { fontFamily: 'Inter-Regular', fontSize: 11, textAlign: 'center', marginBottom: 8 },
});
