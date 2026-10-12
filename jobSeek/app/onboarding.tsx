import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
import { useCVStore } from '../src/store/useCVStore'
import { useJobsStore } from '../src/store/useJobsStore'
import { ATSScore } from '../src/components/ATSScore'
import { Badge } from '../src/components/ui/Badge'
import { COULEURS, POLICES, ESPACEMENTS, RAYONS } from '../src/constants/theme'
import { checkConnexion } from '../src/api/client'
import { fetchProfile } from '../src/api/cv'
import { DEMO_CV } from '../src/data/mocks'
import type { ParsedCV } from '../src/types'

type Etape = 'accueil' | 'chargement' | 'resultat'

export default function Onboarding() {
  const router = useRouter()
  const { sauvegarder, uploadFichier } = useCVStore()
  const { rafraichir } = useJobsStore()
  const [etape, setEtape] = useState<Etape>('accueil')
  const [cvParse, setCvParse] = useState<ParsedCV | null>(null)
  const [messageChargement, setMessageChargement] = useState('')

  const importerCV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
        ],
        copyToCacheDirectory: true,
      })
      if (result.canceled) return

      const file = result.assets[0]
      setMessageChargement('Connexion au serveur...')
      setEtape('chargement')

      const connected = await checkConnexion()
      if (!connected) {
        Alert.alert(
          'Backend non disponible',
          'Le serveur job-copilot n\'est pas accessible. Vérifiez qu\'il est lancé sur le port 3002, puis configurez l\'URL dans Paramètres.',
          [
            { text: 'Paramètres', onPress: () => { setEtape('accueil'); router.push('/modal/settings') } },
            { text: 'Réessayer', onPress: () => setEtape('accueil'), style: 'cancel' },
          ]
        )
        return
      }

      setMessageChargement('Analyse du CV en cours...')
      const cv = await uploadFichier(file.uri, file.name, file.mimeType ?? 'application/pdf')
      setCvParse(cv)
      setEtape('resultat')
    } catch (e: any) {
      Alert.alert('Erreur', `Impossible d'analyser ce fichier : ${e.message}`)
      setEtape('accueil')
    }
  }

  const continuer = async () => {
    if (!cvParse) return
    await sauvegarder(cvParse)
    await rafraichir()
    router.replace('/(tabs)')
  }

  const utiliserExemple = async () => {
    setMessageChargement('Chargement du profil exemple...')
    setEtape('chargement')
    let cv: ParsedCV = DEMO_CV
    try {
      const connected = await checkConnexion()
      if (connected) {
        const data = await fetchProfile()
        if (data?.cv) cv = data.cv
      }
    } catch {}
    setCvParse(cv)
    setEtape('resultat')
  }

  if (etape === 'chargement') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COULEURS.accent} />
          <Text style={styles.loadingTitre}>{messageChargement}</Text>
          <Text style={styles.loadingSub}>Extraction des données avec l'IA</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (etape === 'resultat' && cvParse) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.resultatContent} showsVerticalScrollIndicator={false}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={56} color={COULEURS.success} />
          </View>
          <Text style={styles.resultatTitre}>CV analysé !</Text>
          <Text style={styles.resultatSub}>Voici ce que l'IA a extrait</Text>

          <View style={styles.resultatCard}>
            <ATSScore score={cvParse.atsScore} large />
          </View>

          <View style={styles.infoCard}>
            {cvParse.name ? (
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={18} color={COULEURS.accent} />
                <Text style={styles.infoTexte}>{cvParse.name}</Text>
              </View>
            ) : null}
            {cvParse.email ? (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={18} color={COULEURS.accent} />
                <Text style={styles.infoTexte}>{cvParse.email}</Text>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color={COULEURS.accent} />
              <Text style={styles.infoTexte}>{cvParse.yearsExperience} ans d'expérience</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="code-outline" size={18} color={COULEURS.accent} />
              <Text style={styles.infoTexte}>{cvParse.skills.length} compétences détectées</Text>
            </View>
          </View>

          {cvParse.skills.length > 0 && (
            <View style={styles.skillsSection}>
              <Text style={styles.skillsLabel}>Compétences détectées</Text>
              <View style={styles.chips}>
                {cvParse.skills.map((s) => (
                  <Badge key={s} label={s} variant="accent" />
                ))}
              </View>
            </View>
          )}

          {cvParse.atsMissing.length > 0 && (
            <View style={styles.skillsSection}>
              <Text style={[styles.skillsLabel, { color: COULEURS.warning }]}>
                Mots-clés manquants
              </Text>
              <View style={styles.chips}>
                {cvParse.atsMissing.map((s) => (
                  <Badge key={s} label={s} variant="faible" />
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.continuerBtn} onPress={continuer} activeOpacity={0.8}>
            <Text style={styles.continuerTexte}>Accéder à l'application →</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setEtape('accueil')} style={styles.recommencerBtn}>
            <Text style={styles.recommencerTexte}>Utiliser un autre CV</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.accueilContent} showsVerticalScrollIndicator={false}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Ionicons name="briefcase" size={36} color="#fff" />
          </View>
          <Text style={styles.appNom}>jobSeek</Text>
          <Text style={styles.appTagline}>Votre copilote pour la recherche d'emploi</Text>
        </View>

        {[
          { icon: 'analytics-outline', titre: 'Score ATS', desc: 'Analysez et optimisez votre CV pour passer les filtres automatiques' },
          { icon: 'briefcase-outline', titre: 'Matching intelligent', desc: 'Trouvez les offres les plus compatibles avec votre profil' },
          { icon: 'document-text-outline', titre: 'Candidature assistée', desc: 'Générez une lettre de motivation et un CV adaptés avec l\'IA' },
          { icon: 'layers-outline', titre: 'Suivi des candidatures', desc: 'Suivez l\'avancement de toutes vos candidatures' },
        ].map((f) => (
          <View key={f.titre} style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name={f.icon as any} size={24} color={COULEURS.accent} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitre}>{f.titre}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.importBtn} onPress={importerCV} activeOpacity={0.8}>
            <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
            <Text style={styles.importTexte}>Importer mon CV (PDF / DOCX)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exempleBtn} onPress={utiliserExemple}>
            <Ionicons name="flask-outline" size={16} color={COULEURS.text2} />
            <Text style={styles.exempleTexte}>Tester avec un profil exemple</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/modal/settings')}>
            <Ionicons name="settings-outline" size={16} color={COULEURS.text3} />
            <Text style={styles.settingsTexte}>Configurer l'URL du backend</Text>
          </TouchableOpacity>

          <Text style={styles.mention}>
            Le backend job-copilot doit être lancé sur le port 3002 pour analyser votre CV.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COULEURS.bg },

  loading: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: ESPACEMENTS.md, padding: ESPACEMENTS.xl,
  },
  loadingTitre: {
    fontSize: POLICES.taille.xl, fontWeight: POLICES.poids.bold,
    color: COULEURS.text, textAlign: 'center',
  },
  loadingSub: { fontSize: POLICES.taille.sm, color: COULEURS.text2, textAlign: 'center' },

  accueilContent: { padding: ESPACEMENTS.lg, gap: ESPACEMENTS.md, paddingBottom: ESPACEMENTS.xxl },

  logoContainer: { alignItems: 'center', paddingVertical: ESPACEMENTS.xl, gap: ESPACEMENTS.sm },
  logo: {
    width: 80, height: 80, borderRadius: RAYONS.xl,
    backgroundColor: COULEURS.accent, alignItems: 'center', justifyContent: 'center',
  },
  appNom: {
    fontSize: POLICES.taille.xxxl, fontWeight: POLICES.poids.heavy,
    color: COULEURS.text, letterSpacing: -1,
  },
  appTagline: { fontSize: POLICES.taille.md, color: COULEURS.text2, textAlign: 'center' },

  featureCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: ESPACEMENTS.md,
    backgroundColor: COULEURS.card, borderRadius: RAYONS.lg,
    borderWidth: 1, borderColor: COULEURS.cardBorder, padding: ESPACEMENTS.md,
  },
  featureIcon: {
    width: 44, height: 44, borderRadius: RAYONS.md,
    backgroundColor: COULEURS.accentLight, alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
  },
  featureInfo: { flex: 1, gap: 3 },
  featureTitre: { fontSize: POLICES.taille.md, fontWeight: POLICES.poids.semibold, color: COULEURS.text },
  featureDesc: { fontSize: POLICES.taille.sm, color: COULEURS.text2, lineHeight: 18 },

  actions: { gap: ESPACEMENTS.sm, marginTop: ESPACEMENTS.md, alignItems: 'center' },
  importBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: ESPACEMENTS.sm, backgroundColor: COULEURS.accent,
    borderRadius: RAYONS.lg, paddingVertical: ESPACEMENTS.md + 2, width: '100%',
  },
  importTexte: { fontSize: POLICES.taille.md, fontWeight: POLICES.poids.bold, color: '#fff' },
  exempleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: ESPACEMENTS.xs,
    borderWidth: 1, borderColor: COULEURS.border, borderRadius: RAYONS.lg,
    paddingVertical: ESPACEMENTS.sm, paddingHorizontal: ESPACEMENTS.md,
    width: '100%', justifyContent: 'center',
  },
  exempleTexte: { fontSize: POLICES.taille.sm, color: COULEURS.text2 },
  settingsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: ESPACEMENTS.xs,
    paddingVertical: ESPACEMENTS.sm,
  },
  settingsTexte: { fontSize: POLICES.taille.sm, color: COULEURS.text3 },
  mention: {
    fontSize: POLICES.taille.xs, color: COULEURS.text3,
    textAlign: 'center', lineHeight: 16, paddingHorizontal: ESPACEMENTS.md,
  },

  resultatContent: {
    padding: ESPACEMENTS.lg, gap: ESPACEMENTS.lg,
    paddingBottom: ESPACEMENTS.xxl, alignItems: 'center',
  },
  successIcon: { marginTop: ESPACEMENTS.xl },
  resultatTitre: { fontSize: POLICES.taille.xxxl, fontWeight: POLICES.poids.heavy, color: COULEURS.text },
  resultatSub: { fontSize: POLICES.taille.md, color: COULEURS.text2 },
  resultatCard: {
    backgroundColor: COULEURS.card, borderRadius: RAYONS.xl,
    borderWidth: 1, borderColor: COULEURS.cardBorder,
    padding: ESPACEMENTS.xl, width: '100%', alignItems: 'center',
  },
  infoCard: {
    backgroundColor: COULEURS.card, borderRadius: RAYONS.lg,
    borderWidth: 1, borderColor: COULEURS.cardBorder,
    padding: ESPACEMENTS.md, width: '100%', gap: ESPACEMENTS.sm,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: ESPACEMENTS.sm },
  infoTexte: { fontSize: POLICES.taille.md, color: COULEURS.text },
  skillsSection: { width: '100%', gap: ESPACEMENTS.sm },
  skillsLabel: { fontSize: POLICES.taille.md, fontWeight: POLICES.poids.semibold, color: COULEURS.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACEMENTS.xs },
  continuerBtn: {
    backgroundColor: COULEURS.accent, borderRadius: RAYONS.lg,
    paddingVertical: ESPACEMENTS.md, paddingHorizontal: ESPACEMENTS.xl,
    width: '100%', alignItems: 'center',
  },
  continuerTexte: { fontSize: POLICES.taille.lg, fontWeight: POLICES.poids.bold, color: '#fff' },
  recommencerBtn: { paddingVertical: ESPACEMENTS.sm },
  recommencerTexte: { fontSize: POLICES.taille.sm, color: COULEURS.text3 },
})
