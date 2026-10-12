import React from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCVStore } from '../../src/store/useCVStore'
import { ATSScore } from '../../src/components/ATSScore'
import { Badge } from '../../src/components/ui/Badge'
import { COULEURS, POLICES, ESPACEMENTS, RAYONS } from '../../src/constants/theme'
import { initiales } from '../../src/utils/formatters'

export default function Profile() {
  const router = useRouter()
  const { cv, reinitialiser, synced } = useCVStore()

  const onReinitialiser = () => {
    Alert.alert(
      'Réinitialiser',
      'Supprimer votre CV et recommencer l\'onboarding ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            await reinitialiser()
            router.replace('/onboarding')
          },
        },
      ]
    )
  }

  if (!cv) return null

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.titre}>Mon profil</Text>
            {synced && (
              <Text style={styles.syncedLabel}>Synchronisé avec le backend</Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: ESPACEMENTS.sm }}>
            <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/modal/settings')}>
              <Ionicons name="settings-outline" size={18} color={COULEURS.text2} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.editBtn} onPress={onReinitialiser}>
              <Ionicons name="refresh-outline" size={18} color={COULEURS.text2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Avatar + infos */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTexte}>{initiales(cv.name)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.nom}>{cv.name}</Text>
            <Text style={styles.email}>{cv.email}</Text>
            {cv.phone && (
              <Text style={styles.email}>{cv.phone}</Text>
            )}
          </View>
        </View>

        {/* ATS Score */}
        <View style={styles.section}>
          <Text style={styles.sectionTitre}>Score ATS</Text>
          <View style={styles.atsCard}>
            <ATSScore score={cv.atsScore} large />
            <View style={styles.atsDetails}>
              <View style={styles.atsRow}>
                <Ionicons name="checkmark-circle" size={16} color={COULEURS.success} />
                <Text style={styles.atsLabel}>{cv.atsKeywordsFound.length} mots-clés trouvés</Text>
              </View>
              <View style={styles.atsRow}>
                <Ionicons name="close-circle" size={16} color={COULEURS.danger} />
                <Text style={styles.atsLabel}>{cv.atsMissing.length} mots-clés manquants</Text>
              </View>
              <View style={styles.atsRow}>
                <Ionicons name="time-outline" size={16} color={COULEURS.warning} />
                <Text style={styles.atsLabel}>{cv.yearsExperience} ans d'expérience</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Mots-clés manquants */}
        {cv.atsMissing.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitre}>Compétences à ajouter</Text>
            <View style={styles.chips}>
              {cv.atsMissing.map((m) => (
                <View key={m} style={styles.missingChip}>
                  <Ionicons name="add-outline" size={12} color={COULEURS.danger} />
                  <Text style={styles.missingChipTexte}>{m}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Compétences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitre}>Compétences ({cv.skills.length})</Text>
          <View style={styles.chips}>
            {cv.skills.map((skill) => (
              <Badge key={skill} label={skill} variant="accent" />
            ))}
          </View>
        </View>

        {/* Expérience */}
        <View style={styles.section}>
          <Text style={styles.sectionTitre}>Expérience</Text>
          <View style={styles.timeline}>
            {cv.experience.map((exp, i) => (
              <View key={i} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                {i < cv.experience.length - 1 && <View style={styles.timelineLine} />}
                <View style={styles.timelineContent}>
                  <Text style={styles.expTitre}>{exp.title}</Text>
                  <Text style={styles.expEntreprise}>{exp.company}</Text>
                  <Text style={styles.expPeriode}>{exp.period}</Text>
                  {exp.description && (
                    <Text style={styles.expDesc} numberOfLines={2}>{exp.description}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Formation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitre}>Formation</Text>
          {cv.education.map((edu, i) => (
            <View key={i} style={styles.eduCard}>
              <View style={styles.eduIcon}>
                <Ionicons name="school-outline" size={18} color={COULEURS.accent} />
              </View>
              <View style={styles.eduInfo}>
                <Text style={styles.eduDiplome}>{edu.degree}</Text>
                <Text style={styles.eduEcole}>{edu.school} • {edu.year}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Langues */}
        <View style={styles.section}>
          <Text style={styles.sectionTitre}>Langues</Text>
          <View style={styles.chips}>
            {cv.languages.map((lang) => (
              <Badge key={lang} label={lang} variant="default" />
            ))}
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.translateBtn} onPress={() => router.push('/modal/translate')}>
          <Ionicons name="language-outline" size={20} color="#fff" />
          <Text style={styles.translateTexte}>Traduire mon CV en anglais</Text>
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.atsOptiBtn} onPress={() => router.push('/modal/ats')}>
          <Ionicons name="sparkles-outline" size={20} color={COULEURS.accent} />
          <Text style={styles.atsOptiBtnTexte}>Optimiser mon CV avec l'IA</Text>
          <Ionicons name="chevron-forward" size={16} color={COULEURS.accent} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.reinitBtn} onPress={onReinitialiser}>
          <Ionicons name="refresh-outline" size={18} color={COULEURS.danger} />
          <Text style={styles.reinitTexte}>Changer de CV</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titre: {
    fontSize: POLICES.taille.xxl,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.text,
  },
  syncedLabel: {
    fontSize: POLICES.taille.xs,
    color: COULEURS.success,
    marginTop: 2,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: RAYONS.full,
    backgroundColor: COULEURS.card,
    borderWidth: 1,
    borderColor: COULEURS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.md,
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.xl,
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
    padding: ESPACEMENTS.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COULEURS.accentLight,
    borderWidth: 2,
    borderColor: COULEURS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexte: {
    fontSize: POLICES.taille.xl,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.accent,
  },
  profileInfo: { gap: 2 },
  nom: {
    fontSize: POLICES.taille.lg,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.text,
  },
  email: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text2,
  },

  section: { gap: ESPACEMENTS.sm },
  sectionTitre: {
    fontSize: POLICES.taille.lg,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.text,
  },

  atsCard: {
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.lg,
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
    padding: ESPACEMENTS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.lg,
  },
  atsDetails: { flex: 1, gap: ESPACEMENTS.sm },
  atsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.xs,
  },
  atsLabel: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text2,
  },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ESPACEMENTS.xs,
  },
  missingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COULEURS.dangerLight,
    paddingHorizontal: ESPACEMENTS.sm,
    paddingVertical: 3,
    borderRadius: RAYONS.full,
  },
  missingChipTexte: {
    fontSize: POLICES.taille.xs,
    color: COULEURS.danger,
    fontWeight: POLICES.poids.medium,
  },

  timeline: { gap: 0 },
  timelineItem: {
    flexDirection: 'row',
    gap: ESPACEMENTS.sm,
    minHeight: 64,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COULEURS.accent,
    marginTop: 5,
    flexShrink: 0,
  },
  timelineLine: {
    position: 'absolute',
    left: 4,
    top: 15,
    width: 2,
    bottom: 0,
    backgroundColor: COULEURS.border,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: ESPACEMENTS.md,
    gap: 2,
  },
  expTitre: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.text,
  },
  expEntreprise: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.accent,
  },
  expPeriode: {
    fontSize: POLICES.taille.xs,
    color: COULEURS.text3,
  },
  expDesc: {
    fontSize: POLICES.taille.xs,
    color: COULEURS.text2,
    lineHeight: 16,
    marginTop: 2,
  },

  eduCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.sm,
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.md,
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
    padding: ESPACEMENTS.md,
  },
  eduIcon: {
    width: 36,
    height: 36,
    borderRadius: RAYONS.sm,
    backgroundColor: COULEURS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eduInfo: { flex: 1 },
  eduDiplome: {
    fontSize: POLICES.taille.sm,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.text,
  },
  eduEcole: {
    fontSize: POLICES.taille.xs,
    color: COULEURS.text2,
    marginTop: 2,
  },

  translateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.sm,
    backgroundColor: COULEURS.accent,
    borderRadius: RAYONS.lg,
    padding: ESPACEMENTS.md,
  },
  translateTexte: {
    flex: 1,
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.semibold,
    color: '#fff',
  },

  atsOptiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.sm,
    backgroundColor: COULEURS.accentLight,
    borderRadius: RAYONS.lg,
    borderWidth: 1,
    borderColor: COULEURS.accent,
    padding: ESPACEMENTS.md,
  },
  atsOptiBtnTexte: {
    flex: 1,
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.accent,
  },

  reinitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACEMENTS.sm,
    padding: ESPACEMENTS.md,
  },
  reinitTexte: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.danger,
  },
})
