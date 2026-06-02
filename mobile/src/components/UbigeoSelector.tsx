import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { useTheme } from '../theme';

interface Props {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  opciones: string[];
  disabled?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

export default function UbigeoSelector({
  label,
  placeholder,
  value,
  onChange,
  opciones,
  disabled = false,
  colors,
}: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  // Solo muestra resultados que coinciden con lo escrito
  const filtradas = query.trim().length > 0
    ? opciones.filter((o) => {
        const q = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        return o.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q);
      })
    : [];

  const handleSelect = (opcion: string) => {
    setQuery(opcion);
    onChange(opcion);
    setOpen(false);
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (text !== value) onChange('');
    // El dropdown aparece solo cuando hay texto; si borra todo, se cierra
    setOpen(text.trim().length > 0);
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    setOpen(false);
  };

  const handleFocus = () => {
    setFocused(true);
    // No abre el dropdown al hacer tap: espera a que el usuario escriba
  };

  const handleBlur = () => {
    setFocused(false);
    setTimeout(() => setOpen(false), 150);
  };

  // Sincroniza el texto visible cuando value se resetea desde afuera
  useEffect(() => {
    if (!value) setQuery('');
  }, [value]);

  const borderColor = focused ? colors.primary : colors.border;
  const showDropdown = open && !disabled && filtradas.length > 0;
  const sinResultados = open && !disabled && query.trim().length > 0 && filtradas.length === 0;

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>

      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: disabled ? colors.surfaceVariant : colors.surface,
            borderColor,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: disabled ? colors.textDisabled : colors.text }]}
          value={query}
          onChangeText={handleChangeText}
          placeholder={disabled ? 'Selecciona el campo anterior primero' : placeholder}
          placeholderTextColor={colors.textDisabled}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="done"
        />
        {query.length > 0 && !disabled ? (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.textDisabled} />
          </TouchableOpacity>
        ) : null}
        {/* Indicador de estado: check si hay valor seleccionado, flecha si está interactuando */}
        {value ? (
          <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.statusIcon} />
        ) : (
          <Ionicons
            name={focused ? 'search-outline' : 'chevron-down'}
            size={16}
            color={disabled ? colors.textDisabled : colors.textSecondary}
            style={styles.statusIcon}
          />
        )}
      </View>

      {/* Dropdown — solo aparece cuando hay texto escrito y hay coincidencias */}
      {showDropdown && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: colors.surface, borderColor: colors.primary },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            style={{ maxHeight: 200 }}
            showsVerticalScrollIndicator={false}
          >
            {filtradas.slice(0, 8).map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.option,
                  item === value && { backgroundColor: colors.primarySubtle },
                ]}
                onPress={() => handleSelect(item)}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: item === value ? colors.primary : colors.text },
                    item === value && { fontFamily: 'Montserrat-ExtraBold' },
                  ]}
                >
                  {item}
                </Text>
                {item === value && (
                  <Ionicons name="checkmark" size={14} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Mensaje cuando no hay coincidencias */}
      {sinResultados && (
        <View
          style={[
            styles.dropdown,
            styles.dropdownEmpty,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search-outline" size={14} color={colors.textDisabled} />
          <Text style={[styles.emptyText, { color: colors.textDisabled }]}>
            Sin coincidencias para "{query}"
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 4,
    zIndex: 10,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginBottom: 6,
    marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  clearBtn: {
    padding: 6,
  },
  statusIcon: {
    marginRight: 10,
  },
  dropdown: {
    position: 'absolute',
    top: 78,
    left: 0,
    right: 0,
    borderWidth: 1.5,
    borderRadius: 10,
    zIndex: 999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  dropdownEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
});
