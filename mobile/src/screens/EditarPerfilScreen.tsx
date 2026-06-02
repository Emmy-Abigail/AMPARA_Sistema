import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { UbigeoSelector } from '../components';
import {
  buscarDepartamentos,
  buscarProvincias,
  buscarDistritos,
} from '../data/ubigeo';
import type { MainStackParamList } from '../types';

type Props = NativeStackScreenProps<MainStackParamList, 'EditarPerfil'>;

export default function EditarPerfilScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { usuario, updatePerfil, isUpdatingPerfil } = useAuth();
  const insets = useSafeAreaInsets();

  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [apellido, setApellido] = useState(usuario?.apellido ?? '');
  const [telefono, setTelefono] = useState(usuario?.telefono ?? '');
  const [departamento, setDepartamento] = useState(usuario?.departamento ?? '');
  const [provincia, setProvincia] = useState(usuario?.provincia ?? '');
  const [distrito, setDistrito] = useState(usuario?.distrito ?? '');
  const [errorMsg, setErrorMsg] = useState('');

  const handleDepartamentoChange = (val: string) => {
    setDepartamento(val);
    setProvincia('');
    setDistrito('');
  };

  const handleProvinciaChange = (val: string) => {
    setProvincia(val);
    setDistrito('');
  };

  const haycambios =
    nombre.trim() !== (usuario?.nombre ?? '') ||
    apellido.trim() !== (usuario?.apellido ?? '') ||
    telefono.trim() !== (usuario?.telefono ?? '') ||
    departamento !== (usuario?.departamento ?? '') ||
    provincia !== (usuario?.provincia ?? '') ||
    distrito !== (usuario?.distrito ?? '');

  const formularioValido = nombre.trim().length > 0 && haycambios;

  const handleGuardar = async () => {
    Keyboard.dismiss();
    if (!nombre.trim()) return;
    setErrorMsg('');
    try {
      await updatePerfil({
        nombre: nombre.trim(),
        apellido: apellido.trim() || undefined,
        telefono: telefono.trim() || undefined,
        departamento: departamento || undefined,
        provincia: provincia || undefined,
        distrito: distrito || undefined,
      });
      Alert.alert('Perfil actualizado', 'Tus datos se guardaron correctamente.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ??
        err?.response?.data?.mensaje ??
        err?.message ??
        'No se pudo actualizar el perfil. Intenta de nuevo.';
      setErrorMsg(msg);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Editar perfil</Text>
          <View style={{ width: 36 }} />
        </View>

        {errorMsg ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Datos personales */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Datos personales</Text>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Nombre *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={nombre}
          onChangeText={(t) => { setNombre(t); setErrorMsg(''); }}
          placeholder="Juan"
          placeholderTextColor={colors.textDisabled}
          returnKeyType="next"
          autoCapitalize="words"
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Apellido</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={apellido}
          onChangeText={setApellido}
          placeholder="Pérez"
          placeholderTextColor={colors.textDisabled}
          returnKeyType="next"
          autoCapitalize="words"
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Teléfono</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={telefono}
          onChangeText={setTelefono}
          placeholder="+51 987 654 321"
          placeholderTextColor={colors.textDisabled}
          keyboardType="phone-pad"
          returnKeyType="done"
        />

        {/* Email no editable */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Correo electrónico</Text>
        <View style={[styles.input, styles.inputDisabled, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
          <Text style={{ color: colors.textDisabled, fontFamily: 'Inter-Regular', fontSize: 14 }}>
            {usuario?.email}
          </Text>
        </View>
        <Text style={[styles.hint, { color: colors.textDisabled }]}>
          El correo no puede modificarse
        </Text>

        {/* Ubicación */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Ubicación{' '}
          <Text style={{ color: colors.textSecondary, fontFamily: 'Inter-Regular', fontSize: 12 }}>
            (opcional)
          </Text>
        </Text>

        <View style={{ zIndex: 30 }}>
          <UbigeoSelector
            label="Departamento"
            placeholder="Buscar departamento..."
            value={departamento}
            onChange={handleDepartamentoChange}
            opciones={buscarDepartamentos('')}
            colors={colors}
          />
        </View>

        <View style={{ zIndex: 20 }}>
          <UbigeoSelector
            label="Provincia"
            placeholder="Buscar provincia..."
            value={provincia}
            onChange={handleProvinciaChange}
            opciones={buscarProvincias(departamento, '')}
            disabled={!departamento}
            colors={colors}
          />
        </View>

        <View style={{ zIndex: 10 }}>
          <UbigeoSelector
            label="Distrito"
            placeholder="Buscar distrito..."
            value={distrito}
            onChange={setDistrito}
            opciones={buscarDistritos(departamento, provincia, '')}
            disabled={!provincia}
            colors={colors}
          />
        </View>

        {/* Botón guardar */}
        <TouchableOpacity
          style={[
            styles.btnPrimary,
            { backgroundColor: colors.primary },
            (!formularioValido || isUpdatingPerfil) && styles.btnDisabled,
          ]}
          onPress={handleGuardar}
          disabled={!formularioValido || isUpdatingPerfil}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-outline" size={18} color={colors.textOnPrimary} />
          <Text style={[styles.btnText, { color: colors.textOnPrimary }]}>
            {isUpdatingPerfil ? 'Guardando...' : 'Guardar cambios'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    paddingHorizontal: 24,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    flex: 1,
  },
  sectionTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14,
    marginTop: 20,
    marginBottom: 4,
  },
  label: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  inputDisabled: {
    justifyContent: 'center',
  },
  hint: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 4,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    marginTop: 32,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
