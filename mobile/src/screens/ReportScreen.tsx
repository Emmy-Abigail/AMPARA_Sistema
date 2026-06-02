// DenunciaScreen — Fase 2 (en construcción)
// Este archivo será reemplazado completamente con el formulario de denuncia.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

export default function ReportScreen() {
  const { colors } = useTheme();
  const insets     = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 40 }]}>
      <Ionicons name="build-outline" size={48} color={colors.primary} />
      <Text style={[styles.title, { color: colors.text }]}>Formulario de denuncia</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Esta pantalla está en construcción.{'\n'}
        Llegará en la Fase 2 del desarrollo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
