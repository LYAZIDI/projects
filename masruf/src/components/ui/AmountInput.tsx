import React, { useState } from 'react'
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { COULEURS, POLICES, RAYONS, ESPACEMENTS } from '../../constants/theme'

interface AmountInputProps {
  valeur: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
}

const CHIFFRES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']

export function AmountInput({ valeur, onChange, autoFocus = false }: AmountInputProps) {
  const handleTouche = (c: string) => {
    if (c === '⌫') {
      onChange(valeur.slice(0, -1))
      return
    }
    // Empêcher deux points décimaux
    if (c === '.' && valeur.includes('.')) return
    // Limiter à 2 décimales
    const parts = valeur.split('.')
    if (parts[1] && parts[1].length >= 2) return
    // Limiter à 6 chiffres avant la virgule
    if (!valeur.includes('.') && valeur.replace(/^0/, '').length >= 6 && c !== '.') return

    if (valeur === '0' && c !== '.') onChange(c)
    else onChange(valeur + c)
  }

  return (
    <View style={styles.container}>
      {/* Affichage montant */}
      <View style={styles.affichage}>
        <Text style={styles.montant} numberOfLines={1} adjustsFontSizeToFit>
          {valeur || '0'}
        </Text>
        <Text style={styles.devise}>DH</Text>
      </View>

      {/* Clavier numérique */}
      <View style={styles.clavier}>
        {CHIFFRES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.touche, c === '.' && styles.touchePoint, c === '⌫' && styles.toucheEffacer]}
            onPress={() => handleTouche(c)}
            activeOpacity={0.6}
          >
            <Text style={[styles.toucheTexte, c === '⌫' && styles.toucheEffacerTexte]}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  affichage: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: ESPACEMENTS.lg,
    gap: ESPACEMENTS.sm,
    minHeight: 80,
  },
  montant: {
    fontSize: 52,
    fontWeight: '800',
    color: COULEURS.text,
    letterSpacing: -2,
  },
  devise: {
    fontSize: POLICES.taille.xl,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.text2,
    marginBottom: 8,
  },
  clavier: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    gap: 10,
    paddingHorizontal: ESPACEMENTS.md,
  },
  touche: {
    width: '30%',
    flex: 1,
    aspectRatio: 1.8,
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
  },
  touchePoint: {
    backgroundColor: COULEURS.bg2,
  },
  toucheEffacer: {
    backgroundColor: 'rgba(255,77,106,0.1)',
    borderColor: 'rgba(255,77,106,0.3)',
  },
  toucheTexte: {
    fontSize: POLICES.taille.xl,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.text,
  },
  toucheEffacerTexte: {
    color: COULEURS.danger,
  },
})
