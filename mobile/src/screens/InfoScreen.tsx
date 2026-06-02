// InfoScreen

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { useTheme } from '../theme';
import type { MainTabParamList } from '../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Props = BottomTabScreenProps<MainTabParamList, 'Info'>;

type CategoriaId = 'prevencion' | 'zancudo' | 'sintomas' | 'mitos' | 'contactos';

interface Categoria {
  id: CategoriaId;
  label: string;
  icono: string;
}

interface InfoItem {
  titulo: string;
  desc: string;
}

interface MitoItem {
  mito: string;
  verdad: string;
}

// ─── Datos ────────────────────────────────────────────────────────────────────

const CATEGORIAS: Categoria[] = [
  { id: 'prevencion', label: 'Prevención',      icono: 'shield-checkmark-outline' },
  { id: 'zancudo',   label: 'El Zancudo',       icono: 'bug-outline' },
  { id: 'sintomas',  label: 'Síntomas',         icono: 'medkit-outline' },
  { id: 'mitos',     label: 'Mitos y Verdades', icono: 'help-circle-outline' },
  { id: 'contactos', label: 'Emergencias',      icono: 'call-outline' },
];

const CONTENIDO: Record<Exclude<CategoriaId, 'mitos'>, InfoItem[]> = {
  prevencion: [
    { titulo: 'Elimina el agua estancada',   desc: 'Vacía, tapa o voltea recipientes que acumulen agua al menos una vez por semana.' },
    { titulo: 'Usa mosquiteros',             desc: 'Coloca mosquiteros en puertas y ventanas para evitar la entrada del zancudo.' },
    { titulo: 'Ropa protectora',             desc: 'Usa ropa de manga larga y pantalones largos en zonas de riesgo.' },
    { titulo: 'Repelente',                   desc: 'Aplica repelente con DEET, IR3535 o Icaridina en zonas expuestas de la piel.' },
  ],
  zancudo: [
    { titulo: '¿Cómo identificarlo?', desc: 'El Aedes aegypti es negro con rayas blancas en el cuerpo y las patas. Es pequeño y silencioso.' },
    { titulo: '¿Cuándo pica?',        desc: 'Pica principalmente durante el día, con mayor actividad al amanecer y al atardecer.' },
    { titulo: '¿Dónde se reproduce?', desc: 'Se reproduce en agua limpia y estancada: floreros, baldes, llantas, canaletas y recipientes descubiertos.' },
    { titulo: 'Ciclo de vida',        desc: 'El ciclo completo (huevo → larva → pupa → adulto) dura entre 7 y 10 días en condiciones cálidas.' },
  ],
  sintomas: [
    { titulo: 'Fiebre alta',            desc: 'Aparición súbita de fiebre mayor a 38°C, generalmente los primeros 2-7 días.' },
    { titulo: 'Dolor de cabeza y ojos', desc: 'Dolor intenso detrás de los ojos y cefalea severa.' },
    { titulo: 'Dolor muscular',         desc: 'Dolores musculares y articulares intensos, conocido como "fiebre quebrantahuesos".' },
    { titulo: 'Señales de alarma',      desc: 'Dolor abdominal intenso, vómitos, sangrado de encías o nariz. Acude de inmediato al médico.' },
  ],
  contactos: [
    { titulo: 'MINSA - Línea 113', desc: 'Atención gratuita las 24 horas para consultas de salud y emergencias.' },
    { titulo: 'SAMU - 106',        desc: 'Servicio de Atención Médica de Urgencias para emergencias médicas.' },
    { titulo: 'Bomberos - 116',    desc: 'Cuerpo General de Bomberos del Perú.' },
    { titulo: 'CDC Perú',          desc: 'Centro Nacional de Epidemiología, Prevención y Control de Enfermedades.' },
  ],
};

const MITOS: MitoItem[] = [
  {
    mito:   'El dengue solo se contagia de noche',
    verdad: 'FALSO. El Aedes aegypti pica principalmente durante el día, al amanecer y al atardecer.',
  },
  {
    mito:   'Si no hay fiebre, no es dengue',
    verdad: 'FALSO. Algunos casos de dengue pueden presentarse sin fiebre alta, especialmente en niños.',
  },
  {
    mito:   'El dengue se contagia de persona a persona',
    verdad: 'FALSO. El dengue solo se transmite por la picadura del zancudo infectado, no por contacto directo.',
  },
  {
    mito:   'El dengue solo afecta zonas tropicales',
    verdad: 'FALSO. Puede afectar cualquier zona donde haya presencia del zancudo Aedes aegypti.',
  },
];

// Números con acción de llamada directa
const NUMEROS_CONTACTO: { titulo: string; numero: string }[] = [
  { titulo: 'MINSA',    numero: '113' },
  { titulo: 'SAMU',     numero: '106' },
  { titulo: 'Bomberos', numero: '116' },
];

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function InfoScreen({}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaId>('prevencion');
  const [mitosAbiertos, setMitosAbiertos] = useState<number[]>([]);

  const toggleMito = (index: number) => {
    setMitosAbiertos((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const iconoCategoria = CATEGORIAS.find((c) => c.id === categoriaActiva)?.icono ?? 'information-outline';

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 20 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Encabezado */}
      <Text style={[styles.pageTitle, { color: colors.text }]}>
        Centro de Información
      </Text>
      <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
        Aprende a proteger tu comunidad
      </Text>

      {/* Menú de categorías */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.menuScroll}
        contentContainerStyle={styles.menuContainer}
      >
        {CATEGORIAS.map((cat) => {
          const activo = categoriaActiva === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.menuItem,
                {
                  backgroundColor: activo ? colors.primary : colors.surface,
                  borderColor: activo ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setCategoriaActiva(cat.id)}
            >
              <Ionicons
                name={cat.icono as any}
                size={18}
                color={activo ? colors.textOnPrimary : colors.primary}
              />
              <Text
                style={[
                  styles.menuLabel,
                  { color: activo ? colors.textOnPrimary : colors.primary },
                  activo && styles.menuLabelActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Contenido general */}
      {categoriaActiva !== 'mitos' && categoriaActiva !== 'contactos' &&
        CONTENIDO[categoriaActiva].map((item, index) => (
          <View
            key={index}
            style={[styles.card, { backgroundColor: colors.surface }]}
          >
            <View style={styles.cardHeader}>
              <Ionicons
                name={iconoCategoria as any}
                size={18}
                color={colors.primary}
              />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {item.titulo}
              </Text>
            </View>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              {item.desc}
            </Text>
          </View>
        ))
      }

      {/* Mitos y Verdades */}
      {categoriaActiva === 'mitos' &&
        MITOS.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.card, { backgroundColor: colors.surface }]}
            onPress={() => toggleMito(index)}
            activeOpacity={0.8}
          >
            <View style={styles.mitoHeader}>
              <View style={[styles.mitoBadge, { backgroundColor: colors.warning }]}>
                <Text style={styles.mitoBadgeText}>MITO</Text>
              </View>
              <Text style={[styles.mitoText, { color: colors.text }]} numberOfLines={2}>
                {item.mito}
              </Text>
              <Ionicons
                name={mitosAbiertos.includes(index) ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </View>
            {mitosAbiertos.includes(index) && (
              <View style={[styles.verdadBox, { backgroundColor: colors.successLight }]}>
                <Text style={[styles.verdadLabel, { color: colors.success }]}>
                  ✓ VERDAD
                </Text>
                <Text style={[styles.verdadText, { color: colors.text }]}>
                  {item.verdad}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))
      }

      {/* Contactos de emergencia con llamada directa */}
      {categoriaActiva === 'contactos' && (
        <>
          {CONTENIDO.contactos.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.card, { backgroundColor: colors.surface }]}
              onPress={() => {
                const numero = NUMEROS_CONTACTO[index]?.numero;
                if (numero) Linking.openURL(`tel:${numero}`);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Ionicons name="call-outline" size={18} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {item.titulo}
                </Text>
                {NUMEROS_CONTACTO[index] && (
                  <View style={[styles.numeroBadge, { backgroundColor: colors.primarySubtle }]}>
                    <Text style={[styles.numeroText, { color: colors.primary }]}>
                      {NUMEROS_CONTACTO[index].numero}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                {item.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </>
      )}

    </ScrollView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 24,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginBottom: 20,
  },

  // Menú
  menuScroll: {
    marginBottom: 24,
  },
  menuContainer: {
    gap: 10,
    paddingRight: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  menuLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
  menuLabelActive: {
    fontFamily: 'Montserrat-ExtraBold',
  },

  // Card base
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14,
    flex: 1,
  },
  cardDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 20,
  },

  // Contactos
  numeroBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  numeroText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 13,
  },

  // Mitos
  mitoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mitoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mitoBadgeText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  mitoText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    flex: 1,
  },
  verdadBox: {
    marginTop: 12,
    borderRadius: 10,
    padding: 12,
  },
  verdadLabel: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 12,
    marginBottom: 4,
  },
  verdadText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 20,
  },
});
