import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../store/auth-context';

const LOGO = require('../../assets/ampara-logo.png');

export default function SplashScreen() {
  const { setSplashShown } = useAuthContext();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;
  const barAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo aparece con fade + slide suave
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 700, useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 700, useNativeDriver: true,
      }),
    ]).start();

    // Barra de carga arranca después del logo
    Animated.timing(barAnim, {
      toValue: 1, duration: 1600, delay: 500, useNativeDriver: false,
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
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Logo en tarjeta blanca redondeada */}
        <View style={styles.logoCard}>
          <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
        </View>

        {/* Nombre de la app */}
        <Text style={styles.appName}>ampara</Text>

        {/* Barra de progreso */}
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { width: barWidth }]} />
        </View>
      </Animated.View>

      {/* Versión */}
      <Animated.Text style={[styles.version, { opacity: fadeAnim }]}>
        v1.0
      </Animated.Text>
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

  // Logo
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

  // Nombre
  appName: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 36,
    letterSpacing: 1.5,
    color: '#FFFFFF',
    marginTop: 28,
    marginBottom: 40,
  },

  // Barra de carga
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

  // Versión
  version: {
    position: 'absolute',
    bottom: 40,
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.3)',
  },
});
