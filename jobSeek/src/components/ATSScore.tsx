import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { COULEURS, POLICES, ESPACEMENTS, RAYONS } from '../constants/theme'

interface ATSScoreProps {
  score: number
  large?: boolean
}

export function ATSScore({ score, large = false }: ATSScoreProps) {
  const color =
    score >= 75 ? COULEURS.success :
    score >= 50 ? COULEURS.warning :
    COULEURS.danger

  const label =
    score >= 75 ? 'Excellent' :
    score >= 50 ? 'Bon' :
    'À améliorer'

  const size = large ? 100 : 72
  const radius = size / 2

  return (
    <View style={[styles.container, large && styles.containerLarge]}>
      <View style={[styles.cercle, { width: size, height: size, borderRadius: radius, borderColor: color }]}>
        <Text style={[styles.score, large && styles.scoreLarge, { color }]}>{score}</Text>
        <Text style={[styles.slash, { color: COULEURS.text3 }]}>/100</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.label, { color }]}>{label}</Text>
        <Text style={styles.titre}>Score ATS</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.md,
  },
  containerLarge: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: ESPACEMENTS.sm,
  },
  cercle: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontSize: POLICES.taille.xl,
    fontWeight: POLICES.poids.heavy,
  },
  scoreLarge: {
    fontSize: POLICES.taille.xxxl,
  },
  slash: {
    fontSize: POLICES.taille.xs,
  },
  info: {
    gap: 2,
  },
  label: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.bold,
  },
  titre: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text2,
  },
})
