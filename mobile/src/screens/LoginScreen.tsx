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

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { login, isLoggingIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const successMessage = route?.params?.successMessage;

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email.trim() || !password) return;
    setErrorMsg('');
    try {
      await login({ email: email.trim().toLowerCase(), password });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ??
        err?.response?.data?.mensaje ??
        err?.message ??
        'Credenciales incorrectas. Intenta de nuevo.';
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
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Botón volver */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Volver</Text>
        </TouchableOpacity>

        {/* Encabezado */}
        <Text style={[styles.title, { color: colors.text }]}>Iniciar Sesión</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Bienvenido de nuevo
        </Text>

        {/* Banner de éxito tras registro */}
        {successMessage ? (
          <View style={[styles.successBanner, { backgroundColor: colors.successLight }]}>
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
            <Text style={[styles.successText, { color: colors.success }]}>{successMessage}</Text>
          </View>
        ) : null}

        {/* Banner de error */}
        {errorMsg ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Formulario */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Correo electrónico</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
              ]}
              value={email}
              onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
              placeholder="tu@correo.com"
              placeholderTextColor={colors.textDisabled}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Contraseña</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[styles.inputWithIcon, { color: colors.text }]}
                value={password}
                onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
                placeholder="••••••••"
                placeholderTextColor={colors.textDisabled}
                secureTextEntry={!mostrarPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setMostrarPassword(!mostrarPassword)}
              >
                <Ionicons
                  name={mostrarPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity>
            <Text style={[styles.forgot, { color: colors.primary }]}>
              ¿Olvidaste tu contraseña?
            </Text>
          </TouchableOpacity>
        </View>

        {/* Botón principal */}
        <TouchableOpacity
          style={[
            styles.buttonPrimary,
            { backgroundColor: colors.primary },
            (!email.trim() || !password || isLoggingIn) && styles.btnDisabled,
          ]}
          onPress={handleLogin}
          disabled={!email.trim() || !password || isLoggingIn}
        >
          <Text style={[styles.buttonPrimaryText, { color: colors.textOnPrimary }]}>
            {isLoggingIn ? 'CARGANDO...' : 'INICIAR SESIÓN'}
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.registerRow}>
          <Text style={[styles.registerText, { color: colors.textSecondary }]}>
            ¿No tienes cuenta?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={[styles.registerLink, { color: colors.primary }]}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
    gap: 0,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 32,
  },
  backText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  title: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 28,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginBottom: 20,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  successText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    flex: 1,
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
  form: {
    gap: 20,
    marginBottom: 28,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
  },
  inputWithIcon: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  forgot: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    textAlign: 'right',
  },
  buttonPrimary: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 28,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  buttonPrimaryText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14,
    letterSpacing: 1,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  registerLink: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14,
  },
});
