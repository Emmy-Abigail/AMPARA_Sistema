import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { useAuth } from '../hooks/useAuth';
import type { AuthStackParamList } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  const { colors }       = useTheme();
  const { loginAsGuest } = useAuth();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      <View style={styles.header}>
        <Text style={[styles.logo, { color: colors.primary }]}>Ampara</Text>
        <Text style={[styles.logoAccent, { color: colors.primaryLight }]}>.</Text>
      </View>

      <View style={styles.middle}>
        <Text style={[styles.title, { color: colors.text }]}>
          ESTÁS ACOMPAÑADA,{'\n'}ESTÁS SEGURA
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Tu denuncia es confidencial.{'\n'}
          Estamos aquí para escucharte{'\n'}
          y acompañarte.
        </Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.buttonPrimary, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={[styles.buttonPrimaryText, { color: colors.textOnPrimary }]}>
            INICIAR SESIÓN
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonSecondary, { borderColor: colors.primary }]}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={[styles.buttonSecondaryText, { color: colors.primary }]}>
            CREAR CUENTA
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={loginAsGuest}>
          <Text style={[styles.anonText, { color: colors.textDisabled }]}>
            Continuar de forma anónima
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  logo: {
    fontSize: 32,
    fontFamily: 'Montserrat-ExtraBold',
  },
  logoAccent: {
    fontSize: 40,
    fontFamily: 'Montserrat-ExtraBold',
    marginBottom: -2,
  },
  middle: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Montserrat-ExtraBold',
    marginBottom: 14,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 26,
  },
  buttons: {
    gap: 12,
    alignItems: 'center',
  },
  buttonPrimary: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14,
    letterSpacing: 1,
  },
  buttonSecondary: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  buttonSecondaryText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14,
    letterSpacing: 1,
  },
  anonText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginTop: 4,
    textDecorationLine: 'underline',
  },
});
