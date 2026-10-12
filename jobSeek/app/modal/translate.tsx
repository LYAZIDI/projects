import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Share,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCVStore } from '../../src/store/useCVStore'
import { translateCV, fetchProfile } from '../../src/api/cv'
import { Badge } from '../../src/components/ui/Badge'
import { COULEURS, POLICES, ESPACEMENTS, RAYONS } from '../../src/constants/theme'
import type { TranslatedCV } from '../../src/types'

export default function TranslateModal() {
  const router = useRouter()
  const { cv, sauvegarder } = useCVStore()
  const [translating, setTranslating] = useState(false)
  const [translated, setTranslated] = useState<TranslatedCV | null>(null)
  const [error, setError] = useState<string | null>(null)

  const lancer = async () => {
    if (!cv) return
    setTranslating(true)
    setError(null)
    try {
      let cvAvecRawText = cv
      // Si rawText absent, récupérer depuis le backend
      if (!cv.rawText) {
        try {
          const profile = await fetchProfile()
          if (profile?.cv?.rawText) {
            cvAvecRawText = { ...cv, rawText: profile.cv.rawText }
            await sauvegarder(cvAvecRawText)
          }
        } catch {}
      }
      const result = await translateCV(cvAvecRawText)
      setTranslated(result)
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la traduction')
    } finally {
      setTranslating(false)
    }
  }

  const partager = async () => {
    if (!translated) return
    const texte = formatTextePlain(translated)
    try {
      await Share.share({ message: texte, title: `CV EN - ${translated.name}` })
    } catch {}
  }

  const formatTextePlain = (t: TranslatedCV) => {
    let out = `${t.name}\n${t.email}${t.phone ? ' | ' + t.phone : ''}\n\n`
    if (t.summary) out += `SUMMARY\n${t.summary}\n\n`
    out += `SKILLS\n${t.skills.join(', ')}\n\n`
    out += `EXPERIENCE\n`
    t.experience.forEach(e => {
      out += `${e.title} — ${e.company} (${e.period})\n`
      e.bullets.forEach(b => { out += `• ${b}\n` })
      out += '\n'
    })
    out += `EDUCATION\n`
    t.education.forEach(e => { out += `${e.degree} — ${e.school} (${e.year})\n` })
    out += `\nLANGUAGES\n${t.languages.join(', ')}`
    return out
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={COULEURS.text} />
        </TouchableOpacity>
        <Text style={styles.titre}>CV en anglais</Text>
        {translated ? (
          <TouchableOpacity onPress={partager} style={styles.shareBtn}>
            <Ionicons name="share-outline" size={20} color={COULEURS.accent} />
          </TouchableOpacity>
        ) : <View style={{ width: 36 }} />}
      </View>

      {/* État initial - bouton lancer */}
      {!translating && !translated && !error && (
        <View style={styles.centré}>
          <View style={styles.iconContainer}>
            <Ionicons name="language-outline" size={48} color={COULEURS.accent} />
          </View>
          <Text style={styles.accueilTitre}>Traduction IA</Text>
          <Text style={styles.accueilDesc}>
            Claude traduit votre CV en anglais professionnel avec des bullet points percutants pour chaque expérience.
          </Text>
          <TouchableOpacity style={styles.lancerBtn} onPress={lancer} activeOpacity={0.8}>
            <Ionicons name="sparkles-outline" size={20} color="#fff" />
            <Text style={styles.lancerTexte}>Traduire mon CV en anglais</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Chargement */}
      {translating && (
        <View style={styles.centré}>
          <ActivityIndicator size="large" color={COULEURS.accent} />
          <Text style={styles.loadingTitre}>Traduction en cours...</Text>
          <Text style={styles.loadingSub}>Claude analyse et traduit votre CV</Text>
        </View>
      )}

      {/* Erreur */}
      {error && (
        <View style={styles.centré}>
          <Ionicons name="alert-circle-outline" size={48} color={COULEURS.danger} />
          <Text style={styles.erreurTexte}>{error}</Text>
          <TouchableOpacity style={styles.reessayerBtn} onPress={lancer}>
            <Text style={styles.reessayerTexte}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Résultat traduit */}
      {translated && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Badge langue détectée */}
          <View style={styles.langBadge}>
            <Ionicons name="checkmark-circle" size={16} color={COULEURS.success} />
            <Text style={styles.langBadgeTexte}>
              Traduit depuis le {translated.detectedSourceLanguage}
            </Text>
          </View>

          {/* Identité */}
          <View style={styles.card}>
            <Text style={styles.nom}>{translated.name}</Text>
            {translated.email ? <Text style={styles.contact}>{translated.email}</Text> : null}
            {translated.phone ? <Text style={styles.contact}>{translated.phone}</Text> : null}
          </View>

          {/* Summary */}
          {translated.summary ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitre}>Professional Summary</Text>
              <View style={styles.card}>
                <Text style={styles.summaryTexte}>{translated.summary}</Text>
              </View>
            </View>
          ) : null}

          {/* Skills */}
          <View style={styles.section}>
            <Text style={styles.sectionTitre}>Skills</Text>
            <View style={styles.chips}>
              {translated.skills.map((s) => (
                <Badge key={s} label={s} variant="accent" />
              ))}
            </View>
          </View>

          {/* Experience */}
          <View style={styles.section}>
            <Text style={styles.sectionTitre}>Experience</Text>
            {translated.experience.map((exp, i) => (
              <View key={i} style={styles.expCard}>
                <Text style={styles.expTitre}>{exp.title}</Text>
                <Text style={styles.expEntreprise}>{exp.company}</Text>
                <Text style={styles.expPeriode}>{exp.period}</Text>
                {exp.bullets.length > 0 && (
                  <View style={styles.bullets}>
                    {exp.bullets.map((b, j) => (
                      <View key={j} style={styles.bulletRow}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletTexte}>{b}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Education */}
          <View style={styles.section}>
            <Text style={styles.sectionTitre}>Education</Text>
            {translated.education.map((edu, i) => (
              <View key={i} style={styles.eduCard}>
                <View style={styles.eduIcon}>
                  <Ionicons name="school-outline" size={18} color={COULEURS.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eduDiplome}>{edu.degree}</Text>
                  <Text style={styles.eduEcole}>{edu.school} • {edu.year}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Languages */}
          <View style={styles.section}>
            <Text style={styles.sectionTitre}>Languages</Text>
            <View style={styles.chips}>
              {translated.languages.map((l) => (
                <Badge key={l} label={l} variant="default" />
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.shareFullBtn} onPress={partager} activeOpacity={0.8}>
            <Ionicons name="share-outline" size={18} color={COULEURS.accent} />
            <Text style={styles.shareFullTexte}>Partager le CV traduit</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COULEURS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: ESPACEMENTS.md, paddingVertical: ESPACEMENTS.sm,
    borderBottomWidth: 1, borderBottomColor: COULEURS.border,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: RAYONS.full,
    backgroundColor: COULEURS.card, alignItems: 'center', justifyContent: 'center',
  },
  titre: { fontSize: POLICES.taille.lg, fontWeight: POLICES.poids.bold, color: COULEURS.text },
  shareBtn: {
    width: 36, height: 36, borderRadius: RAYONS.full,
    backgroundColor: COULEURS.accentLight, alignItems: 'center', justifyContent: 'center',
  },

  centré: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: ESPACEMENTS.xl, gap: ESPACEMENTS.md,
  },
  iconContainer: {
    width: 88, height: 88, borderRadius: RAYONS.xl,
    backgroundColor: COULEURS.accentLight,
    alignItems: 'center', justifyContent: 'center',
  },
  accueilTitre: {
    fontSize: POLICES.taille.xxl, fontWeight: POLICES.poids.bold,
    color: COULEURS.text, textAlign: 'center',
  },
  accueilDesc: {
    fontSize: POLICES.taille.md, color: COULEURS.text2,
    textAlign: 'center', lineHeight: 22,
  },
  lancerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: ESPACEMENTS.sm,
    backgroundColor: COULEURS.accent, borderRadius: RAYONS.lg,
    paddingVertical: ESPACEMENTS.md, paddingHorizontal: ESPACEMENTS.xl,
    marginTop: ESPACEMENTS.sm,
  },
  lancerTexte: { fontSize: POLICES.taille.md, fontWeight: POLICES.poids.bold, color: '#fff' },

  loadingTitre: {
    fontSize: POLICES.taille.xl, fontWeight: POLICES.poids.bold,
    color: COULEURS.text, textAlign: 'center',
  },
  loadingSub: { fontSize: POLICES.taille.sm, color: COULEURS.text2, textAlign: 'center' },

  erreurTexte: {
    fontSize: POLICES.taille.md, color: COULEURS.danger,
    textAlign: 'center', lineHeight: 22,
  },
  reessayerBtn: {
    backgroundColor: COULEURS.dangerLight, borderRadius: RAYONS.lg,
    paddingVertical: ESPACEMENTS.sm, paddingHorizontal: ESPACEMENTS.lg,
  },
  reessayerTexte: { fontSize: POLICES.taille.sm, color: COULEURS.danger, fontWeight: POLICES.poids.semibold },

  content: { padding: ESPACEMENTS.md, gap: ESPACEMENTS.lg, paddingBottom: ESPACEMENTS.xxl },

  langBadge: {
    flexDirection: 'row', alignItems: 'center', gap: ESPACEMENTS.xs,
    backgroundColor: COULEURS.successLight, borderRadius: RAYONS.full,
    paddingHorizontal: ESPACEMENTS.md, paddingVertical: ESPACEMENTS.xs,
    alignSelf: 'flex-start',
  },
  langBadgeTexte: { fontSize: POLICES.taille.sm, color: COULEURS.success, fontWeight: POLICES.poids.medium },

  card: {
    backgroundColor: COULEURS.card, borderRadius: RAYONS.lg,
    borderWidth: 1, borderColor: COULEURS.cardBorder,
    padding: ESPACEMENTS.md, gap: 4,
  },
  nom: { fontSize: POLICES.taille.xl, fontWeight: POLICES.poids.bold, color: COULEURS.text },
  contact: { fontSize: POLICES.taille.sm, color: COULEURS.text2 },

  section: { gap: ESPACEMENTS.sm },
  sectionTitre: { fontSize: POLICES.taille.lg, fontWeight: POLICES.poids.bold, color: COULEURS.text },

  summaryTexte: { fontSize: POLICES.taille.sm, color: COULEURS.text2, lineHeight: 20 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACEMENTS.xs },

  expCard: {
    backgroundColor: COULEURS.card, borderRadius: RAYONS.lg,
    borderWidth: 1, borderColor: COULEURS.cardBorder,
    padding: ESPACEMENTS.md, gap: 4,
  },
  expTitre: { fontSize: POLICES.taille.md, fontWeight: POLICES.poids.semibold, color: COULEURS.text },
  expEntreprise: { fontSize: POLICES.taille.sm, color: COULEURS.accent },
  expPeriode: { fontSize: POLICES.taille.xs, color: COULEURS.text3 },
  bullets: { marginTop: ESPACEMENTS.sm, gap: 6 },
  bulletRow: { flexDirection: 'row', gap: ESPACEMENTS.xs, alignItems: 'flex-start' },
  bulletDot: { color: COULEURS.accent, fontSize: POLICES.taille.md, lineHeight: 20 },
  bulletTexte: { flex: 1, fontSize: POLICES.taille.sm, color: COULEURS.text2, lineHeight: 20 },

  eduCard: {
    flexDirection: 'row', alignItems: 'center', gap: ESPACEMENTS.sm,
    backgroundColor: COULEURS.card, borderRadius: RAYONS.md,
    borderWidth: 1, borderColor: COULEURS.cardBorder, padding: ESPACEMENTS.md,
  },
  eduIcon: {
    width: 36, height: 36, borderRadius: RAYONS.sm,
    backgroundColor: COULEURS.accentLight, alignItems: 'center', justifyContent: 'center',
  },
  eduDiplome: { fontSize: POLICES.taille.sm, fontWeight: POLICES.poids.semibold, color: COULEURS.text },
  eduEcole: { fontSize: POLICES.taille.xs, color: COULEURS.text2, marginTop: 2 },

  shareFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: ESPACEMENTS.sm, backgroundColor: COULEURS.accentLight,
    borderRadius: RAYONS.lg, borderWidth: 1, borderColor: COULEURS.accent,
    padding: ESPACEMENTS.md,
  },
  shareFullTexte: { fontSize: POLICES.taille.md, fontWeight: POLICES.poids.semibold, color: COULEURS.accent },
})
