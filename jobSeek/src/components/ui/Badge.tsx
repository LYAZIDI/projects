import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { COULEURS, POLICES, RAYONS, ESPACEMENTS } from '../../constants/theme'

type Variant = 'excellent' | 'bon' | 'faible' | 'default' | 'accent'

interface BadgeProps {
  label: string
  variant?: Variant
  small?: boolean
}

const VARIANT_STYLES: Record<Variant, { bg: string; color: string }> = {
  excellent: { bg: COULEURS.successLight, color: COULEURS.success },
  bon: { bg: COULEURS.warningLight, color: COULEURS.warning },
  faible: { bg: COULEURS.dangerLight, color: COULEURS.danger },
  accent: { bg: COULEURS.accentLight, color: COULEURS.accent },
  default: { bg: COULEURS.card2, color: COULEURS.text2 },
}

export function Badge({ label, variant = 'default', small = false }: BadgeProps) {
  const { bg, color } = VARIANT_STYLES[variant]
  return (
    <View style={[styles.badge, { backgroundColor: bg }, small && styles.small]}>
      <Text style={[styles.texte, { color }, small && styles.texteSmall]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: ESPACEMENTS.sm,
    paddingVertical: 3,
    borderRadius: RAYONS.full,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: ESPACEMENTS.xs + 2,
    paddingVertical: 2,
  },
  texte: {
    fontSize: POLICES.taille.xs,
    fontWeight: POLICES.poids.semibold,
    letterSpacing: 0.3,
  },
  texteSmall: {
    fontSize: 10,
  },
})
