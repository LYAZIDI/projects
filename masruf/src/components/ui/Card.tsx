import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { COULEURS, RAYONS, ESPACEMENTS } from '../../constants/theme'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
  padding?: number
}

export function Card({ children, style, padding = ESPACEMENTS.md }: CardProps) {
  return (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.lg,
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
  },
})
