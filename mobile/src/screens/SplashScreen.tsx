import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useAuthContext } from '../store/auth-context';

const LOGO = require('../../assets/ampara-logo.png');

export default function SplashScreen() {
  const { setSplashShown } = useAuthContext();

  const slideAnim = useRef(new Animated.Value(20)).current;
  const barAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Ocultar el splash nativo justo cuando este componente ya está pintado
    ExpoSplashScreen.hideAsync();

    // Logo sube suavemente desde abajo
    Animated.timing(slideAnim, {
      toValue: 0, duration: 600, useNativeDriver: true,
    }).start();

    // Barra de carga
    Animated.timing(barAnim, {
      toValue: 1, duration: 1800, delay: 300, useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => setSplashShown(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <LinearGradient
      colors={['#2D0E5A', '#5B1FA8', '#7A35BB']}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={styles.screen}
    >
      <Animated.View
        style={[styles.content, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Logo en tarjeta blanca redondeada */}
        <View style={styles.logoCard}>
          <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
        </View>

        {/* Nombre de la app */}
        <Text style={styles.appName}>ampara</Text>

        {/* Frase */}
        <Text style={styles.tagline}>No estás sola</Text>

        {/* Barra de progreso */}
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { width: barWidth }]} />
        </View>
      </Animated.View>

      {/* Versión */}
      <Text style={styles.version}>v1.0</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  logoCard: {
    width: 130,
    height: 130,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 14,
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },

  appName: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 36,
    letterSpacing: 1.5,
    color: '#FFFFFF',
    marginTop: 28,
    marginBottom: 6,
  },

  tagline: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 40,
  },

  barTrack: {
    width: 100,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  barFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },

  version: {
    position: 'absolute',
    bottom: 40,
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.3)',
  },
});
