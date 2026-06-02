import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useAuthContext } from '../store/auth-context';
import { AmparaLogo } from '../components';

const ICON_SIZE = Math.min(Dimensions.get('window').width * 0.44, 210);

export default function SplashScreen() {
  const { setSplashShown } = useAuthContext();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;
  const barAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(barAnim, {
      toValue: 1,
      duration: 1800,
      delay: 400,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => setSplashShown(true), 2700);
    return () => clearTimeout(timer);
  }, []);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <AmparaLogo size={ICON_SIZE} />

        <Text style={styles.appName}>Ampara</Text>

        <Text style={styles.tagline}>
          TU VOZ ES TU FUERZA{'\n'}DENUNCIA SEGURA Y CONFIDENCIAL
        </Text>

        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { width: barWidth }]} />
        </View>
      </Animated.View>

      <Animated.Text style={[styles.version, { opacity: fadeAnim }]}>
        v1.0
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6E2DB0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  appName: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 38,
    letterSpacing: 4,
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 12,
  },
  tagline: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    letterSpacing: 2.5,
    textAlign: 'center',
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.70)',
    marginBottom: 36,
  },
  barTrack: {
    width: 120,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  barFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D8B4FE',
  },
  version: {
    position: 'absolute',
    bottom: 44,
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    letterSpacing: 1,
    color: 'rgba(255, 255, 255, 0.35)',
  },
});
