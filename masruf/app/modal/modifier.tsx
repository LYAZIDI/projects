import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useExpensesStore } from '../../src/store/useExpensesStore'
import { CategoryGrid } from '../../src/components/CategoryPicker'
import { AmountInput } from '../../src/components/ui/AmountInput'
import { formatMAD, formatDateAffichage } from '../../src/utils/formatters'
import { COULEURS, POLICES, ESPACEMENTS, RAYONS } from '../../src/constants/theme'
import { COMPTES_DEFAUT } from '../../src/constants/categories'
import type { Depense, CompteType } from '../../src/types'

export default function ModifierModal() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { depenses, categories, modifierDepense, supprimerDepense } = useExpensesStore()

  const depense = depenses.find(d => d.id === id)

  const [montant, setMontant] = useState(depense?.montant?.toString() ?? '0')
  const [categorieId, setCategorieId] = useState<string | null>(depense?.categorie_id ?? null)
  const [compte, setCompte] = useState<CompteType>(depense?.compte ?? 'cash')
  const [note, setNote] = useState(depense?.note ?? '')
  const [enregistrement, setEnregistrement] = useState(false)

  if (!depense) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.erreur}>
          <Text style={styles.erreurTexte}>Dépense introuvable</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: COULEURS.accent }}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const enregistrer = async () => {
    const montantNum = parseFloat(montant) || 0
    if (montantNum <= 0 || !categorieId) return

    setEnregistrement(true)
    try {
      await modifierDepense({
        ...depense,
        montant: montantNum,
        categorie_id: categorieId,
        compte,
        note,
      })
      router.back()
    } catch (e) {
      Alert.alert('Erreur', String(e))
    } finally {
      setEnregistrement(false)
    }
  }

  const confirmerSuppression = () => {
    Alert.alert('Supprimer', 'Supprimer cette dépense ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await supprimerDepense(depense.id)
          router.back()
        },
      },
    ])
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.fermerBtn}>
          <Ionicons name="close" size={24} color={COULEURS.text2} />
        </TouchableOpacity>
        <Text style={styles.titre}>Modifier</Text>
        <TouchableOpacity onPress={confirmerSuppression}>
          <Ionicons name="trash-outline" size={22} color={COULEURS.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AmountInput valeur={montant === '0' ? '' : montant} onChange={setMontant} />

        <View style={styles.section}>
          <Text style={styles.label}>Catégorie</Text>
          <CategoryGrid
            categories={categories}
            selectionne={categorieId}
            onSelect={setCategorieId}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Compte</Text>
          <View style={styles.compteRow}>
            {COMPTES_DEFAUT.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.compteOption, compte === c.type && styles.compteOptionActif]}
                onPress={() => setCompte(c.type)}
              >
                <Ionicons name={c.icone as any} size={18} color={compte === c.type ? COULEURS.accent : COULEURS.text2} />
                <Text style={[styles.compteNom, compte === c.type && { color: COULEURS.accent }]}>{c.nom}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.enregistrerBtn, enregistrement && { opacity: 0.5 }]}
          onPress={enregistrer}
          disabled={enregistrement}
        >
          <Text style={styles.enregistrerBtnTexte}>
            {enregistrement ? 'Mise à jour...' : 'Mettre à jour'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COULEURS.card,
    alignItems: 'center', justifyContent: 'center',
  },
  titre: { fontSize: POLICES.taille.lg, fontWeight: POLICES.poids.bold, color: COULEURS.text },
  content: { padding: ESPACEMENTS.md, gap: ESPACEMENTS.lg, paddingBottom: ESPACEMENTS.xxl },
  section: { gap: ESPACEMENTS.sm },
  label: {
    fontSize: POLICES.taille.sm, fontWeight: POLICES.poids.semibold,
    color: COULEURS.text2, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  compteRow: { flexDirection: 'row', gap: ESPACEMENTS.sm },
  compteOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: ESPACEMENTS.xs, paddingVertical: ESPACEMENTS.sm + 2,
    backgroundColor: COULEURS.card, borderRadius: RAYONS.md,
    borderWidth: 1.5, borderColor: COULEURS.cardBorder,
  },
  compteOptionActif: { borderColor: COULEURS.accent, backgroundColor: COULEURS.accentLight },
  compteNom: { fontSize: POLICES.taille.xs, fontWeight: POLICES.poids.medium, color: COULEURS.text2 },
  enregistrerBtn: {
    backgroundColor: COULEURS.accent, borderRadius: RAYONS.md,
    paddingVertical: 16, alignItems: 'center', marginTop: ESPACEMENTS.sm,
  },
  enregistrerBtnTexte: { fontSize: POLICES.taille.lg, fontWeight: POLICES.poids.bold, color: '#fff' },
  erreur: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: ESPACEMENTS.md },
  erreurTexte: { fontSize: POLICES.taille.lg, color: COULEURS.text2 },
})
