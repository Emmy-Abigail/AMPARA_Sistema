import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../hooks/useAuth';
import { useAuthContext } from '../store/auth-context';
import type { AuthStackParamList } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const LOGO = require('../../assets/ampara-logo.png');

export default function WelcomeScreen({ navigation }: Props) {
  const insets        = useSafeAreaInsets();
  const { loginAsGuest } = useAuth();
  const { pendingAuthScreen, setPendingAuthScreen } = useAuthContext();

  React.useLayoutEffect(() => {
    if (pendingAuthScreen === 'Register') {
      setPendingAuthScreen(null);
      navigation.navigate('Register');
    }
  }, []);

  return (
    <LinearGradient
      colors={['#2D0E5A', '#5B1FA8', '#7A35BB']}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      {/* ── Identidad ─────────────────────────────────────────────── */}
      <View style={styles.identity}>
        {/* Logo en tarjeta blanca redondeada */}
        <View style={styles.logoCard}>
          <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
        </View>

        <Text style={styles.appName}>ampara</Text>
        <Text style={styles.tagline}>estás acompañada, estás segura</Text>
      </View>

      {/* ── Separador visual ─────────────────────────────────────── */}
      <View style={styles.divider} />

      {/* ── Acciones ─────────────────────────────────────────────── */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.88}
        >
          <Ionicons name="person-add-outline" size={17} color="#5B1FA8" />
          <Text style={styles.btnPrimaryText}>Crear una cuenta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnOutline}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.8}
        >
          <Text style={styles.btnOutlineText}>Iniciar sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={loginAsGuest} activeOpacity={0.65} style={styles.btnGhost}>
          <Text style={styles.btnGhostText}>Continuar de forma anónima</Text>
        </TouchableOpacity>

        {/* Sello de privacidad */}
        <View style={styles.privacyRow}>
          <Ionicons name="lock-closed-outline" size={12} color="rgba(255,255,255,0.5)" />
          <Text style={styles.privacyText}>
            Cifrado · Solo personal autorizado accede a tu caso
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 0,
  },

  // ── Identidad ──────────────────────────────────────────────────
  identity: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  logoCard: {
    width: 148,
    height: 148,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    // Sombra sutil que lo levanta del fondo
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 14,
    marginBottom: 28,
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 38,
    color: '#FFFFFF',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  tagline: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  // ── Divisor ────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 36,
  },

  // ── Acciones ───────────────────────────────────────────────────
  actions: {
    gap: 12,
    alignItems: 'center',
  },
  btnPrimary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  btnPrimaryText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14.5,
    color: '#5B1FA8',
    letterSpacing: 0.2,
  },
  btnOutline: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  btnOutlineText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14.5,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  btnGhost: {
    paddingVertical: 8,
    marginTop: 2,
  },
  btnGhostText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(255,255,255,0.3)',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  privacyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.2,
  },
});
