import React, { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useExpensesStore } from '../../src/store/useExpensesStore'
import { ExpenseItem } from '../../src/components/ExpenseItem'
import { CategoryPicker } from '../../src/components/CategoryPicker'
import { formatMAD, formatDateAffichage, moisCourant } from '../../src/utils/formatters'
import { COULEURS, POLICES, ESPACEMENTS, RAYONS } from '../../src/constants/theme'
import type { Depense } from '../../src/types'

export default function DepensesScreen() {
  const router = useRouter()
  const {
    depenses, categories, chargement, chargerDepensesMois,
    supprimerDepense, getCategorieById, totalMois,
  } = useExpensesStore()

  const [recherche, setRecherche] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState<string | null>(null)
  const [afficherRecherche, setAfficherRecherche] = useState(false)
  const [raffraichissement, setRaffraichissement] = useState(false)

  // Filtrer les dépenses
  const depensesFiltrees = useMemo(() => {
    let liste = [...depenses]

    if (filtreCategorie) {
      liste = liste.filter(d => d.categorie_id === filtreCategorie)
    }

    if (recherche.trim()) {
      const q = recherche.toLowerCase().trim()
      liste = liste.filter(d => {
        const cat = getCategorieById(d.categorie_id)
        return (
          cat?.nom.toLowerCase().includes(q) ||
          d.note.toLowerCase().includes(q) ||
          d.montant.toString().includes(q)
        )
      })
    }

    return liste
  }, [depenses, filtreCategorie, recherche])

  const totalFiltre = depensesFiltrees.reduce((s, d) => s + d.montant, 0)

  const onRaffraichir = async () => {
    setRaffraichissement(true)
    await chargerDepensesMois()
    setRaffraichissement(false)
  }

  // Grouper par date
  const groupesParDate = useMemo(() => {
    const map = new Map<string, Depense[]>()
    for (const d of depensesFiltrees) {
      const g = map.get(d.date) ?? []
      g.push(d)
      map.set(d.date, g)
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [depensesFiltrees])

  type Item =
    | { type: 'header'; date: string; sous_total: number }
    | { type: 'depense'; depense: Depense }

  const items: Item[] = groupesParDate.flatMap(([date, deps]) => [
    { type: 'header', date, sous_total: deps.reduce((s, d) => s + d.montant, 0) } as Item,
    ...deps.map(d => ({ type: 'depense', depense: d } as Item)),
  ])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.titre}>Dépenses</Text>
          <Text style={styles.sousTitre}>
            {depensesFiltrees.length} opération{depensesFiltrees.length !== 1 ? 's' : ''} · {formatMAD(totalFiltre)}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setAfficherRecherche(v => !v)}
          >
            <Ionicons
              name={afficherRecherche ? 'close-outline' : 'search-outline'}
              size={22}
              color={COULEURS.text2}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barre de recherche */}
      {afficherRecherche && (
        <View style={styles.rechercheContainer}>
          <Ionicons name="search-outline" size={18} color={COULEURS.text3} />
          <TextInput
            style={styles.rechercheInput}
            placeholder="Chercher une dépense..."
            placeholderTextColor={COULEURS.text3}
            value={recherche}
            onChangeText={setRecherche}
            autoFocus
            clearButtonMode="while-editing"
          />
        </View>
      )}

      {/* Filtre catégories */}
      <View style={styles.filtres}>
        <TouchableOpacity
          style={[styles.filtreAll, !filtreCategorie && styles.filtreAllActif]}
          onPress={() => setFiltreCategorie(null)}
        >
          <Text style={[styles.filtreAllTexte, !filtreCategorie && styles.filtreAllTexteActif]}>
            Tout
          </Text>
        </TouchableOpacity>
        <CategoryPicker
          categories={categories}
          selectionne={filtreCategorie}
          onSelect={(id) => setFiltreCategorie(id === filtreCategorie ? null : id)}
        />
      </View>

      {/* Liste */}
      <FlatList
        data={items}
        keyExtractor={(item, i) =>
          item.type === 'header' ? `h_${item.date}` : `d_${item.depense.id}`
        }
        contentContainerStyle={styles.liste}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={raffraichissement}
            onRefresh={onRaffraichir}
            tintColor={COULEURS.accent}
          />
        }
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.dateHeader}>
                <Text style={styles.dateTexte}>{formatDateAffichage(item.date)}</Text>
                <Text style={styles.dateSousTotal}>{formatMAD(item.sous_total)}</Text>
              </View>
            )
          }
          return (
            <ExpenseItem
              depense={item.depense}
              categorie={getCategorieById(item.depense.categorie_id)}
              onPress={() => router.push({ pathname: '/modal/modifier', params: { id: item.depense.id } } as any)}
              onSupprimer={supprimerDepense}
            />
          )
        }}
        ListEmptyComponent={() => (
          <View style={styles.vide}>
            <Ionicons name="receipt-outline" size={48} color={COULEURS.text3} />
            <Text style={styles.videTexte}>
              {recherche || filtreCategorie
                ? 'Aucune dépense correspondante'
                : 'Aucune dépense ce mois-ci'}
            </Text>
            {!recherche && !filtreCategorie && (
              <TouchableOpacity
                style={styles.ajouterBtn}
                onPress={() => router.push('/modal/ajouter')}
              >
                <Text style={styles.ajouterTexte}>+ Ajouter une dépense</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COULEURS.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: ESPACEMENTS.md,
    paddingBottom: ESPACEMENTS.sm,
  },
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
  },
  headerActions: {
    flexDirection: 'row',
    gap: ESPACEMENTS.sm,
    marginTop: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COULEURS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
  },

  rechercheContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.sm,
    marginHorizontal: ESPACEMENTS.md,
    marginBottom: ESPACEMENTS.sm,
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.md,
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
    paddingHorizontal: ESPACEMENTS.md,
    height: 44,
  },
  rechercheInput: {
    flex: 1,
    color: COULEURS.text,
    fontSize: POLICES.taille.md,
  },

  filtres: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.sm,
    paddingHorizontal: ESPACEMENTS.md,
    marginBottom: ESPACEMENTS.sm,
  },
  filtreAll: {
    paddingHorizontal: ESPACEMENTS.md,
    paddingVertical: 6,
    borderRadius: RAYONS.full,
    borderWidth: 1.5,
    borderColor: COULEURS.cardBorder,
    backgroundColor: COULEURS.card,
  },
  filtreAllActif: {
    backgroundColor: COULEURS.accentLight,
    borderColor: COULEURS.accent,
  },
  filtreAllTexte: {
    fontSize: POLICES.taille.sm,
    fontWeight: POLICES.poids.medium,
    color: COULEURS.text2,
  },
  filtreAllTexteActif: {
    color: COULEURS.accent,
  },

  liste: {
    padding: ESPACEMENTS.md,
    paddingTop: ESPACEMENTS.xs,
    gap: ESPACEMENTS.xs,
  },

  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: ESPACEMENTS.sm,
    paddingHorizontal: 4,
  },
  dateTexte: {
    fontSize: POLICES.taille.sm,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.text2,
    textTransform: 'capitalize',
  },
  dateSousTotal: {
    fontSize: POLICES.taille.sm,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.text3,
  },

  vide: {
    alignItems: 'center',
    paddingTop: 80,
    gap: ESPACEMENTS.md,
  },
  videTexte: {
    fontSize: POLICES.taille.md,
    color: COULEURS.text2,
    textAlign: 'center',
  },
  ajouterBtn: {
    marginTop: ESPACEMENTS.sm,
    backgroundColor: COULEURS.accentLight,
    paddingVertical: ESPACEMENTS.sm,
    paddingHorizontal: ESPACEMENTS.lg,
    borderRadius: RAYONS.full,
    borderWidth: 1,
    borderColor: COULEURS.accent,
  },
  ajouterTexte: {
    color: COULEURS.accent,
    fontWeight: POLICES.poids.semibold,
  },
})
