import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import type { AuthStackParamList } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Header — logo con punto de acento */}
      <View style={styles.header}>
        <Text style={[styles.logo, { color: colors.primary }]}>SIVAPRE</Text>
        <Text style={[styles.logoAccent, { color: colors.primaryLight }]}>.</Text>
      </View>

      {/* Centro — bienvenida y subtítulo */}
      <View style={styles.middle}>
        <Text style={[styles.title, { color: colors.text }]}>¡BIENVENIDO!</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Tu reporte puede salvar vidas.{'\n'}
          Únete a la vigilancia{'\n'}
          comunitaria contra el dengue.
        </Text>
      </View>

      {/* Botones */}
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
    fontSize: 26,
    fontFamily: 'Montserrat-ExtraBold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttons: {
    gap: 12,
  },
  buttonPrimary: {
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
});
