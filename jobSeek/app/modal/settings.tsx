import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Platform } from 'react-native'
import { getApiUrl, setApiUrl, checkConnexion } from '../../src/api/client'
import { useJobsStore } from '../../src/store/useJobsStore'
import { COULEURS, POLICES, ESPACEMENTS, RAYONS } from '../../src/constants/theme'

const SUGGESTIONS = Platform.OS === 'android'
  ? ['http://10.0.2.2:3002', 'http://192.168.1.x:3002']
  : ['http://localhost:3002', 'http://192.168.1.x:3002']

export default function Settings() {
  const router = useRouter()
  const { rafraichir, lancerDecouverte, backendActif } = useJobsStore()
  const [url, setUrl] = useState('')
  const [test, setTest] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [decouverte, setDecouverte] = useState(false)

  useEffect(() => {
    getApiUrl().then(setUrl)
  }, [])

  const testerConnexion = async () => {
    setTest('testing')
    await setApiUrl(url)
    const ok = await checkConnexion()
    setTest(ok ? 'ok' : 'fail')
  }

  const sauvegarder = async () => {
    await setApiUrl(url)
    await rafraichir()
    Alert.alert('Sauvegardé', 'URL du backend mise à jour. Les offres ont été rechargées.')
    router.back()
  }

  const lancerDecouverteOffres = async () => {
    setDecouverte(true)
    try {
      const msg = await lancerDecouverte()
      Alert.alert('Découverte terminée', msg)
    } catch (e: any) {
      Alert.alert('Erreur', e.message ?? 'Impossible de lancer la découverte')
    } finally {
      setDecouverte(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={COULEURS.text2} />
        </TouchableOpacity>
        <Text style={styles.titre}>Paramètres</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitre}>URL du backend job-copilot</Text>
          <Text style={styles.sectionDesc}>
            Entrez l'adresse de votre backend. Sur émulateur Android : 10.0.2.2:3002. Sur iOS simulator : localhost:3002.
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.urlInput}
              value={url}
              onChangeText={(v) => { setUrl(v); setTest('idle') }}
              placeholder="http://10.0.2.2:3002"
              placeholderTextColor={COULEURS.text3}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TouchableOpacity style={styles.testBtn} onPress={testerConnexion}>
              {test === 'testing' ? (
                <ActivityIndicator size="small" color={COULEURS.accent} />
              ) : (
                <Ionicons
                  name={test === 'ok' ? 'checkmark-circle' : test === 'fail' ? 'close-circle' : 'wifi-outline'}
                  size={22}
                  color={test === 'ok' ? COULEURS.success : test === 'fail' ? COULEURS.danger : COULEURS.text2}
                />
              )}
            </TouchableOpacity>
          </View>

          {test === 'ok' && (
            <View style={styles.statusBanner}>
              <Ionicons name="checkmark-circle" size={14} color={COULEURS.success} />
              <Text style={[styles.statusTexte, { color: COULEURS.success }]}>Connexion réussie</Text>
            </View>
          )}
          {test === 'fail' && (
            <View style={[styles.statusBanner, { backgroundColor: COULEURS.dangerLight }]}>
              <Ionicons name="close-circle" size={14} color={COULEURS.danger} />
              <Text style={[styles.statusTexte, { color: COULEURS.danger }]}>Serveur non disponible</Text>
            </View>
          )}

          <Text style={styles.suggestLabel}>Adresses courantes :</Text>
          {SUGGESTIONS.map((s) => (
            <TouchableOpacity key={s} style={styles.suggestion} onPress={() => { setUrl(s); setTest('idle') }}>
              <Ionicons name="link-outline" size={14} color={COULEURS.text3} />
              <Text style={styles.suggestionTexte}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={sauvegarder} activeOpacity={0.8}>
          <Ionicons name="save-outline" size={20} color="#fff" />
          <Text style={styles.saveBtnTexte}>Sauvegarder et recharger</Text>
        </TouchableOpacity>

        {backendActif && (
          <View style={styles.section}>
            <Text style={styles.sectionTitre}>Découverte d'offres</Text>
            <Text style={styles.sectionDesc}>
              Lance la découverte depuis France Travail et Adzuna selon votre profil CV.
            </Text>
            <TouchableOpacity
              style={styles.discoverBtn}
              onPress={lancerDecouverteOffres}
              disabled={decouverte}
              activeOpacity={0.8}
            >
              {decouverte ? (
                <ActivityIndicator size="small" color={COULEURS.accent} />
              ) : (
                <Ionicons name="search-outline" size={20} color={COULEURS.accent} />
              )}
              <Text style={styles.discoverTexte}>
                {decouverte ? 'Recherche en cours...' : 'Rechercher de nouvelles offres'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    width: 36, height: 36, borderRadius: RAYONS.full,
    backgroundColor: COULEURS.card, alignItems: 'center', justifyContent: 'center',
  },
  titre: { fontSize: POLICES.taille.lg, fontWeight: POLICES.poids.bold, color: COULEURS.text },

  content: { padding: ESPACEMENTS.md, gap: ESPACEMENTS.lg },

  section: { gap: ESPACEMENTS.sm },
  sectionTitre: { fontSize: POLICES.taille.md, fontWeight: POLICES.poids.bold, color: COULEURS.text },
  sectionDesc: { fontSize: POLICES.taille.sm, color: COULEURS.text2, lineHeight: 18 },

  inputRow: { flexDirection: 'row', gap: ESPACEMENTS.sm, alignItems: 'center' },
  urlInput: {
    flex: 1,
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.md,
    borderWidth: 1,
    borderColor: COULEURS.border,
    padding: ESPACEMENTS.sm + 2,
    fontSize: POLICES.taille.sm,
    color: COULEURS.text,
  },
  testBtn: {
    width: 44, height: 44, borderRadius: RAYONS.md,
    backgroundColor: COULEURS.card, borderWidth: 1, borderColor: COULEURS.border,
    alignItems: 'center', justifyContent: 'center',
  },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: ESPACEMENTS.xs,
    backgroundColor: COULEURS.successLight, borderRadius: RAYONS.sm, padding: ESPACEMENTS.sm,
  },
  statusTexte: { fontSize: POLICES.taille.xs, fontWeight: POLICES.poids.semibold },

  suggestLabel: { fontSize: POLICES.taille.xs, color: COULEURS.text3, marginTop: ESPACEMENTS.xs },
  suggestion: {
    flexDirection: 'row', alignItems: 'center', gap: ESPACEMENTS.xs,
    padding: ESPACEMENTS.xs,
  },
  suggestionTexte: { fontSize: POLICES.taille.xs, color: COULEURS.accent },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: ESPACEMENTS.sm, backgroundColor: COULEURS.accent,
    borderRadius: RAYONS.lg, paddingVertical: ESPACEMENTS.md,
  },
  saveBtnTexte: { fontSize: POLICES.taille.md, fontWeight: POLICES.poids.bold, color: '#fff' },

  discoverBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: ESPACEMENTS.sm, borderWidth: 1.5, borderColor: COULEURS.accent,
    borderRadius: RAYONS.lg, paddingVertical: ESPACEMENTS.md,
  },
  discoverTexte: { fontSize: POLICES.taille.md, fontWeight: POLICES.poids.semibold, color: COULEURS.accent },
})
