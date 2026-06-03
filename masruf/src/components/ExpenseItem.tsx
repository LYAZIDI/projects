import React from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Alert
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Depense, Categorie } from '../types'
import { formatMAD, formatDateAffichage } from '../utils/formatters'
import { COULEURS, POLICES, RAYONS, ESPACEMENTS } from '../constants/theme'
import { COMPTES_DEFAUT } from '../constants/categories'

interface ExpenseItemProps {
  depense: Depense
  categorie: Categorie | undefined
  onPress?: (d: Depense) => void
  onSupprimer?: (id: string) => void
}

export function ExpenseItem({ depense, categorie, onPress, onSupprimer }: ExpenseItemProps) {
  const compte = COMPTES_DEFAUT.find(c => c.id === depense.compte)

  const confirmerSuppression = () => {
    Alert.alert(
      'Supprimer la dépense',
      `Supprimer "${categorie?.nom || 'cette dépense'}" de ${formatMAD(depense.montant)} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => onSupprimer?.(depense.id) },
      ]
    )
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(depense)}
      onLongPress={onSupprimer ? confirmerSuppression : undefined}
      activeOpacity={0.7}
    >
      {/* Icône catégorie */}
      <View style={[styles.iconeContainer, { backgroundColor: (categorie?.couleur ?? COULEURS.accent) + '25' }]}>
        <Ionicons
          name={(categorie?.icone ?? 'ellipsis-horizontal-outline') as any}
          size={22}
          color={categorie?.couleur ?? COULEURS.accent}
        />
      </View>

      {/* Infos */}
      <View style={styles.infos}>
        <Text style={styles.nomCategorie}>{categorie?.nom ?? 'Inconnu'}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.date}>{formatDateAffichage(depense.date)}</Text>
          {depense.note ? (
            <>
              <Text style={styles.separateur}>·</Text>
              <Text style={styles.note} numberOfLines={1}>{depense.note}</Text>
            </>
          ) : null}
        </View>
      </View>

      {/* Droite */}
      <View style={styles.droite}>
        <Text style={styles.montant}>−{formatMAD(depense.montant)}</Text>
        <View style={styles.compteBadge}>
          <Ionicons name={(compte?.icone ?? 'cash-outline') as any} size={10} color={COULEURS.text3} />
          <Text style={styles.compteTexte}>{compte?.nom ?? depense.compte}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.md,
    paddingVertical: ESPACEMENTS.sm + 4,
    paddingHorizontal: ESPACEMENTS.md,
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.md,
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
  },
  iconeContainer: {
    width: 44,
    height: 44,
    borderRadius: RAYONS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infos: {
    flex: 1,
    gap: 3,
  },
  nomCategorie: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    fontSize: POLICES.taille.xs,
    color: COULEURS.text2,
  },
  separateur: {
    fontSize: POLICES.taille.xs,
    color: COULEURS.text3,
  },
  note: {
    flex: 1,
    fontSize: POLICES.taille.xs,
    color: COULEURS.text3,
  },
  droite: {
    alignItems: 'flex-end',
    gap: 4,
  },
  montant: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.danger,
  },
  compteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COULEURS.bg2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RAYONS.full,
  },
  compteTexte: {
    fontSize: 9,
    color: COULEURS.text3,
  },
})
