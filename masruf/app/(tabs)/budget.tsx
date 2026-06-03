import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useBudgetStore } from '../../src/store/useBudgetStore'
import { useExpensesStore } from '../../src/store/useExpensesStore'
import { BudgetProgress } from '../../src/components/BudgetProgress'
import { Card } from '../../src/components/ui/Card'
import { Button } from '../../src/components/ui/Button'
import {
  formatMAD, formatMoisAnnee, moisCourant, couleurBudget, calculerPourcentage
} from '../../src/utils/formatters'
import { COULEURS, POLICES, ESPACEMENTS, RAYONS } from '../../src/constants/theme'

export default function BudgetScreen() {
  const { budget, chargement, definirBudget, supprimerBudget } = useBudgetStore()
  const { totalMois, statsByCategorie } = useExpensesStore()

  const [montantInput, setMontantInput] = useState(budget?.montant?.toString() ?? '')
  const [alerteInput, setAlerteInput] = useState(budget?.alerte_pourcent?.toString() ?? '80')
  const [modeEdition, setModeEdition] = useState(!budget)

  const total = totalMois()
  const stats = statsByCategorie()

  const enregistrer = async () => {
    const montant = parseFloat(montantInput.replace(',', '.'))
    if (isNaN(montant) || montant <= 0) {
      Alert.alert('Montant invalide', 'Veuillez saisir un budget valide en DH.')
      return
    }
    const alerte = parseInt(alerteInput) || 80
    await definirBudget(montant, Math.min(100, Math.max(50, alerte)))
    setModeEdition(false)
  }

  const confirmerSuppression = () => {
    Alert.alert(
      'Supprimer le budget',
      'Voulez-vous supprimer le budget de ce mois ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          await supprimerBudget()
          setMontantInput('')
          setAlerteInput('80')
          setModeEdition(true)
        }},
      ]
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.titre}>Budget</Text>
            <Text style={styles.sousTitre}>{formatMoisAnnee(moisCourant())}</Text>
          </View>

          {/* Formulaire budget */}
          <Card style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitre}>
                {budget ? 'Budget mensuel' : 'Définir un budget'}
              </Text>
              {budget && (
                <View style={styles.formActions}>
                  <TouchableOpacity onPress={() => { setMontantInput(budget.montant.toString()); setModeEdition(v => !v) }}>
                    <Ionicons
                      name={modeEdition ? 'close-outline' : 'pencil-outline'}
                      size={20}
                      color={COULEURS.text2}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={confirmerSuppression}>
                    <Ionicons name="trash-outline" size={20} color={COULEURS.danger} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {modeEdition ? (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Montant mensuel (DH)</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      placeholder="ex: 3000"
                      placeholderTextColor={COULEURS.text3}
                      value={montantInput}
                      onChangeText={setMontantInput}
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.inputSuffixe}>DH</Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Alerte à (%) — défaut 80%</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      placeholder="80"
                      placeholderTextColor={COULEURS.text3}
                      value={alerteInput}
                      onChangeText={setAlerteInput}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                    <Text style={styles.inputSuffixe}>%</Text>
                  </View>
                </View>

                <View style={styles.suggestionsRow}>
                  {[2000, 3000, 5000, 8000].map(s => (
                    <TouchableOpacity
                      key={s}
                      style={styles.suggestion}
                      onPress={() => setMontantInput(s.toString())}
                    >
                      <Text style={styles.suggestionTexte}>{formatMAD(s, true)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Button
                  label={budget ? 'Mettre à jour' : 'Définir le budget'}
                  onPress={enregistrer}
                  chargement={chargement}
                />
              </View>
            ) : (
              budget && <BudgetProgress budget={budget} totalDepenses={total} />
            )}
          </Card>

          {/* Conseils si pas de budget */}
          {!budget && !modeEdition && (
            <Card style={styles.conseil}>
              <Ionicons name="bulb-outline" size={24} color={COULEURS.warning} />
              <Text style={styles.conseilTitre}>Conseil</Text>
              <Text style={styles.conseilTexte}>
                Définissez un budget mensuel pour mieux contrôler vos dépenses et recevoir des alertes avant de le dépasser.
              </Text>
            </Card>
          )}

          {/* Répartition par catégorie */}
          {stats.length > 0 && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitre}>Répartition ce mois</Text>
              {stats.map(s => (
                <View key={s.categorie.id} style={styles.statItem}>
                  <View style={styles.statGauche}>
                    <View style={[styles.statPoint, { backgroundColor: s.categorie.couleur }]} />
                    <View>
                      <Text style={styles.statNom}>{s.categorie.nom}</Text>
                      <Text style={styles.statNombre}>{s.nombre} opération{s.nombre > 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                  <View style={styles.statDroite}>
                    <Text style={styles.statMontant}>{formatMAD(s.total)}</Text>
                    {budget && (
                      <Text style={[styles.statPct, { color: couleurBudget(calculerPourcentage(s.total, budget.montant)) }]}>
                        {calculerPourcentage(s.total, budget.montant)}% du budget
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </Card>
          )}

          {/* Projection */}
          {budget && total > 0 && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitre}>📊 Projection fin de mois</Text>
              <ProjectionCard budget={budget.montant} total={total} />
            </Card>
          )}

          <View style={{ height: ESPACEMENTS.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function ProjectionCard({ budget, total }: { budget: number; total: number }) {
  const { joursDansMois, joursRestantsMois } = require('../../src/utils/formatters')
  const joursEcoules = joursDansMois() - joursRestantsMois()
  if (joursEcoules <= 0) return null

  const moyenneJour = total / joursEcoules
  const projection = moyenneJour * joursDansMois()
  const ecart = projection - budget
  const couleur = ecart > 0 ? COULEURS.danger : COULEURS.success

  return (
    <View style={styles.projectionContent}>
      <View style={styles.projRow}>
        <Text style={styles.projLabel}>Moyenne / jour</Text>
        <Text style={styles.projValeur}>{formatMAD(moyenneJour)}</Text>
      </View>
      <View style={styles.projRow}>
        <Text style={styles.projLabel}>Projection fin de mois</Text>
        <Text style={[styles.projValeur, { color: couleur }]}>{formatMAD(projection)}</Text>
      </View>
      <View style={styles.projRow}>
        <Text style={styles.projLabel}>{ecart > 0 ? 'Dépassement prévu' : 'Économies prévues'}</Text>
        <Text style={[styles.projValeur, { color: couleur }]}>
          {ecart > 0 ? '+' : '-'}{formatMAD(Math.abs(ecart))}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COULEURS.bg },
  scroll: { flex: 1 },
  content: { padding: ESPACEMENTS.md, gap: ESPACEMENTS.md },

  header: { marginBottom: ESPACEMENTS.xs },
  titre: {
    fontSize: POLICES.taille.xxl,
    fontWeight: POLICES.poids.heavy,
    color: COULEURS.text,
    letterSpacing: -0.5,
  },
  sousTitre: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text2,
    marginTop: 2,
    textTransform: 'capitalize',
  },

  formCard: { gap: ESPACEMENTS.md },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formTitre: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.text,
  },
  formActions: { flexDirection: 'row', gap: ESPACEMENTS.md },

  form: { gap: ESPACEMENTS.md },

  inputGroup: { gap: ESPACEMENTS.xs },
  inputLabel: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text2,
    fontWeight: POLICES.poids.medium,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COULEURS.bg2,
    borderRadius: RAYONS.md,
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingHorizontal: ESPACEMENTS.md,
    paddingVertical: ESPACEMENTS.sm + 2,
    color: COULEURS.text,
    fontSize: POLICES.taille.lg,
    fontWeight: POLICES.poids.semibold,
  },
  inputSuffixe: {
    paddingHorizontal: ESPACEMENTS.md,
    fontSize: POLICES.taille.md,
    color: COULEURS.text2,
    fontWeight: POLICES.poids.medium,
    borderLeftWidth: 1,
    borderLeftColor: COULEURS.cardBorder,
  },

  suggestionsRow: {
    flexDirection: 'row',
    gap: ESPACEMENTS.sm,
    flexWrap: 'wrap',
  },
  suggestion: {
    paddingHorizontal: ESPACEMENTS.md,
    paddingVertical: ESPACEMENTS.xs,
    backgroundColor: COULEURS.accentLight,
    borderRadius: RAYONS.full,
    borderWidth: 1,
    borderColor: COULEURS.accent,
  },
  suggestionTexte: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.accent,
    fontWeight: POLICES.poids.medium,
  },

  conseil: { alignItems: 'center', gap: ESPACEMENTS.sm, paddingVertical: ESPACEMENTS.lg },
  conseilTitre: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.warning,
  },
  conseilTexte: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text2,
    textAlign: 'center',
    lineHeight: 20,
  },

  section: { gap: ESPACEMENTS.md },
  sectionTitre: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.text,
  },

  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: ESPACEMENTS.xs,
    borderBottomWidth: 1,
    borderBottomColor: COULEURS.border,
  },
  statGauche: { flexDirection: 'row', alignItems: 'center', gap: ESPACEMENTS.sm, flex: 1 },
  statPoint: { width: 10, height: 10, borderRadius: 5 },
  statNom: { fontSize: POLICES.taille.sm, fontWeight: POLICES.poids.semibold, color: COULEURS.text },
  statNombre: { fontSize: POLICES.taille.xs, color: COULEURS.text3 },
  statDroite: { alignItems: 'flex-end' },
  statMontant: { fontSize: POLICES.taille.sm, fontWeight: POLICES.poids.bold, color: COULEURS.text },
  statPct: { fontSize: POLICES.taille.xs, fontWeight: POLICES.poids.medium },

  projectionContent: { gap: ESPACEMENTS.sm },
  projRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  projLabel: { fontSize: POLICES.taille.sm, color: COULEURS.text2 },
  projValeur: { fontSize: POLICES.taille.sm, fontWeight: POLICES.poids.bold, color: COULEURS.text },
})
