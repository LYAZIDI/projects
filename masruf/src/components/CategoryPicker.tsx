import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Categorie } from '../types'
import { COULEURS, POLICES, RAYONS, ESPACEMENTS } from '../constants/theme'

interface CategoryPickerProps {
  categories: Categorie[]
  selectionne: string | null
  onSelect: (id: string) => void
}

export function CategoryPicker({ categories, selectionne, onSelect }: CategoryPickerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {categories.map(cat => {
        const estSelectionne = cat.id === selectionne
        return (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.item,
              { borderColor: estSelectionne ? cat.couleur : COULEURS.cardBorder },
              estSelectionne && { backgroundColor: cat.couleur + '20' },
            ]}
            onPress={() => onSelect(cat.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.icone, { backgroundColor: cat.couleur + '30' }]}>
              <Ionicons name={cat.icone as any} size={20} color={cat.couleur} />
            </View>
            <Text style={[styles.nom, estSelectionne && { color: cat.couleur }]}>
              {cat.nom}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

// Version grille (pour formulaire)
export function CategoryGrid({ categories, selectionne, onSelect }: CategoryPickerProps) {
  return (
    <View style={styles.grille}>
      {categories.map(cat => {
        const estSelectionne = cat.id === selectionne
        return (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.grilleItem,
              { borderColor: estSelectionne ? cat.couleur : COULEURS.cardBorder },
              estSelectionne && { backgroundColor: cat.couleur + '20' },
            ]}
            onPress={() => onSelect(cat.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={cat.icone as any}
              size={24}
              color={estSelectionne ? cat.couleur : COULEURS.text2}
            />
            <Text style={[styles.grilleNom, estSelectionne && { color: cat.couleur }]} numberOfLines={1}>
              {cat.nom}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: {
    gap: ESPACEMENTS.sm,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.xs,
    paddingVertical: ESPACEMENTS.xs,
    paddingHorizontal: ESPACEMENTS.sm + 2,
    borderRadius: RAYONS.full,
    borderWidth: 1.5,
    borderColor: COULEURS.cardBorder,
    backgroundColor: COULEURS.card,
  },
  icone: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nom: {
    fontSize: POLICES.taille.sm,
    fontWeight: POLICES.poids.medium,
    color: COULEURS.text2,
  },
  grille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ESPACEMENTS.sm,
  },
  grilleItem: {
    width: '22%',
    flex: 1,
    minWidth: 70,
    maxWidth: 90,
    aspectRatio: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACEMENTS.xs,
    borderRadius: RAYONS.md,
    borderWidth: 1.5,
    borderColor: COULEURS.cardBorder,
    backgroundColor: COULEURS.card,
    padding: ESPACEMENTS.xs,
  },
  grilleNom: {
    fontSize: POLICES.taille.xs,
    fontWeight: POLICES.poids.medium,
    color: COULEURS.text2,
    textAlign: 'center',
  },
})
