import React, { useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useJobsStore } from '../../src/store/useJobsStore'
import { JobCard } from '../../src/components/JobCard'
import { COULEURS, POLICES, ESPACEMENTS, RAYONS } from '../../src/constants/theme'
import type { Job } from '../../src/types'

type Filter = 'all' | 'excellent' | 'bon' | 'remote' | 'cdi'

const FILTRES: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'excellent', label: '🔥 Excellent' },
  { key: 'bon', label: '✓ Bon match' },
  { key: 'remote', label: '🏠 Remote' },
  { key: 'cdi', label: 'CDI' },
]

export default function Jobs() {
  const router = useRouter()
  const { setFiltre, setRecherche, filtre, recherche, jobsFiltres, toggleFavori, favoris, chargement, rafraichir } = useJobsStore()
  const jobs = jobsFiltres()

  const renderJob = ({ item }: { item: Job }) => (
    <JobCard
      job={item}
      favori={favoris.includes(item.id)}
      onPress={() => router.push(`/modal/job-detail?id=${item.id}`)}
      onFavori={() => toggleFavori(item.id)}
    />
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.titre}>Offres d'emploi</Text>
        <Text style={styles.count}>{jobs.length} résultats</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COULEURS.text3} />
          <TextInput
            style={styles.searchInput}
            placeholder="Poste, entreprise, compétence..."
            placeholderTextColor={COULEURS.text3}
            value={recherche}
            onChangeText={setRecherche}
          />
          {recherche.length > 0 && (
            <TouchableOpacity onPress={() => setRecherche('')}>
              <Ionicons name="close-circle" size={18} color={COULEURS.text3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filtres */}
      <View style={styles.filtresRow}>
        {FILTRES.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filtrePill, filtre === f.key && styles.filtrePillActif]}
            onPress={() => setFiltre(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filtreTexte, filtre === f.key && styles.filtreTexteActif]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Liste */}
      {chargement ? (
        <View style={styles.loading}>
          <ActivityIndicator color={COULEURS.accent} size="large" />
          <Text style={styles.loadingTexte}>Recherche en cours...</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          contentContainerStyle={styles.liste}
          ItemSeparatorComponent={() => <View style={{ height: ESPACEMENTS.sm }} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={chargement}
              onRefresh={rafraichir}
              tintColor={COULEURS.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.vide}>
              <Ionicons name="search-outline" size={48} color={COULEURS.text3} />
              <Text style={styles.videTexte}>Aucune offre trouvée</Text>
              <Text style={styles.videsSub}>Essayez d'autres mots-clés ou filtres</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COULEURS.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: ESPACEMENTS.md,
    paddingTop: ESPACEMENTS.md,
    paddingBottom: ESPACEMENTS.sm,
  },
  titre: {
    fontSize: POLICES.taille.xxl,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.text,
  },
  count: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text3,
  },

  searchContainer: {
    paddingHorizontal: ESPACEMENTS.md,
    paddingBottom: ESPACEMENTS.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.sm,
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.lg,
    borderWidth: 1,
    borderColor: COULEURS.border,
    paddingHorizontal: ESPACEMENTS.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: POLICES.taille.md,
    color: COULEURS.text,
  },

  filtresRow: {
    flexDirection: 'row',
    paddingHorizontal: ESPACEMENTS.md,
    paddingBottom: ESPACEMENTS.sm,
    gap: ESPACEMENTS.xs,
  },
  filtrePill: {
    paddingHorizontal: ESPACEMENTS.sm + 2,
    paddingVertical: 6,
    borderRadius: RAYONS.full,
    backgroundColor: COULEURS.card,
    borderWidth: 1,
    borderColor: COULEURS.border,
  },
  filtrePillActif: {
    backgroundColor: COULEURS.accentLight,
    borderColor: COULEURS.accent,
  },
  filtreTexte: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text2,
    fontWeight: POLICES.poids.medium,
  },
  filtreTexteActif: {
    color: COULEURS.accent,
    fontWeight: POLICES.poids.semibold,
  },

  liste: {
    paddingHorizontal: ESPACEMENTS.md,
    paddingBottom: ESPACEMENTS.xxl,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACEMENTS.md,
  },
  loadingTexte: {
    color: COULEURS.text2,
    fontSize: POLICES.taille.sm,
  },

  vide: {
    paddingTop: ESPACEMENTS.xxl,
    alignItems: 'center',
    gap: ESPACEMENTS.sm,
  },
  videTexte: {
    fontSize: POLICES.taille.lg,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.text2,
  },
  videsSub: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text3,
  },
})
