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

type Props = BottomTabScreenProps<MainTabParamList, 'Info'>;
type CategoriaId = 'derechos' | 'tipos' | 'que_hacer' | 'mitos' | 'emergencias';

interface Categoria   { id: CategoriaId; label: string; icono: string }
interface InfoItem    { titulo: string; desc: string }
interface MitoItem    { mito: string; verdad: string }

const CATEGORIAS: Categoria[] = [
  { id: 'derechos',    label: 'Tus derechos',    icono: 'ribbon-outline'          },
  { id: 'tipos',       label: 'Tipos',           icono: 'list-outline'            },
  { id: 'que_hacer',   label: 'Qué hacer',       icono: 'footsteps-outline'       },
  { id: 'mitos',       label: 'Mitos',           icono: 'help-circle-outline'     },
  { id: 'emergencias', label: 'Emergencias',     icono: 'call-outline'            },
];

const CONTENIDO: Record<Exclude<CategoriaId, 'mitos' | 'emergencias'>, InfoItem[]> = {
  derechos: [
    { titulo: 'Derecho a una vida libre de violencia',  desc: 'La Ley N° 30364 te protege. Tienes derecho a vivir sin ser víctima de violencia física, psicológica, sexual o económica.' },
    { titulo: 'Derecho a denunciar',                   desc: 'Puedes interponer una denuncia en cualquier comisaría, fiscalía o Centro de Emergencia Mujer (CEM), de forma gratuita.' },
    { titulo: 'Medidas de protección',                 desc: 'El juez puede dictar medidas inmediatas: alejamiento del agresor, prohibición de comunicación, retiro del hogar.' },
    { titulo: 'Derecho a atención gratuita',           desc: 'Tienes derecho a atención médica, psicológica y legal gratuita en los CEM y en el sistema de salud público.' },
  ],
  tipos: [
    { titulo: 'Violencia física',       desc: 'Golpes, empujones, patadas, quemaduras o cualquier acción que cause daño corporal.' },
    { titulo: 'Violencia psicológica',  desc: 'Insultos, humillaciones, amenazas, control, aislamiento. Daña tu salud mental y autoestima.' },
    { titulo: 'Violencia sexual',       desc: 'Cualquier acto sexual sin tu consentimiento, incluyendo dentro del matrimonio o convivencia.' },
    { titulo: 'Violencia económica',    desc: 'Control del dinero, impedirte trabajar, destruir tus bienes o no cumplir obligaciones alimentarias.' },
  ],
  que_hacer: [
    { titulo: 'Busca un lugar seguro',    desc: 'Si estás en peligro inmediato, sal del lugar y ve a casa de un familiar, vecino de confianza o CEM.' },
    { titulo: 'Llama al 100',            desc: 'La Línea 100 del MIMP te brinda orientación, consejería y derivación 24/7, de forma gratuita y confidencial.' },
    { titulo: 'Denuncia en la comisaría', desc: 'La PNP está obligada a recibir tu denuncia de inmediato. Pide copia de la denuncia y el número de caso.' },
    { titulo: 'Guarda evidencias',        desc: 'Fotografía las lesiones, guarda mensajes amenazantes, testigos presenciales. Serán clave en el proceso legal.' },
    { titulo: 'Acude al CEM',            desc: 'Los Centros de Emergencia Mujer ofrecen atención legal, psicológica y social gratuita en todo el Perú.' },
  ],
};

const MITOS: MitoItem[] = [
  {
    mito:   'La violencia solo es cuando hay golpes',
    verdad: 'FALSO. La violencia psicológica, económica y sexual son igual de graves y están tipificadas por ley.',
  },
  {
    mito:   'Si no salió antes, es porque le gusta',
    verdad: 'FALSO. El ciclo de violencia genera dependencia emocional, miedo y aislamiento que dificultan salir.',
  },
  {
    mito:   'Es un problema privado de pareja',
    verdad: 'FALSO. La violencia de género es un delito público. El Estado tiene la obligación de intervenir.',
  },
  {
    mito:   'Si la mujer lo perdona, el ciclo termina',
    verdad: 'FALSO. Sin intervención profesional y sin consecuencias legales, el ciclo de violencia se repite y escala.',
  },
];

const EMERGENCIAS = [
  { label: 'Línea 100 — Apoyo a la Mujer', numero: '100', icono: 'heart-outline', color: '#E91E8C' },
  { label: 'Emergencias Policiales',        numero: '105', icono: 'shield-outline', color: '#D32F2F' },
  { label: 'SAMU — Emergencias Médicas',    numero: '106', icono: 'car-outline', color: '#D32F2F' },
  { label: 'Central de Emergencias',        numero: '911', icono: 'call-outline', color: '#D32F2F' },
];

export default function InfoScreen({}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaId>('derechos');
  const [mitosAbiertos, setMitosAbiertos] = useState<number[]>([]);

  const toggleMito = (i: number) =>
    setMitosAbiertos((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);

  const iconoActivo = CATEGORIAS.find((c) => c.id === categoriaActiva)?.icono ?? 'information-outline';

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.text }]}>Recursos</Text>
      <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
        Información y ayuda para protegerte
      </Text>

      {/* Menú de categorías */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.menuScroll} contentContainerStyle={styles.menuContainer}>
        {CATEGORIAS.map((cat) => {
          const activo = categoriaActiva === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.menuItem, { backgroundColor: activo ? colors.primary : colors.surface, borderColor: activo ? colors.primary : colors.border }]}
              onPress={() => setCategoriaActiva(cat.id)}
            >
              <Ionicons name={cat.icono as any} size={16} color={activo ? colors.textOnPrimary : colors.primary} />
              <Text style={[styles.menuLabel, { color: activo ? colors.textOnPrimary : colors.primary }, activo && styles.menuLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Contenido informativo */}
      {(categoriaActiva === 'derechos' || categoriaActiva === 'tipos' || categoriaActiva === 'que_hacer') &&
        CONTENIDO[categoriaActiva].map((item, i) => (
          <View key={i} style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardHeader}>
              <Ionicons name={iconoActivo as any} size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.titulo}</Text>
            </View>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
          </View>
        ))
      }

      {/* Mitos y verdades */}
      {categoriaActiva === 'mitos' && MITOS.map((item, i) => (
        <TouchableOpacity key={i} style={[styles.card, { backgroundColor: colors.surface }]} onPress={() => toggleMito(i)} activeOpacity={0.8}>
          <View style={styles.mitoHeader}>
            <View style={[styles.mitoBadge, { backgroundColor: colors.warning }]}>
              <Text style={styles.mitoBadgeText}>MITO</Text>
            </View>
            <Text style={[styles.mitoText, { color: colors.text }]} numberOfLines={2}>{item.mito}</Text>
            <Ionicons name={mitosAbiertos.includes(i) ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
          </View>
          {mitosAbiertos.includes(i) && (
            <View style={[styles.verdadBox, { backgroundColor: colors.successLight }]}>
              <Text style={[styles.verdadLabel, { color: colors.successText }]}>✓ VERDAD</Text>
              <Text style={[styles.verdadText, { color: colors.text }]}>{item.verdad}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}

      {/* Emergencias */}
      {categoriaActiva === 'emergencias' && EMERGENCIAS.map(({ label, numero, icono, color }, i) => (
        <TouchableOpacity key={i} style={[styles.emergCard, { backgroundColor: colors.surface }]} onPress={() => Linking.openURL(`tel:${numero}`)} activeOpacity={0.8}>
          <View style={[styles.emergIconBox, { backgroundColor: color + '18' }]}>
            <Ionicons name={icono as any} size={24} color={color} />
          </View>
          <View style={styles.emergTextos}>
            <Text style={[styles.emergLabel, { color: colors.text }]}>{label}</Text>
            <Text style={[styles.emergNumero, { color: color }]}>{numero}</Text>
          </View>
          <View style={[styles.llamarBtn, { backgroundColor: color }]}>
            <Ionicons name="call" size={14} color="#fff" />
            <Text style={styles.llamarText}>Llamar</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:      { flex: 1 },
  container:   { paddingHorizontal: 20, paddingBottom: 40 },
  pageTitle:   { fontFamily: 'Montserrat-ExtraBold', fontSize: 24, marginBottom: 4 },
  pageSubtitle:{ fontFamily: 'Inter-Regular', fontSize: 13, marginBottom: 20 },

  menuScroll:    { marginBottom: 24 },
  menuContainer: { gap: 10, paddingRight: 4 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5,
  },
  menuLabel:       { fontFamily: 'Inter-Regular', fontSize: 12 },
  menuLabelActive: { fontFamily: 'Montserrat-ExtraBold' },

  card: {
    borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle:  { fontFamily: 'Montserrat-ExtraBold', fontSize: 14, flex: 1 },
  cardDesc:   { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 20 },

  mitoHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mitoBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  mitoBadgeText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 10, color: '#FFFFFF' },
  mitoText:      { fontFamily: 'Inter-Regular', fontSize: 13, flex: 1 },
  verdadBox:     { marginTop: 12, borderRadius: 10, padding: 12 },
  verdadLabel:   { fontFamily: 'Montserrat-ExtraBold', fontSize: 12, marginBottom: 4 },
  verdadText:    { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 20 },

  emergCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  emergIconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emergTextos:  { flex: 1 },
  emergLabel:   { fontFamily: 'Montserrat-ExtraBold', fontSize: 12 },
  emergNumero:  { fontFamily: 'Montserrat-ExtraBold', fontSize: 24 },
  llamarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  llamarText: { fontFamily: 'Montserrat-ExtraBold', fontSize: 12, color: '#FFFFFF' },
});
