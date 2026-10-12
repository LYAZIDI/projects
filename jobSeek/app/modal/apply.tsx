import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useJobsStore } from '../../src/store/useJobsStore'
import { useCVStore } from '../../src/store/useCVStore'
import { COULEURS, POLICES, ESPACEMENTS, RAYONS } from '../../src/constants/theme'

type Section = 'cv' | 'lettre' | 'reponses'

const SECTIONS: { key: Section; titre: string; icon: string }[] = [
  { key: 'cv', titre: 'CV optimisé', icon: 'document-text-outline' },
  { key: 'lettre', titre: 'Lettre de motivation', icon: 'mail-outline' },
  { key: 'reponses', titre: 'Réponses aux questions', icon: 'chatbubble-outline' },
]

function genererCV(jobTitle: string, cvName: string, skills: string[]): string {
  return `CV OPTIMISÉ POUR : ${jobTitle}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${cvName.toUpperCase()}
Développeur passionné par les technologies modernes

COMPÉTENCES CLÉS
${skills.slice(0, 6).map((s) => `• ${s}`).join('\n')}

EXPÉRIENCE
• Développeur Senior — TechStartup SAS (2022-Présent)
  - Développement React/TypeScript sur applications complexes
  - Architecture de solutions scalables et maintenables
  - Collaboration étroite avec les équipes produit

• Développeur Fullstack — Agence Digital (2020-2022)
  - Création d'applications web Node.js/React
  - Optimisation des performances (réduction 40% temps chargement)

FORMATION
• Master Informatique — Université Paris-Saclay (2019)

LANGUES : Français (natif), Anglais (courant)`
}

function genererLettre(jobTitle: string, company: string, cvName: string): string {
  return `Madame, Monsieur,

Passionné par le développement logiciel et fort de 5 ans d'expérience dans la conception et le développement d'applications web modernes, je me permets de vous adresser ma candidature au poste de ${jobTitle} au sein de ${company}.

Mon parcours m'a permis de développer une expertise solide en React et Node.js, technologies que vous utilisez au quotidien. J'ai notamment contribué à des projets à forte valeur ajoutée : refonte complète d'une application SaaS en TypeScript, intégration d'APIs REST critiques, et mise en place de tests automatisés ayant amélioré la qualité du code de 60%.

Ce qui m'attire particulièrement chez ${company}, c'est votre approche centrée sur la qualité technique et l'impact utilisateur. Votre culture d'ingénierie, orientée vers l'excellence et l'innovation, correspond parfaitement à mes valeurs professionnelles.

Enthousiaste à l'idée de rejoindre votre équipe et de contribuer à vos projets ambitieux, je reste à votre disposition pour un entretien à votre convenance.

Dans l'attente de votre retour, je vous adresse mes sincères salutations.

${cvName}`
}

function genererReponses(questions: string[]): string {
  const reponses: Record<string, string> = {
    experience: 'Fort de 5 ans d\'expérience en développement fullstack, j\'ai travaillé sur des projets variés : applications SaaS B2B, APIs haute disponibilité, et interfaces utilisateur complexes avec React et TypeScript.',
    performance: 'J\'utilise plusieurs techniques : code splitting, lazy loading des composants, memoization avec useMemo/useCallback, et optimisation des re-renders avec React.memo. J\'analyse systématiquement avec les DevTools React Profiler.',
    defaut: 'J\'aborde chaque problème avec méthode : analyse du besoin, recherche de solutions, prototypage rapide, et itération. Je favorise la communication transparente au sein de l\'équipe.',
  }

  return questions
    .slice(0, 4)
    .map((q, i) => {
      const rep = Object.values(reponses)[i % Object.values(reponses).length]
      return `Q${i + 1}: ${q}\n\nRéponse suggérée:\n${rep}\n\n${'─'.repeat(50)}`
    })
    .join('\n\n')
}

export default function Apply() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { jobs } = useJobsStore()
  const { cv } = useCVStore()
  const [section, setSection] = useState<Section>('cv')
  const [generation, setGeneration] = useState<Partial<Record<Section, boolean>>>({})
  const [contenu, setContenu] = useState<Partial<Record<Section, string>>>({})

  const job = jobs.find((j) => j.id === id)
  if (!job || !cv) return null

  const generer = async (key: Section) => {
    setGeneration((g) => ({ ...g, [key]: true }))
    await new Promise((r) => setTimeout(r, 1800))
    let texte = ''
    if (key === 'cv') texte = genererCV(job.title, cv.name, cv.skills)
    else if (key === 'lettre') texte = genererLettre(job.title, job.company, cv.name)
    else texte = genererReponses(job.questions ?? [])
    setContenu((c) => ({ ...c, [key]: texte }))
    setGeneration((g) => ({ ...g, [key]: false }))
  }

  const copier = (texte: string) => {
    Alert.alert('Copié !', 'Le contenu a été copié dans le presse-papier.')
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={COULEURS.text2} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitre} numberOfLines={1}>{job.title}</Text>
          <Text style={styles.headerEntreprise}>{job.company}</Text>
        </View>
      </View>

      {/* Onglets */}
      <View style={styles.onglets}>
        {SECTIONS.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.onglet, section === s.key && styles.ongletActif]}
            onPress={() => setSection(s.key)}
          >
            <Ionicons
              name={s.icon as any}
              size={16}
              color={section === s.key ? COULEURS.accent : COULEURS.text3}
            />
            <Text style={[styles.ongletTexte, section === s.key && styles.ongletTexteActif]}>
              {s.titre}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {contenu[section] ? (
          <View style={styles.resultat}>
            <View style={styles.resultatHeader}>
              <Text style={styles.resultatTitre}>
                {SECTIONS.find((s) => s.key === section)?.titre}
              </Text>
              <TouchableOpacity style={styles.copierBtn} onPress={() => copier(contenu[section]!)}>
                <Ionicons name="copy-outline" size={16} color={COULEURS.accent} />
                <Text style={styles.copierTexte}>Copier</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.resultatTexte}>{contenu[section]}</Text>
            <TouchableOpacity
              style={styles.regenBtn}
              onPress={() => generer(section)}
            >
              <Ionicons name="refresh-outline" size={16} color={COULEURS.text2} />
              <Text style={styles.regenTexte}>Régénérer</Text>
            </TouchableOpacity>
          </View>
        ) : generation[section] ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={COULEURS.accent} />
            <Text style={styles.loadingTexte}>Génération en cours avec l'IA...</Text>
            <Text style={styles.loadingSub}>Adaptation de votre profil au poste</Text>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Ionicons
              name={SECTIONS.find((s) => s.key === section)?.icon as any}
              size={52}
              color={COULEURS.text3}
            />
            <Text style={styles.placeholderTitre}>
              {section === 'cv' && 'CV optimisé pour ce poste'}
              {section === 'lettre' && 'Lettre de motivation personnalisée'}
              {section === 'reponses' && 'Réponses aux questions d\'entretien'}
            </Text>
            <Text style={styles.placeholderSub}>
              {section === 'cv' && 'L\'IA va adapter votre CV aux mots-clés de l\'offre'}
              {section === 'lettre' && 'Une lettre unique basée sur votre parcours'}
              {section === 'reponses' && 'Préparez-vous aux questions fréquentes pour ce poste'}
            </Text>
            <TouchableOpacity
              style={styles.genererBtn}
              onPress={() => generer(section)}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles-outline" size={20} color="#fff" />
              <Text style={styles.genererTexte}>Générer avec l'IA</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COULEURS.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.sm,
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
  headerInfo: { flex: 1 },
  headerTitre: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.text,
  },
  headerEntreprise: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text2,
  },

  onglets: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COULEURS.border,
  },
  onglet: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: ESPACEMENTS.sm,
    gap: 3,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  ongletActif: {
    borderBottomColor: COULEURS.accent,
  },
  ongletTexte: {
    fontSize: 10,
    color: COULEURS.text3,
    fontWeight: POLICES.poids.medium,
    textAlign: 'center',
  },
  ongletTexteActif: {
    color: COULEURS.accent,
    fontWeight: POLICES.poids.semibold,
  },

  content: { padding: ESPACEMENTS.md, flexGrow: 1 },

  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACEMENTS.md,
    paddingVertical: ESPACEMENTS.xxl,
  },
  placeholderTitre: {
    fontSize: POLICES.taille.xl,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.text2,
    textAlign: 'center',
  },
  placeholderSub: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text3,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: ESPACEMENTS.xl,
  },
  genererBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.sm,
    backgroundColor: COULEURS.accent,
    borderRadius: RAYONS.lg,
    paddingHorizontal: ESPACEMENTS.xl,
    paddingVertical: ESPACEMENTS.md,
    marginTop: ESPACEMENTS.sm,
  },
  genererTexte: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.bold,
    color: '#fff',
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACEMENTS.md,
    paddingVertical: ESPACEMENTS.xxl,
  },
  loadingTexte: {
    fontSize: POLICES.taille.lg,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.text,
  },
  loadingSub: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text2,
  },

  resultat: {
    gap: ESPACEMENTS.md,
  },
  resultatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultatTitre: {
    fontSize: POLICES.taille.lg,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.text,
  },
  copierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COULEURS.accentLight,
    paddingHorizontal: ESPACEMENTS.sm,
    paddingVertical: 5,
    borderRadius: RAYONS.full,
  },
  copierTexte: {
    fontSize: POLICES.taille.xs,
    color: COULEURS.accent,
    fontWeight: POLICES.poids.semibold,
  },
  resultatTexte: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text,
    lineHeight: 22,
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.lg,
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
    padding: ESPACEMENTS.md,
    fontFamily: 'monospace',
  },
  regenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACEMENTS.xs,
    padding: ESPACEMENTS.sm,
  },
  regenTexte: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text2,
  },
})
