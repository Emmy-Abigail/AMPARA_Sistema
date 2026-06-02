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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../theme';
import { useAuth } from '../hooks/useAuth';
import type { AuthStackParamList } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { register, isRegistering } = useAuth();

  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', telefono: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const set = (key: keyof typeof form) => (value: string) => {
    setErrorMsg('');
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleRegister = async () => {
    Keyboard.dismiss();
    setErrorMsg('');
    const { nombre, apellido, email, password } = form;
    if (!nombre.trim() || !apellido.trim() || !email.trim() || !password) return;
    try {
      await register({
        nombre:   nombre.trim(),
        apellido: apellido.trim(),
        email:    email.trim().toLowerCase(),
        password,
        telefono: form.telefono.trim() || undefined,
      });
      navigation.navigate('Login', { successMessage: '¡Cuenta creada! Inicia sesión para continuar.' });
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.detail ??
        err?.response?.data?.mensaje ??
        err?.message ??
        'No se pudo crear la cuenta. Intenta de nuevo.',
      );
    }
  };

  const formularioValido = form.nombre.trim() && form.apellido.trim() && form.email.trim() && form.password.length >= 8;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={20} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Volver</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>Crear cuenta</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Tus datos están cifrados y solo el personal autorizado del ministerio accede a tu caso
        </Text>

        {errorMsg ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Nombre *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={form.nombre} onChangeText={set('nombre')} placeholder="María" placeholderTextColor={colors.textDisabled} returnKeyType="next" />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Apellido *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={form.apellido} onChangeText={set('apellido')} placeholder="García" placeholderTextColor={colors.textDisabled} returnKeyType="next" />
          </View>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Correo electrónico *</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={form.email} onChangeText={set('email')} placeholder="tu@correo.com" placeholderTextColor={colors.textDisabled} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} returnKeyType="next" />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Teléfono (opcional)</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={form.telefono} onChangeText={set('telefono')} placeholder="+51 987 654 321" placeholderTextColor={colors.textDisabled} keyboardType="phone-pad" returnKeyType="next" />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Contraseña *</Text>
        <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput style={[styles.inputInner, { color: colors.text }]} value={form.password} onChangeText={set('password')} placeholder="Mínimo 8 caracteres" placeholderTextColor={colors.textDisabled} secureTextEntry={!showPassword} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
          <TouchableOpacity onPress={() => setShowPassword((p) => !p)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        {form.password.length > 0 && form.password.length < 8 && (
          <Text style={[styles.hint, { color: colors.warning }]}>La contraseña debe tener al menos 8 caracteres</Text>
        )}

        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: colors.primary }, (!formularioValido || isRegistering) && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={!formularioValido || isRegistering}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add-outline" size={18} color={colors.textOnPrimary} />
          <Text style={[styles.btnText, { color: colors.textOnPrimary }]}>
            {isRegistering ? 'Creando cuenta...' : 'Registrarme'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
          <Text style={[styles.link, { color: colors.primary }]}>¿Ya tienes cuenta? Inicia sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:      { flex: 1 },
  container: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 48, gap: 4 },
  backRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backText:  { fontFamily: 'Inter-Regular', fontSize: 14 },
  title:     { fontFamily: 'Montserrat-ExtraBold', fontSize: 26, marginBottom: 4 },
  subtitle:  { fontFamily: 'Inter-Regular', fontSize: 13, marginBottom: 20 },
  row:       { flexDirection: 'row', gap: 12 },
  label:     { fontFamily: 'Inter-Regular', fontSize: 13, marginBottom: 6, marginTop: 10 },
  hint:      { fontFamily: 'Inter-Regular', fontSize: 12, marginTop: 2, marginBottom: 4 },
  input:     { height: 48, borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 14, fontSize: 14, fontFamily: 'Inter-Regular' },
  inputRow:  { flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 10, borderWidth: 1.5, marginTop: 6 },
  inputInner:{ flex: 1, paddingHorizontal: 14, fontSize: 14, fontFamily: 'Inter-Regular' },
  eyeBtn:    { padding: 12 },
  errorBanner:{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginBottom: 4 },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, flex: 1 },
  btnPrimary:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: 14, marginTop: 28 },
  btnDisabled:{ opacity: 0.5 },
  btnText:   { fontFamily: 'Montserrat-ExtraBold', fontSize: 15, letterSpacing: 0.5 },
  linkRow:   { marginTop: 12, marginBottom: 8 },
  link:      { fontFamily: 'Inter-Regular', textAlign: 'center', fontSize: 14 },
});
