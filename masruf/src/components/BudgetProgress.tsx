import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Budget } from '../types'
import { formatMAD, calculerPourcentage, couleurBudget } from '../utils/formatters'
import { COULEURS, POLICES, RAYONS, ESPACEMENTS } from '../constants/theme'

interface BudgetProgressProps {
  budget: Budget
  totalDepenses: number
  compact?: boolean
}

export function BudgetProgress({ budget, totalDepenses, compact = false }: BudgetProgressProps) {
  const pct = calculerPourcentage(totalDepenses, budget.montant)
  const restant = budget.montant - totalDepenses
  const estDepasse = restant < 0
  const couleur = couleurBudget(pct)

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.headerGauche}>
          <Ionicons name="wallet-outline" size={18} color={couleur} />
          <Text style={styles.titre}>Budget {estDepasse ? '⚠️' : ''}</Text>
        </View>
        <Text style={[styles.pct, { color: couleur }]}>{pct}%</Text>
      </View>

      {/* Barre */}
      <View style={styles.barreContainer}>
        <View
          style={[
            styles.barreFill,
            { width: `${Math.min(100, pct)}%`, backgroundColor: couleur },
          ]}
        />
        {/* Marqueur alerte */}
        {budget.alerte_pourcent < 100 && (
          <View style={[styles.marqueur, { left: `${budget.alerte_pourcent}%` }]} />
        )}
      </View>

      {/* Détails */}
      {!compact && (
        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Dépensé</Text>
            <Text style={[styles.detailValeur, { color: COULEURS.danger }]}>
              {formatMAD(totalDepenses)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Budget total</Text>
            <Text style={styles.detailValeur}>{formatMAD(budget.montant)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{estDepasse ? 'Dépassement' : 'Restant'}</Text>
            <Text style={[styles.detailValeur, { color: couleur }]}>
              {estDepasse ? '+' : ''}{formatMAD(Math.abs(restant))}
            </Text>
          </View>
        </View>
      )}

      {compact && (
        <Text style={[styles.restantCompact, { color: couleur }]}>
          {estDepasse
            ? `Dépassement de ${formatMAD(Math.abs(restant))}`
            : `${formatMAD(restant)} restants`}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: ESPACEMENTS.sm + 2,
  },
  containerCompact: {
    gap: ESPACEMENTS.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerGauche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.xs,
  },
  titre: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.text,
  },
  pct: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.bold,
  },
  barreContainer: {
    height: 8,
    backgroundColor: COULEURS.bg2,
    borderRadius: RAYONS.full,
    overflow: 'hidden',
    position: 'relative',
  },
  barreFill: {
    height: '100%',
    borderRadius: RAYONS.full,
  },
  marqueur: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: '100%',
    backgroundColor: COULEURS.warning,
    opacity: 0.7,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    alignItems: 'center',
    gap: 2,
  },
  detailLabel: {
    fontSize: POLICES.taille.xs,
    color: COULEURS.text2,
  },
  detailValeur: {
    fontSize: POLICES.taille.sm,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.text,
  },
  restantCompact: {
    fontSize: POLICES.taille.sm,
    fontWeight: POLICES.poids.medium,
  },
})
