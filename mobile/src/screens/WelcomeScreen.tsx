import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../hooks/useAuth';
import { AmparaLogo } from '../components';
import type { AuthStackParamList } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const { width: SW } = Dimensions.get('window');

// ─── Logo hero ────────────────────────────────────────────────────────────────
// Cuando tengas el PNG en mobile/assets/ampara-logo.png, reemplaza el bloque
// de AmparaLogo por:
//   <Image source={require('../../assets/ampara-logo.png')}
//          style={{ width: 190, height: 190 }} resizeMode="contain" />
function LogoHero() {
  return <AmparaLogo size={190} />;
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function WelcomeScreen({ navigation }: Props) {
  const insets        = useSafeAreaInsets();
  const { loginAsGuest } = useAuth();

  return (
    <LinearGradient
      colors={['#6E2DB0', '#8B43D4', '#B07BE6']}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={styles.gradient}
    >
      {/* ── Halos decorativos ── */}
      <View style={[styles.halo, styles.haloTopRight]} />
      <View style={[styles.halo, styles.haloBottomLeft]} />

      {/* ── Header: logo + nombre ── */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.logoChip}>
          <AmparaLogo size={26} />
        </View>
        <Text style={styles.brandName}>ampara</Text>
      </View>

      {/* ── Sección hero ── */}
      <View style={styles.hero}>
        <LogoHero />

        <Text style={styles.headline}>
          Estás acompañada,{'\n'}estás segura
        </Text>
        <Text style={styles.subline}>
          Tu denuncia es confidencial. Reporta lo que vives, accede a ayuda y mantente protegida — a tu ritmo, con tu privacidad siempre primero.
        </Text>
      </View>

      {/* ── Botones ── */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + 22 }]}>

        {/* Crear cuenta */}
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.88}
        >
          <Ionicons name="person-add-outline" size={18} color="#8B43D4" />
          <Text style={styles.btnPrimaryText}>Crear una cuenta</Text>
        </TouchableOpacity>

        {/* Iniciar sesión */}
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.8}
        >
          <Text style={styles.btnSecondaryText}>Iniciar sesión</Text>
        </TouchableOpacity>

        {/* Continuar anónima */}
        <TouchableOpacity style={styles.btnAnon} onPress={loginAsGuest} activeOpacity={0.7}>
          <Text style={styles.btnAnonText}>Continuar de forma anónima</Text>
        </TouchableOpacity>

        {/* Sello de seguridad */}
        <View style={styles.securityBadge}>
          <Ionicons name="lock-closed" size={13} color="rgba(255,255,255,0.75)" />
          <Text style={styles.securityText}>
            Anónimo · Cifrado · Sin rastro en tu teléfono
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    position: 'relative',
  },

  // Halos decorativos
  halo: {
    position: 'absolute',
    borderRadius: 9999,
  },
  haloTopRight: {
    width: 280,
    height: 280,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -70,
    right: -90,
  },
  haloBottomLeft: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(240,180,255,0.14)',
    bottom: 100,
    left: -70,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  logoChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 24,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Hero
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 0,
  },
  headline: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 32,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 40,
    marginTop: 18,
    letterSpacing: -0.3,
  },
  subline: {
    fontFamily: 'Inter-Regular',
    fontSize: 14.5,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 14,
    maxWidth: 320,
  },

  // Botones
  actions: {
    paddingHorizontal: 22,
    gap: 11,
    alignItems: 'center',
  },
  btnPrimary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  btnPrimaryText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 15,
    color: '#7C3AED',
    letterSpacing: 0.3,
  },
  btnSecondary: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.38)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  btnSecondaryText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  btnAnon: {
    paddingVertical: 6,
    marginTop: 2,
  },
  btnAnonText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.72)',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(255,255,255,0.4)',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  securityText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.2,
  },
});
