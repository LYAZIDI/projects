import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Dimensions
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useExpensesStore } from '../../src/store/useExpensesStore'
import { useBudgetStore } from '../../src/store/useBudgetStore'
import { PieChartView } from '../../src/components/PieChartView'
import { LineChartView } from '../../src/components/LineChartView'
import { ExpenseItem } from '../../src/components/ExpenseItem'
import { BudgetProgress } from '../../src/components/BudgetProgress'
import { Card } from '../../src/components/ui/Card'
import {
  formatMAD, formatMoisAnnee, moisCourant, moisPrecedent, moisSuivant
} from '../../src/utils/formatters'
import { depenseDB } from '../../src/db/client'
import { COULEURS, POLICES, ESPACEMENTS, RAYONS } from '../../src/constants/theme'

const { width } = Dimensions.get('window')

export default function DashboardScreen() {
  const router = useRouter()
  const {
    depenses, categories, moisSelectionne, chargement,
    chargerDepensesMois, totalMois, statsByCategorie,
    depensesRecentes, getCategorieById, setMois,
  } = useExpensesStore()
  const { budget, chargerBudget, budgetRestant, estDepasse } = useBudgetStore()

  const [historiqueMois, setHistoriqueMois] = useState<Array<{ mois: string; total: number }>>([])
  const [raffraichissement, setRaffraichissement] = useState(false)

  useEffect(() => {
    chargerHistorique()
  }, [])

  const chargerHistorique = async () => {
    const data = await depenseDB.getTotauxDerniersMois(6)
    setHistoriqueMois(data.reverse())
  }

  const onRaffraichir = useCallback(async () => {
    setRaffraichissement(true)
    await Promise.all([chargerDepensesMois(), chargerBudget(), chargerHistorique()])
    setRaffraichissement(false)
  }, [moisSelectionne])

  const total = totalMois()
  const stats = statsByCategorie()
  const recentes = depensesRecentes(5)
  const restant = budgetRestant(total)

  const peutAllerAvant = moisSelectionne < moisCourant()

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={raffraichissement}
            onRefresh={onRaffraichir}
            tintColor={COULEURS.accent}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.bonjour}>Bonjour 👋</Text>
            <Text style={styles.sousTitre}>Vos dépenses de {formatMoisAnnee(moisSelectionne)}</Text>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => {/* notifications */}}
          >
            <Ionicons name="notifications-outline" size={22} color={COULEURS.text2} />
          </TouchableOpacity>
        </View>

        {/* Sélecteur de mois */}
        <View style={styles.moisSelector}>
          <TouchableOpacity
            onPress={() => { setMois(moisPrecedent(moisSelectionne)); chargerBudget(moisPrecedent(moisSelectionne)) }}
            style={styles.moisBtn}
          >
            <Ionicons name="chevron-back" size={20} color={COULEURS.text2} />
          </TouchableOpacity>
          <Text style={styles.moisTexte}>{formatMoisAnnee(moisSelectionne)}</Text>
          <TouchableOpacity
            onPress={() => {
              if (peutAllerAvant) {
                setMois(moisSuivant(moisSelectionne))
                chargerBudget(moisSuivant(moisSelectionne))
              }
            }}
            style={[styles.moisBtn, !peutAllerAvant && styles.moisBtnDesactive]}
            disabled={!peutAllerAvant}
          >
            <Ionicons name="chevron-forward" size={20} color={peutAllerAvant ? COULEURS.text2 : COULEURS.text3} />
          </TouchableOpacity>
        </View>

        {/* Carte total */}
        <Card style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total dépensé</Text>
          <Text style={styles.totalMontant}>{formatMAD(total)}</Text>
          {budget && (
            <View style={styles.totalBudgetRow}>
              <Ionicons
                name={estDepasse(total) ? 'warning-outline' : 'checkmark-circle-outline'}
                size={14}
                color={estDepasse(total) ? COULEURS.danger : COULEURS.success}
              />
              <Text style={[styles.totalBudgetTexte, { color: estDepasse(total) ? COULEURS.danger : COULEURS.success }]}>
                {estDepasse(total)
                  ? `Budget dépassé de ${formatMAD(Math.abs(restant ?? 0))}`
                  : `${formatMAD(restant ?? 0)} restants sur ${formatMAD(budget.montant)}`}
              </Text>
            </View>
          )}
        </Card>

        {/* Budget progress */}
        {budget && (
          <Card style={styles.section}>
            <BudgetProgress budget={budget} totalDepenses={total} />
          </Card>
        )}

        {/* Graphique répartition */}
        {stats.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitre}>Répartition par catégorie</Text>
            <PieChartView stats={stats} taille={Math.min(width - 80, 220)} />
          </Card>
        )}

        {/* Courbe historique */}
        {historiqueMois.length >= 2 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitre}>Évolution 6 mois</Text>
            <LineChartView
              donnees={historiqueMois}
              largeur={width - 80}
              hauteur={130}
            />
          </Card>
        )}

        {/* Dépenses récentes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitre}>Récentes</Text>
            <TouchableOpacity onPress={() => router.push('/depenses' as any)}>
              <Text style={styles.voirTout}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          {recentes.length === 0 ? (
            <Card style={styles.videCard}>
              <Ionicons name="receipt-outline" size={36} color={COULEURS.text3} />
              <Text style={styles.videTexte}>Aucune dépense ce mois-ci</Text>
              <TouchableOpacity
                style={styles.ajouterBtn}
                onPress={() => router.push('/modal/ajouter')}
              >
                <Text style={styles.ajouterBtnTexte}>+ Ajouter une dépense</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <View style={styles.liste}>
              {recentes.map(d => (
                <ExpenseItem
                  key={d.id}
                  depense={d}
                  categorie={getCategorieById(d.categorie_id)}
                  onPress={() => router.push({ pathname: '/modal/modifier', params: { id: d.id } } as any)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Stats rapides */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Ionicons name="receipt-outline" size={20} color={COULEURS.accent} />
            <Text style={styles.statValeur}>{depenses.length}</Text>
            <Text style={styles.statLabel}>Opérations</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="trending-up-outline" size={20} color={COULEURS.warning} />
            <Text style={styles.statValeur}>
              {depenses.length > 0 ? formatMAD(total / depenses.length, true) : '—'}
            </Text>
            <Text style={styles.statLabel}>Moyenne</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="star-outline" size={20} color={COULEURS.success} />
            <Text style={styles.statValeur} numberOfLines={1}>
              {stats[0]?.categorie.nom ?? '—'}
            </Text>
            <Text style={styles.statLabel}>Top catégorie</Text>
          </Card>
        </View>

        <View style={{ height: ESPACEMENTS.xl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COULEURS.bg },
  scroll: { flex: 1 },
  content: { padding: ESPACEMENTS.md, gap: ESPACEMENTS.md },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: ESPACEMENTS.xs,
  },
  bonjour: {
    fontSize: POLICES.taille.xxl,
    fontWeight: POLICES.poids.heavy,
    color: COULEURS.text,
    letterSpacing: -0.5,
  },
  sousTitre: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text2,
    marginTop: 2,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COULEURS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
  },

  moisSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACEMENTS.lg,
  },
  moisBtn: {
    padding: ESPACEMENTS.xs,
  },
  moisBtnDesactive: { opacity: 0.3 },
  moisTexte: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.text,
    minWidth: 140,
    textAlign: 'center',
    textTransform: 'capitalize',
  },

  totalCard: {
    alignItems: 'center',
    paddingVertical: ESPACEMENTS.xl,
    gap: ESPACEMENTS.sm,
    background: 'linear-gradient(135deg, #1C1C30, #252540)',
  },
  totalLabel: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalMontant: {
    fontSize: 42,
    fontWeight: POLICES.poids.heavy,
    color: COULEURS.text,
    letterSpacing: -1,
  },
  totalBudgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalBudgetTexte: {
    fontSize: POLICES.taille.sm,
    fontWeight: POLICES.poids.medium,
  },

  section: { gap: ESPACEMENTS.md },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sectionTitre: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.text,
  },
  voirTout: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.accent,
    fontWeight: POLICES.poids.medium,
  },

  liste: { gap: ESPACEMENTS.xs },

  videCard: {
    alignItems: 'center',
    paddingVertical: ESPACEMENTS.xxl,
    gap: ESPACEMENTS.md,
  },
  videTexte: {
    fontSize: POLICES.taille.md,
    color: COULEURS.text2,
  },
  ajouterBtn: {
    backgroundColor: COULEURS.accentLight,
    paddingVertical: ESPACEMENTS.sm,
    paddingHorizontal: ESPACEMENTS.lg,
    borderRadius: RAYONS.full,
    borderWidth: 1,
    borderColor: COULEURS.accent,
  },
  ajouterBtnTexte: {
    color: COULEURS.accent,
    fontWeight: POLICES.poids.semibold,
    fontSize: POLICES.taille.sm,
  },

  statsRow: {
    flexDirection: 'row',
    gap: ESPACEMENTS.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: ESPACEMENTS.md,
    gap: ESPACEMENTS.xs,
  },
  statValeur: {
    fontSize: POLICES.taille.sm,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.text,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: POLICES.taille.xs,
    color: COULEURS.text2,
  },
})
