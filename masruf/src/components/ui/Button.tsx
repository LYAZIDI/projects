import React from 'react'
import {
  TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator
} from 'react-native'
import { COULEURS, RAYONS, POLICES, ESPACEMENTS } from '../../constants/theme'

type Variante = 'primaire' | 'secondaire' | 'fantome' | 'danger'

interface ButtonProps {
  label: string
  onPress: () => void
  variante?: Variante
  desactive?: boolean
  chargement?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
  icone?: React.ReactNode
}

export function Button({
  label, onPress, variante = 'primaire', desactive = false,
  chargement = false, style, textStyle, icone
}: ButtonProps) {
  const estDesactive = desactive || chargement

  return (
    <TouchableOpacity
      style={[styles.base, styles[variante], estDesactive && styles.desactive, style]}
      onPress={onPress}
      disabled={estDesactive}
      activeOpacity={0.75}
    >
      {chargement ? (
        <ActivityIndicator color={variante === 'primaire' ? '#fff' : COULEURS.accent} size="small" />
      ) : (
        <>
          {icone}
          <Text style={[styles.texte, styles[`texte_${variante}`], textStyle]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACEMENTS.sm,
    paddingVertical: 14,
    paddingHorizontal: ESPACEMENTS.lg,
    borderRadius: RAYONS.md,
    minHeight: 48,
  },
  primaire: {
    backgroundColor: COULEURS.accent,
  },
  secondaire: {
    backgroundColor: COULEURS.accentLight,
    borderWidth: 1,
    borderColor: COULEURS.accent,
  },
  fantome: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
  },
  danger: {
    backgroundColor: 'rgba(255,77,106,0.15)',
    borderWidth: 1,
    borderColor: COULEURS.danger,
  },
  desactive: {
    opacity: 0.45,
  },
  texte: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.semibold,
  },
  texte_primaire: { color: '#ffffff' },
  texte_secondaire: { color: COULEURS.accent },
  texte_fantome: { color: COULEURS.text2 },
  texte_danger: { color: COULEURS.danger },
})
