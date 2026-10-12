import React from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useJobsStore } from '../../src/store/useJobsStore'
import { useApplicationsStore } from '../../src/store/useApplicationsStore'
import { Badge } from '../../src/components/ui/Badge'
import { ATSScore } from '../../src/components/ATSScore'
import { COULEURS, POLICES, ESPACEMENTS, RAYONS } from '../../src/constants/theme'
import { formatDate, scoreLabel } from '../../src/utils/formatters'

export default function JobDetail() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { jobs, toggleFavori, favoris } = useJobsStore()
  const { ajouter, applications } = useApplicationsStore()

  const job = jobs.find((j) => j.id === id)
  if (!job) return null

  const isFavori = favoris.includes(job.id)
  const candidature = applications.find((a) => a.job.id === job.id)
  const score = job.matchScore ?? 0
  const niveau = scoreLabel(score)

  const ajouterCandidature = async () => {
    await ajouter(job)
    router.back()
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBt} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={COULEURS.text2} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => toggleFavori(job.id)}>
          <Ionicons
            name={isFavori ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={isFavori ? COULEURS.accent : COULEURS.text2}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Titre + entreprise */}
        <View style={styles.jobHeader}>
          <View style={styles.logoGrand}>
            <Text style={styles.logoLettreGrande}>{job.company[0]?.toUpperCase()}</Text>
          </View>
          <Text style={styles.jobTitre}>{job.title}</Text>
          <Text style={styles.jobEntreprise}>{job.company}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={COULEURS.text3} />
            <Text style={styles.meta}>{job.location}</Text>
            {job.remote && <Text style={[styles.meta, { color: COULEURS.success }]}>• Remote</Text>}
            <Text style={styles.meta}>• {job.type}</Text>
          </View>
          {job.salary && (
            <View style={styles.salaire}>
              <Ionicons name="cash-outline" size={16} color={COULEURS.success} />
              <Text style={styles.salaireTexte}>{job.salary}</Text>
            </View>
          )}
        </View>

        {/* Score match */}
        <View style={styles.scoreCard}>
          <ATSScore score={score} />
          <Badge
            label={niveau === 'excellent' ? 'Excellent match' : niveau === 'bon' ? 'Bon match' : 'Match faible'}
            variant={niveau}
          />
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitre}>Compétences requises</Text>
          <View style={styles.tags}>
            {job.tags.map((tag) => (
              <Badge key={tag} label={tag} variant="accent" />
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitre}>Description du poste</Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>

        {/* Questions */}
        {job.questions && job.questions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitre}>Questions fréquentes</Text>
            {job.questions.map((q, i) => (
              <View key={i} style={styles.questionItem}>
                <Text style={styles.questionNum}>{i + 1}</Text>
                <Text style={styles.questionTexte}>{q}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Infos */}
        <View style={styles.infosRow}>
          <View style={styles.infoItem}>
            <Ionicons name="business-outline" size={16} color={COULEURS.text3} />
            <Text style={styles.infoTexte}>{job.source}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={16} color={COULEURS.text3} />
            <Text style={styles.infoTexte}>Publié le {formatDate(job.postedAt)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Actions bas */}
      <View style={styles.actions}>
        {candidature ? (
          <View style={styles.dejaPostule}>
            <Ionicons name="checkmark-circle" size={20} color={COULEURS.success} />
            <Text style={styles.dejaPostuleTexte}>Déjà dans vos candidatures</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.ajouterBtn} onPress={ajouterCandidature} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.ajouterTexte}>Ajouter aux candidatures</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.iaBtn}
          onPress={() => router.push(`/modal/apply?id=${job.id}`)}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles-outline" size={20} color={COULEURS.accent} />
          <Text style={styles.iaBtnTexte}>Préparer ma candidature (IA)</Text>
        </TouchableOpacity>
      </View>
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
  closeBt: {
    width: 36,
    height: 36,
    borderRadius: RAYONS.full,
    backgroundColor: COULEURS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: { padding: ESPACEMENTS.md, gap: ESPACEMENTS.lg, paddingBottom: ESPACEMENTS.md },

  jobHeader: { alignItems: 'center', gap: ESPACEMENTS.sm },
  logoGrand: {
    width: 72,
    height: 72,
    borderRadius: RAYONS.lg,
    backgroundColor: COULEURS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COULEURS.accent,
  },
  logoLettreGrande: {
    fontSize: POLICES.taille.xxl,
    fontWeight: POLICES.poids.heavy,
    color: COULEURS.accent,
  },
  jobTitre: {
    fontSize: POLICES.taille.xl,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.text,
    textAlign: 'center',
  },
  jobEntreprise: {
    fontSize: POLICES.taille.md,
    color: COULEURS.text2,
    fontWeight: POLICES.poids.medium,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  meta: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text3,
  },
  salaire: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.xs,
    backgroundColor: COULEURS.successLight,
    paddingHorizontal: ESPACEMENTS.sm,
    paddingVertical: 4,
    borderRadius: RAYONS.full,
  },
  salaireTexte: {
    fontSize: POLICES.taille.sm,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.success,
  },

  scoreCard: {
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.lg,
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
    padding: ESPACEMENTS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  section: { gap: ESPACEMENTS.sm },
  sectionTitre: {
    fontSize: POLICES.taille.lg,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.text,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ESPACEMENTS.xs,
  },
  description: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text2,
    lineHeight: 22,
  },

  questionItem: {
    flexDirection: 'row',
    gap: ESPACEMENTS.sm,
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.md,
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
    padding: ESPACEMENTS.sm,
  },
  questionNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COULEURS.accentLight,
    color: COULEURS.accent,
    fontSize: POLICES.taille.xs,
    fontWeight: POLICES.poids.bold,
    textAlign: 'center',
    lineHeight: 20,
    flexShrink: 0,
  },
  questionTexte: {
    flex: 1,
    fontSize: POLICES.taille.sm,
    color: COULEURS.text2,
    lineHeight: 18,
  },

  infosRow: {
    flexDirection: 'row',
    gap: ESPACEMENTS.lg,
    flexWrap: 'wrap',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoTexte: {
    fontSize: POLICES.taille.xs,
    color: COULEURS.text3,
  },

  actions: {
    padding: ESPACEMENTS.md,
    gap: ESPACEMENTS.sm,
    borderTopWidth: 1,
    borderTopColor: COULEURS.border,
  },
  ajouterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACEMENTS.sm,
    backgroundColor: COULEURS.accent,
    borderRadius: RAYONS.lg,
    paddingVertical: ESPACEMENTS.md,
  },
  ajouterTexte: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.bold,
    color: '#fff',
  },
  iaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACEMENTS.sm,
    borderWidth: 1.5,
    borderColor: COULEURS.accent,
    borderRadius: RAYONS.lg,
    paddingVertical: ESPACEMENTS.md,
  },
  iaBtnTexte: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.accent,
  },
  dejaPostule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACEMENTS.sm,
    backgroundColor: COULEURS.successLight,
    borderRadius: RAYONS.lg,
    paddingVertical: ESPACEMENTS.md,
  },
  dejaPostuleTexte: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.success,
  },
})
