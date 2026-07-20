import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useExpensesStore } from '../../src/store/useExpensesStore'
import { AmountInput } from '../../src/components/ui/AmountInput'
import { CategoryGrid } from '../../src/components/CategoryPicker'
import { dateAujourdHui, formatDateAffichage } from '../../src/utils/formatters'
import { COULEURS, POLICES, ESPACEMENTS, RAYONS } from '../../src/constants/theme'
import { COMPTES_DEFAUT } from '../../src/constants/categories'
import type { CompteType } from '../../src/types'

export default function AjouterModal() {
  const router = useRouter()
  const { categories, ajouterDepense } = useExpensesStore()

  const [montant, setMontant] = useState('0')
  const [categorieId, setCategorieId] = useState<string | null>(null)
  const [date, setDate] = useState(dateAujourdHui())
  const [note, setNote] = useState('')
  const [compte, setCompte] = useState<CompteType>('cash')
  const [etape, setEtape] = useState<'montant' | 'details'>('montant')
  const [enregistrement, setEnregistrement] = useState(false)

  const montantNum = parseFloat(montant) || 0
  const pret = montantNum > 0 && categorieId !== null

  const passerAuxDetails = () => {
    if (montantNum <= 0) {
      Alert.alert('Montant invalide', 'Veuillez saisir un montant supérieur à 0.')
      return
    }
    setEtape('details')
  }

  const enregistrer = async () => {
    if (!pret) return
    setEnregistrement(true)
    try {
      await ajouterDepense({
        montant: montantNum,
        categorie_id: categorieId!,
        date,
        note,
        compte,
      })
      router.back()
    } catch (e) {
      Alert.alert('Erreur', `Impossible d'enregistrer : ${String(e)}`)
    } finally {
      setEnregistrement(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.fermerBtn}>
          <Ionicons name="close" size={24} color={COULEURS.text2} />
        </TouchableOpacity>
        <Text style={styles.titre}>
          {etape === 'montant' ? 'Montant' : 'Détails'}
        </Text>
        {etape === 'details' ? (
          <TouchableOpacity onPress={() => setEtape('montant')}>
            <Text style={styles.retourTexte}>← Retour</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* Indicateur d'étape */}
      <View style={styles.etapesIndicateur}>
        <View style={[styles.etapePoint, etape === 'montant' && styles.etapePointActif]} />
        <View style={[styles.etapeLigne, etape === 'details' && styles.etapeLigneActive]} />
        <View style={[styles.etapePoint, etape === 'details' && styles.etapePointActif]} />
      </View>

      {etape === 'montant' ? (
        /* ─── Étape 1 : Montant ─────────────────────────────────── */
        <View style={styles.etapeMontant}>
          <ScrollView
            contentContainerStyle={styles.etapeMontantScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <AmountInput
              valeur={montant === '0' ? '' : montant}
              onChange={setMontant}
            />

            <View style={styles.categorieSection}>
              <Text style={styles.sectionLabel}>Catégorie</Text>
              <CategoryGrid
                categories={categories}
                selectionne={categorieId}
                onSelect={setCategorieId}
              />
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.continuerBtn, (!montantNum || !categorieId) && styles.continuerBtnDesactive]}
            onPress={passerAuxDetails}
            disabled={!montantNum || !categorieId}
            activeOpacity={0.8}
          >
            <Text style={styles.continuerBtnTexte}>Continuer →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ─── Étape 2 : Détails ─────────────────────────────────── */
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.detailsContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Résumé */}
            <View style={styles.resume}>
              <Text style={styles.resumeMontant}>
                {montantNum.toLocaleString('fr-MA')} DH
              </Text>
              <Text style={styles.resumeCategorie}>
                {categories.find(c => c.id === categorieId)?.nom}
              </Text>
            </View>

            {/* Date */}
            <View style={styles.champGroupe}>
              <Text style={styles.champLabel}>Date</Text>
              <TouchableOpacity style={styles.champValeur} onPress={() => {}}>
                <Ionicons name="calendar-outline" size={18} color={COULEURS.text2} />
                <Text style={styles.champTexte}>{formatDateAffichage(date)}</Text>
                <Text style={styles.champAujourdhui} onPress={() => setDate(dateAujourdHui())}>
                  Aujourd'hui
                </Text>
              </TouchableOpacity>
            </View>

            {/* Compte */}
            <View style={styles.champGroupe}>
              <Text style={styles.champLabel}>Compte</Text>
              <View style={styles.compteRow}>
                {COMPTES_DEFAUT.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.compteOption,
                      compte === c.type && styles.compteOptionActif,
                    ]}
                    onPress={() => setCompte(c.type)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={c.icone as any}
                      size={18}
                      color={compte === c.type ? COULEURS.accent : COULEURS.text2}
                    />
                    <Text style={[styles.compteNom, compte === c.type && styles.compteNomActif]}>
                      {c.nom}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Note */}
            <View style={styles.champGroupe}>
              <Text style={styles.champLabel}>Note (optionnel)</Text>
              <View style={styles.noteContainer}>
                <Ionicons name="chatbubble-outline" size={18} color={COULEURS.text3} />
                <Text
                  style={[styles.noteInput, !note && styles.notePlaceholder]}
                  onPress={() => {
                    Alert.prompt?.(
                      'Note',
                      'Ajouter une note',
                      (t) => setNote(t),
                      'plain-text',
                      note
                    )
                  }}
                >
                  {note || 'Ajouter une note...'}
                </Text>
                {note ? (
                  <TouchableOpacity onPress={() => setNote('')}>
                    <Ionicons name="close-circle" size={18} color={COULEURS.text3} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Bouton enregistrer */}
            <TouchableOpacity
              style={[styles.enregistrerBtn, (!pret || enregistrement) && styles.enregistrerBtnDesactive]}
              onPress={enregistrer}
              disabled={!pret || enregistrement}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.enregistrerBtnTexte}>
                {enregistrement ? 'Enregistrement...' : 'Enregistrer la dépense'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COULEURS.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: ESPACEMENTS.md,
    borderBottomWidth: 1,
    borderBottomColor: COULEURS.border,
  },
  fermerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COULEURS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titre: {
    fontSize: POLICES.taille.lg,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.text,
  },
  retourTexte: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.accent,
    fontWeight: POLICES.poids.medium,
    width: 60,
    textAlign: 'right',
  },

  etapesIndicateur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACEMENTS.sm,
    paddingVertical: ESPACEMENTS.sm,
  },
  etapePoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COULEURS.border,
  },
  etapePointActif: { backgroundColor: COULEURS.accent, transform: [{ scale: 1.3 }] },
  etapeLigne: { width: 40, height: 2, backgroundColor: COULEURS.border },
  etapeLigneActive: { backgroundColor: COULEURS.accent },

  // Étape montant
  etapeMontant: {
    flex: 1,
    paddingHorizontal: ESPACEMENTS.md,
    paddingBottom: ESPACEMENTS.md,
  },
  etapeMontantScroll: {
    gap: ESPACEMENTS.sm,
    paddingBottom: ESPACEMENTS.sm,
  },
  categorieSection: { gap: ESPACEMENTS.xs },
  sectionLabel: {
    fontSize: POLICES.taille.sm,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  continuerBtn: {
    backgroundColor: COULEURS.accent,
    borderRadius: RAYONS.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continuerBtnDesactive: { opacity: 0.4 },
  continuerBtnTexte: {
    fontSize: POLICES.taille.lg,
    fontWeight: POLICES.poids.bold,
    color: '#fff',
  },

  // Étape détails
  detailsContent: {
    padding: ESPACEMENTS.md,
    gap: ESPACEMENTS.md,
    paddingBottom: ESPACEMENTS.xxl,
  },
  resume: {
    alignItems: 'center',
    paddingVertical: ESPACEMENTS.lg,
    gap: ESPACEMENTS.xs,
  },
  resumeMontant: {
    fontSize: 42,
    fontWeight: POLICES.poids.heavy,
    color: COULEURS.text,
    letterSpacing: -1,
  },
  resumeCategorie: {
    fontSize: POLICES.taille.md,
    color: COULEURS.accent,
    fontWeight: POLICES.poids.semibold,
  },

  champGroupe: { gap: ESPACEMENTS.xs },
  champLabel: {
    fontSize: POLICES.taille.sm,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  champValeur: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.sm,
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.md,
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
    padding: ESPACEMENTS.md,
  },
  champTexte: {
    flex: 1,
    fontSize: POLICES.taille.md,
    color: COULEURS.text,
    fontWeight: POLICES.poids.medium,
  },
  champAujourdhui: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.accent,
    fontWeight: POLICES.poids.medium,
  },

  compteRow: { flexDirection: 'row', gap: ESPACEMENTS.sm },
  compteOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACEMENTS.xs,
    paddingVertical: ESPACEMENTS.sm + 2,
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.md,
    borderWidth: 1.5,
    borderColor: COULEURS.cardBorder,
  },
  compteOptionActif: {
    borderColor: COULEURS.accent,
    backgroundColor: COULEURS.accentLight,
  },
  compteNom: {
    fontSize: POLICES.taille.xs,
    fontWeight: POLICES.poids.medium,
    color: COULEURS.text2,
  },
  compteNomActif: { color: COULEURS.accent },

  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.sm,
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.md,
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
    padding: ESPACEMENTS.md,
  },
  noteInput: {
    flex: 1,
    fontSize: POLICES.taille.md,
    color: COULEURS.text,
  },
  notePlaceholder: { color: COULEURS.text3 },

  enregistrerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACEMENTS.sm,
    backgroundColor: COULEURS.accent,
    borderRadius: RAYONS.md,
    paddingVertical: 16,
    marginTop: ESPACEMENTS.sm,
  },
  enregistrerBtnDesactive: { opacity: 0.4 },
  enregistrerBtnTexte: {
    fontSize: POLICES.taille.lg,
    fontWeight: POLICES.poids.bold,
    color: '#fff',
  },
})
