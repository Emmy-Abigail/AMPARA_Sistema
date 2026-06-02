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
import type { MainStackParamList } from '../types';

type Props = NativeStackScreenProps<MainStackParamList, 'CambiarPassword'>;

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  colors: ReturnType<typeof useTheme>['colors'];
  returnKeyType?: 'next' | 'done';
  onSubmit?: () => void;
}

function PasswordField({ label, value, onChange, placeholder, colors, returnKeyType = 'next', onSubmit }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          style={[styles.inputInner, { color: colors.text }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          secureTextEntry={!visible}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmit}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity onPress={() => setVisible((v) => !v)} style={styles.eyeBtn}>
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CambiarPasswordScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { changePassword, isChangingPassword } = useAuth();
  const insets = useSafeAreaInsets();

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const noCoinciden = confirmar.length > 0 && nueva !== confirmar;
  const nuevaCorta = nueva.length > 0 && nueva.length < 8;
  const formularioValido = actual.length > 0 && nueva.length >= 8 && nueva === confirmar;

  const handleCambiar = async () => {
    Keyboard.dismiss();
    if (!formularioValido) return;
    setErrorMsg('');
    try {
      await changePassword({ password_actual: actual, password_nuevo: nueva });
      Alert.alert(
        'Contraseña actualizada',
        'Tu contraseña se cambió correctamente.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ??
        err?.response?.data?.mensaje ??
        err?.message ??
        'No se pudo cambiar la contraseña. Intenta de nuevo.';
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
          <Text style={[styles.title, { color: colors.text }]}>Cambiar contraseña</Text>
          <View style={{ width: 36 }} />
        </View>

        <Text style={[styles.descripcion, { color: colors.textSecondary }]}>
          Tu nueva contraseña debe tener al menos 8 caracteres.
        </Text>

        {errorMsg ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <PasswordField
            label="Contraseña actual"
            value={actual}
            onChange={(t) => { setActual(t); setErrorMsg(''); }}
            placeholder="Tu contraseña actual"
            colors={colors}
            returnKeyType="next"
          />

          <PasswordField
            label="Nueva contraseña"
            value={nueva}
            onChange={(t) => { setNueva(t); setErrorMsg(''); }}
            placeholder="Mínimo 8 caracteres"
            colors={colors}
            returnKeyType="next"
          />
          {nuevaCorta ? (
            <Text style={[styles.hint, { color: colors.warning }]}>
              La contraseña debe tener al menos 8 caracteres
            </Text>
          ) : null}

          <PasswordField
            label="Confirmar nueva contraseña"
            value={confirmar}
            onChange={(t) => { setConfirmar(t); setErrorMsg(''); }}
            placeholder="Repite la nueva contraseña"
            colors={colors}
            returnKeyType="done"
            onSubmit={handleCambiar}
          />
          {noCoinciden ? (
            <Text style={[styles.hint, { color: colors.error }]}>
              Las contraseñas no coinciden
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[
            styles.btnPrimary,
            { backgroundColor: colors.primary },
            (!formularioValido || isChangingPassword) && styles.btnDisabled,
          ]}
          onPress={handleCambiar}
          disabled={!formularioValido || isChangingPassword}
          activeOpacity={0.8}
        >
          <Ionicons name="lock-closed-outline" size={18} color={colors.textOnPrimary} />
          <Text style={[styles.btnText, { color: colors.textOnPrimary }]}>
            {isChangingPassword ? 'Cambiando...' : 'Cambiar contraseña'}
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
    marginBottom: 16,
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
  descripcion: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    flex: 1,
  },
  form: {
    gap: 16,
    marginBottom: 32,
  },
  label: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  inputInner: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  eyeBtn: {
    padding: 12,
  },
  hint: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 4,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
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
