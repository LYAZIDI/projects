import React from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCVStore } from '../../src/store/useCVStore'
import { useJobsStore } from '../../src/store/useJobsStore'
import { useApplicationsStore } from '../../src/store/useApplicationsStore'
import { JobCard } from '../../src/components/JobCard'
import { ATSScore } from '../../src/components/ATSScore'
import { COULEURS, POLICES, ESPACEMENTS, RAYONS } from '../../src/constants/theme'
import { prenomDe, statusLabel, statusColor } from '../../src/utils/formatters'

export default function Dashboard() {
  const router = useRouter()
  const { cv } = useCVStore()
  const { jobs, toggleFavori, favoris, rafraichir, chargement, backendActif } = useJobsStore()
  const { stats, applications } = useApplicationsStore()

  const topJobs = jobs
    .filter((j) => (j.matchScore ?? 0) >= 80)
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
    .slice(0, 3)

  const s = stats()
  const recent = applications.slice(0, 3)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.bonjour}>Bonjour, {prenomDe(cv?.name ?? 'vous')} 👋</Text>
            <Text style={styles.sousTitre}>
              {backendActif ? 'Backend connecté ✓' : 'Mode hors ligne'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: ESPACEMENTS.sm }}>
            <TouchableOpacity style={styles.clocheBouton} onPress={rafraichir} disabled={chargement}>
              <Ionicons name={chargement ? 'hourglass-outline' : 'refresh-outline'} size={20} color={COULEURS.text2} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.clocheBouton} onPress={() => router.push('/modal/settings')}>
              <Ionicons name="settings-outline" size={20} color={COULEURS.text2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ATS Card */}
        <View style={styles.atsCard}>
          <View style={styles.atsLeft}>
            <Text style={styles.atsLabel}>Votre score CV</Text>
            <Text style={styles.atsSub}>
              {(cv?.atsKeywordsFound.length ?? 0)} mots-clés détectés
            </Text>
            <TouchableOpacity
              style={styles.optimiserBtn}
              onPress={() => router.push('/modal/ats')}
            >
              <Ionicons name="sparkles-outline" size={14} color={COULEURS.accent} />
              <Text style={styles.optimiserTexte}>Optimiser</Text>
            </TouchableOpacity>
          </View>
          <ATSScore score={cv?.atsScore ?? 0} large />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Candidatures', value: s.total, icon: 'document-text-outline' },
            { label: 'Entretiens', value: s.entretiens, icon: 'mic-outline' },
            { label: 'Taux réponse', value: `${s.taux}%`, icon: 'trending-up-outline' },
          ].map((item) => (
            <View key={item.label} style={styles.statCard}>
              <Ionicons name={item.icon as any} size={20} color={COULEURS.accent} />
              <Text style={styles.statValeur}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Top Matches */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitre}>Meilleures opportunités</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')}>
              <Text style={styles.voirTout}>Voir tout →</Text>
            </TouchableOpacity>
          </View>
          {topJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              favori={favoris.includes(job.id)}
              onPress={() => router.push(`/modal/job-detail?id=${job.id}`)}
              onFavori={() => toggleFavori(job.id)}
              compact
            />
          ))}
          {topJobs.length === 0 && (
            <View style={styles.vide}>
              <Text style={styles.videTexte}>Aucune offre avec un score ≥ 80%</Text>
            </View>
          )}
        </View>

        {/* Candidatures récentes */}
        {recent.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitre}>Candidatures récentes</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/applications')}>
                <Text style={styles.voirTout}>Voir tout →</Text>
              </TouchableOpacity>
            </View>
            {recent.map((app) => (
              <TouchableOpacity
                key={app.id}
                style={styles.appCard}
                onPress={() => router.push('/(tabs)/applications')}
                activeOpacity={0.75}
              >
                <View style={[styles.statusDot, { backgroundColor: statusColor(app.status) }]} />
                <View style={styles.appInfo}>
                  <Text style={styles.appTitre} numberOfLines={1}>{app.job.title}</Text>
                  <Text style={styles.appEntreprise}>{app.job.company}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: `${statusColor(app.status)}22` }]}>
                  <Text style={[styles.statusTexte, { color: statusColor(app.status) }]}>
                    {statusLabel(app.status)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Action rapide */}
        <TouchableOpacity
          style={styles.atsBtn}
          onPress={() => router.push('/modal/ats')}
          activeOpacity={0.8}
        >
          <Ionicons name="analytics-outline" size={22} color="#fff" />
          <View>
            <Text style={styles.atsBtnTitre}>Optimiseur ATS</Text>
            <Text style={styles.atsBtnSub}>Analysez votre CV contre une offre</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COULEURS.bg },
  content: { padding: ESPACEMENTS.md, gap: ESPACEMENTS.lg, paddingBottom: ESPACEMENTS.xxl },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  bonjour: {
    fontSize: POLICES.taille.xxl,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.text,
  },
  sousTitre: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text2,
    marginTop: 2,
  },
  clocheBouton: {
    width: 40,
    height: 40,
    borderRadius: RAYONS.full,
    backgroundColor: COULEURS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COULEURS.border,
  },

  atsCard: {
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.xl,
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
    padding: ESPACEMENTS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  atsLeft: { gap: ESPACEMENTS.xs },
  atsLabel: {
    fontSize: POLICES.taille.lg,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.text,
  },
  atsSub: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text2,
  },
  optimiserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.xs,
    backgroundColor: COULEURS.accentLight,
    paddingHorizontal: ESPACEMENTS.sm,
    paddingVertical: 5,
    borderRadius: RAYONS.full,
    alignSelf: 'flex-start',
    marginTop: ESPACEMENTS.xs,
  },
  optimiserTexte: {
    fontSize: POLICES.taille.xs,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.accent,
  },

  statsRow: {
    flexDirection: 'row',
    gap: ESPACEMENTS.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.lg,
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
    padding: ESPACEMENTS.md,
    alignItems: 'center',
    gap: ESPACEMENTS.xs,
  },
  statValeur: {
    fontSize: POLICES.taille.xl,
    fontWeight: POLICES.poids.heavy,
    color: COULEURS.text,
  },
  statLabel: {
    fontSize: 10,
    color: COULEURS.text3,
    textAlign: 'center',
  },

  section: { gap: ESPACEMENTS.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitre: {
    fontSize: POLICES.taille.lg,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.text,
  },
  voirTout: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.accent,
    fontWeight: POLICES.poids.medium,
  },

  appCard: {
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.md,
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
    padding: ESPACEMENTS.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  appInfo: { flex: 1, gap: 2 },
  appTitre: {
    fontSize: POLICES.taille.sm,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.text,
  },
  appEntreprise: {
    fontSize: POLICES.taille.xs,
    color: COULEURS.text2,
  },
  statusPill: {
    paddingHorizontal: ESPACEMENTS.sm,
    paddingVertical: 3,
    borderRadius: RAYONS.full,
  },
  statusTexte: {
    fontSize: 10,
    fontWeight: POLICES.poids.semibold,
  },

  vide: {
    padding: ESPACEMENTS.lg,
    alignItems: 'center',
  },
  videTexte: {
    color: COULEURS.text3,
    fontSize: POLICES.taille.sm,
  },

  atsBtn: {
    backgroundColor: COULEURS.accent,
    borderRadius: RAYONS.lg,
    padding: ESPACEMENTS.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.md,
  },
  atsBtnTitre: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.bold,
    color: '#fff',
  },
  atsBtnSub: {
    fontSize: POLICES.taille.xs,
    color: 'rgba(255,255,255,0.7)',
  },
})
