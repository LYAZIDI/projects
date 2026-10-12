import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCVStore } from '../../src/store/useCVStore'
import { ATSScore } from '../../src/components/ATSScore'
import { Badge } from '../../src/components/ui/Badge'
import { COULEURS, POLICES, ESPACEMENTS, RAYONS } from '../../src/constants/theme'
import { analyzeATS } from '../../src/api/ats'
import { checkConnexion } from '../../src/api/client'
import type { ATSAnalysis } from '../../src/types'

function analyserLocal(description: string, skills: string[]): ATSAnalysis {
  const desc = description.toLowerCase()
  const found = skills.filter((s) => desc.includes(s.toLowerCase()))
  const missing = skills.filter((s) => !desc.includes(s.toLowerCase()))
  const extra = ['docker', 'kubernetes', 'aws', 'ci/cd', 'graphql', 'redis', 'agile', 'scrum']
    .filter((k) => desc.includes(k) && !missing.map((m) => m.toLowerCase()).includes(k))
  const score = Math.min(100, Math.round((found.length / Math.max(found.length + missing.slice(0, 5).length, 1)) * 100))
  return {
    jobTitle: description.split('\n')[0]?.slice(0, 60) ?? 'Analyse',
    score,
    keywordsFound: found,
    keywordsMissing: [...missing.slice(0, 5), ...extra.slice(0, 3)],
    suggestions: [
      {
        type: 'skill',
        priority: 'high',
        message: `Ajoutez les compétences manquantes : ${missing.slice(0, 3).join(', ')}`,
        example: `"Maîtrise de ${missing[0] ?? 'Docker'} avec 2 ans d'expérience en production"`,
      },
      {
        type: 'format',
        priority: 'medium',
        message: 'Utilisez des verbes d\'action forts et des chiffres concrets',
        example: '"Réduit le temps de chargement de 40% en optimisant les requêtes SQL"',
      },
    ],
    rewrittenSummary: `Développeur Full Stack avec ${found.length}+ compétences clés détectées pour ce poste. Expérience en ${found.slice(0, 3).join(', ')}.`,
  }
}

export default function ATSOptimizer() {
  const router = useRouter()
  const { cv } = useCVStore()
  const [offre, setOffre] = useState('')
  const [titre, setTitre] = useState('')
  const [analyse, setAnalyse] = useState<ATSAnalysis | null>(null)
  const [chargement, setChargement] = useState(false)
  const [source, setSource] = useState<'api' | 'local'>('api')

  const lancer = async () => {
    if (!cv || offre.trim().length < 30) return
    setChargement(true)
    setAnalyse(null)
    try {
      const connected = await checkConnexion()
      if (connected) {
        const result = await analyzeATS(cv, titre || (offre.split('\n')[0] ?? 'Poste'), offre)
        setAnalyse(result)
        setSource('api')
      } else {
        await new Promise((r) => setTimeout(r, 1000))
        setAnalyse(analyserLocal(offre, cv.skills))
        setSource('local')
      }
    } catch {
      setAnalyse(analyserLocal(offre, cv?.skills ?? []))
      setSource('local')
    } finally {
      setChargement(false)
    }
  }

  const priorityColor = (p: string) =>
    p === 'high' ? COULEURS.danger : p === 'medium' ? COULEURS.warning : COULEURS.success

  const priorityBg = (p: string) =>
    p === 'high' ? COULEURS.dangerLight : p === 'medium' ? COULEURS.warningLight : COULEURS.successLight

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={COULEURS.text2} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitre}>Optimiseur ATS</Text>
            <Text style={styles.headerSub}>Analysez votre CV contre une offre</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!analyse ? (
            <View style={styles.inputSection}>
              <TextInput
                style={styles.titrInput}
                placeholder="Titre du poste (optionnel)"
                placeholderTextColor={COULEURS.text3}
                value={titre}
                onChangeText={setTitre}
              />
              <Text style={styles.inputLabel}>Description complète de l'offre</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Collez ici la description complète de l'offre d'emploi..."
                placeholderTextColor={COULEURS.text3}
                value={offre}
                onChangeText={setOffre}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.analyserBtn, offre.length < 30 && styles.analyserBtnDisabled]}
                onPress={lancer}
                disabled={offre.length < 30 || chargement}
                activeOpacity={0.8}
              >
                {chargement ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="sparkles-outline" size={20} color="#fff" />
                )}
                <Text style={styles.analyserTexte}>
                  {chargement ? 'Analyse en cours...' : 'Analyser avec l\'IA'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.resultats}>
              {source === 'local' && (
                <View style={styles.warningBanner}>
                  <Ionicons name="wifi-outline" size={14} color={COULEURS.warning} />
                  <Text style={styles.warningTexte}>Backend non disponible — analyse locale</Text>
                </View>
              )}

              <View style={styles.scoreCard}>
                <ATSScore score={analyse.score} large />
                <Text style={styles.scoreLabel}>
                  {analyse.score >= 75 ? 'Très bonne compatibilité !' :
                   analyse.score >= 50 ? 'Compatibilité correcte' :
                   'CV à optimiser pour ce poste'}
                </Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="checkmark-circle" size={18} color={COULEURS.success} />
                  <Text style={styles.sectionTitre}>Présents ({analyse.keywordsFound.length})</Text>
                </View>
                <View style={styles.chips}>
                  {analyse.keywordsFound.map((k) => (
                    <Badge key={k} label={k} variant="excellent" small />
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="close-circle" size={18} color={COULEURS.danger} />
                  <Text style={styles.sectionTitre}>Manquants ({analyse.keywordsMissing.length})</Text>
                </View>
                <View style={styles.chips}>
                  {analyse.keywordsMissing.map((k) => (
                    <Badge key={k} label={k} variant="faible" small />
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitre}>Recommandations</Text>
                {analyse.suggestions.map((s, i) => (
                  <View key={i} style={[styles.suggestion, { borderLeftColor: priorityColor(s.priority) }]}>
                    <View style={[styles.priorityBadge, { backgroundColor: priorityBg(s.priority) }]}>
                      <Text style={[styles.priorityTexte, { color: priorityColor(s.priority) }]}>
                        {s.priority === 'high' ? 'Prioritaire' : s.priority === 'medium' ? 'Important' : 'Conseillé'}
                      </Text>
                    </View>
                    <Text style={styles.suggestionMessage}>{s.message}</Text>
                    {s.example && (
                      <Text style={styles.suggestionExample}>ex: {s.example}</Text>
                    )}
                  </View>
                ))}
              </View>

              {analyse.rewrittenSummary && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitre}>Résumé optimisé suggéré</Text>
                  <View style={styles.resumeSuggere}>
                    <Text style={styles.resumeTexte}>{analyse.rewrittenSummary}</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.renouvelerBtn}
                onPress={() => { setAnalyse(null); setOffre(''); setTitre('') }}
              >
                <Ionicons name="refresh-outline" size={18} color={COULEURS.accent} />
                <Text style={styles.renouvelerTexte}>Analyser une autre offre</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COULEURS.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.md,
    padding: ESPACEMENTS.md,
    borderBottomWidth: 1,
    borderBottomColor: COULEURS.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: RAYONS.full,
    backgroundColor: COULEURS.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitre: { fontSize: POLICES.taille.lg, fontWeight: POLICES.poids.bold, color: COULEURS.text },
  headerSub: { fontSize: POLICES.taille.xs, color: COULEURS.text2 },

  content: { padding: ESPACEMENTS.md, gap: ESPACEMENTS.lg, paddingBottom: ESPACEMENTS.xxl },

  inputSection: { gap: ESPACEMENTS.sm },
  inputLabel: { fontSize: POLICES.taille.sm, fontWeight: POLICES.poids.semibold, color: COULEURS.text2 },
  titrInput: {
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.md,
    borderWidth: 1,
    borderColor: COULEURS.border,
    padding: ESPACEMENTS.sm + 2,
    fontSize: POLICES.taille.md,
    color: COULEURS.text,
  },
  textArea: {
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.lg,
    borderWidth: 1,
    borderColor: COULEURS.border,
    padding: ESPACEMENTS.md,
    fontSize: POLICES.taille.sm,
    color: COULEURS.text,
    minHeight: 180,
  },
  analyserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACEMENTS.sm,
    backgroundColor: COULEURS.accent,
    borderRadius: RAYONS.lg,
    paddingVertical: ESPACEMENTS.md,
  },
  analyserBtnDisabled: { opacity: 0.5 },
  analyserTexte: { fontSize: POLICES.taille.md, fontWeight: POLICES.poids.bold, color: '#fff' },

  resultats: { gap: ESPACEMENTS.lg },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.xs,
    backgroundColor: COULEURS.warningLight,
    borderRadius: RAYONS.sm,
    padding: ESPACEMENTS.sm,
  },
  warningTexte: { fontSize: POLICES.taille.xs, color: COULEURS.warning },

  scoreCard: {
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.xl,
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
    padding: ESPACEMENTS.lg,
    alignItems: 'center',
    gap: ESPACEMENTS.md,
  },
  scoreLabel: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.text2,
    textAlign: 'center',
  },

  section: { gap: ESPACEMENTS.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: ESPACEMENTS.xs },
  sectionTitre: { fontSize: POLICES.taille.md, fontWeight: POLICES.poids.bold, color: COULEURS.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACEMENTS.xs },

  suggestion: {
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.md,
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
    borderLeftWidth: 3,
    padding: ESPACEMENTS.md,
    gap: ESPACEMENTS.xs,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: ESPACEMENTS.sm,
    paddingVertical: 2,
    borderRadius: RAYONS.full,
  },
  priorityTexte: { fontSize: 10, fontWeight: POLICES.poids.bold },
  suggestionMessage: { fontSize: POLICES.taille.sm, color: COULEURS.text, lineHeight: 18 },
  suggestionExample: { fontSize: POLICES.taille.xs, color: COULEURS.text3, fontStyle: 'italic', lineHeight: 16 },

  resumeSuggere: {
    backgroundColor: COULEURS.accentLight,
    borderRadius: RAYONS.md,
    borderWidth: 1,
    borderColor: COULEURS.accent,
    padding: ESPACEMENTS.md,
  },
  resumeTexte: { fontSize: POLICES.taille.sm, color: COULEURS.text, lineHeight: 20, fontStyle: 'italic' },

  renouvelerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACEMENTS.sm,
    borderWidth: 1,
    borderColor: COULEURS.border,
    borderRadius: RAYONS.lg,
    paddingVertical: ESPACEMENTS.md,
  },
  renouvelerTexte: { fontSize: POLICES.taille.sm, color: COULEURS.accent, fontWeight: POLICES.poids.semibold },
})
