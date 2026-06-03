import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useExpensesStore } from '../../src/store/useExpensesStore'
import { useBudgetStore } from '../../src/store/useBudgetStore'
import { Card } from '../../src/components/ui/Card'
import { genererPDFDepenses } from '../../src/utils/pdf'
import { partagerBackup, listerBackups } from '../../src/utils/backup'
import { formatMAD, formatMoisAnnee, moisCourant } from '../../src/utils/formatters'
import { COULEURS, POLICES, ESPACEMENTS, RAYONS } from '../../src/constants/theme'

export default function ProfilScreen() {
  const { depenses, categories, totalMois, moisSelectionne } = useExpensesStore()
  const { budget } = useBudgetStore()
  const [exportEnCours, setExportEnCours] = useState(false)
  const [backupEnCours, setBackupEnCours] = useState(false)

  const exporterPDF = async () => {
    setExportEnCours(true)
    try {
      await genererPDFDepenses({
        depenses,
        categories,
        budget,
        mois: moisSelectionne,
        total: totalMois(),
      })
    } catch (e) {
      Alert.alert('Erreur', `Impossible de générer le PDF : ${String(e)}`)
    } finally {
      setExportEnCours(false)
    }
  }

  const faireBackup = async () => {
    setBackupEnCours(true)
    try {
      await partagerBackup()
    } catch (e) {
      Alert.alert('Erreur', `Impossible de créer le backup : ${String(e)}`)
    } finally {
      setBackupEnCours(false)
    }
  }

  const total = totalMois()

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.titre}>Profil</Text>
        </View>

        {/* Avatar */}
        <Card style={styles.avatarCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={36} color={COULEURS.accent} />
          </View>
          <View style={styles.avatarInfos}>
            <Text style={styles.avatarNom}>Utilisateur Masruf</Text>
            <Text style={styles.avatarSousTitre}>
              {depenses.length} dépenses enregistrées
            </Text>
          </View>
          <View style={styles.avatarStats}>
            <View style={styles.avatarStat}>
              <Text style={styles.avatarStatValeur}>{formatMAD(total, true)}</Text>
              <Text style={styles.avatarStatLabel}>Ce mois</Text>
            </View>
            <View style={styles.avatarStatSep} />
            <View style={styles.avatarStat}>
              <Text style={styles.avatarStatValeur}>{categories.length}</Text>
              <Text style={styles.avatarStatLabel}>Catégories</Text>
            </View>
            <View style={styles.avatarStatSep} />
            <View style={styles.avatarStat}>
              <Text style={styles.avatarStatValeur}>
                {budget ? formatMAD(budget.montant, true) : '—'}
              </Text>
              <Text style={styles.avatarStatLabel}>Budget</Text>
            </View>
          </View>
        </Card>

        {/* Export & Backup */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitre}>Export & Sauvegarde</Text>

          <MenuItem
            icone="document-text-outline"
            couleurIcone="#FF6B6B"
            titre="Exporter en PDF"
            sousTitre={`Rapport ${formatMoisAnnee(moisSelectionne)}`}
            onPress={exporterPDF}
            chargement={exportEnCours}
          />
          <MenuItem
            icone="cloud-upload-outline"
            couleurIcone="#4ECDC4"
            titre="Sauvegarder les données"
            sousTitre="Backup JSON local"
            onPress={faireBackup}
            chargement={backupEnCours}
          />
          <MenuItem
            icone="cloud-download-outline"
            couleurIcone="#FFE66D"
            titre="Restaurer un backup"
            sousTitre="Importer depuis un fichier"
            onPress={() => Alert.alert('Restauration', 'Fonctionnalité disponible prochainement.')}
          />
        </Card>

        {/* Paramètres */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitre}>Paramètres</Text>

          <MenuItem
            icone="notifications-outline"
            couleurIcone={COULEURS.accent}
            titre="Notifications"
            sousTitre="Rappels et alertes budget"
            onPress={() => Alert.alert('Notifications', 'Paramètres de notifications à venir.')}
          />
          <MenuItem
            icone="grid-outline"
            couleurIcone="#A8E6CF"
            titre="Catégories"
            sousTitre="Gérer les catégories"
            onPress={() => Alert.alert('Catégories', 'Gestion des catégories à venir.')}
          />
          <MenuItem
            icone="language-outline"
            couleurIcone="#B8B8FF"
            titre="Langue"
            sousTitre="Français (عربية bientôt)"
            onPress={() => {}}
            badge="FR"
          />
          <MenuItem
            icone="cash-outline"
            couleurIcone={COULEURS.success}
            titre="Devise"
            sousTitre="Dirham marocain (MAD)"
            onPress={() => {}}
            badge="DH"
          />
        </Card>

        {/* À propos */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitre}>À propos</Text>

          <MenuItem
            icone="star-outline"
            couleurIcone={COULEURS.warning}
            titre="Évaluer l'application"
            sousTitre="App Store / Play Store"
            onPress={() => Alert.alert('Merci !', 'Votre avis nous aide à améliorer Masruf.')}
          />
          <MenuItem
            icone="share-outline"
            couleurIcone={COULEURS.info}
            titre="Partager Masruf"
            sousTitre="Avec vos proches"
            onPress={() => Share.share({ message: 'Découvrez Masruf — Gérez vos dépenses facilement en DH !' })}
          />
          <View style={styles.version}>
            <Text style={styles.versionTexte}>Masruf v1.0.0 · مصروف</Text>
            <Text style={styles.versionSous}>Gestion des dépenses · Marché marocain</Text>
          </View>
        </Card>

        <View style={{ height: ESPACEMENTS.xl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

function MenuItem({
  icone, couleurIcone, titre, sousTitre, onPress, chargement = false, badge
}: {
  icone: string
  couleurIcone: string
  titre: string
  sousTitre: string
  onPress: () => void
  chargement?: boolean
  badge?: string
}) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      disabled={chargement}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcone, { backgroundColor: couleurIcone + '20' }]}>
        <Ionicons name={icone as any} size={20} color={couleurIcone} />
      </View>
      <View style={styles.menuInfos}>
        <Text style={styles.menuTitre}>{titre}</Text>
        <Text style={styles.menuSousTitre}>{sousTitre}</Text>
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeTexte}>{badge}</Text>
        </View>
      ) : chargement ? (
        <Text style={styles.chargement}>...</Text>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={COULEURS.text3} />
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COULEURS.bg },
  scroll: { flex: 1 },
  content: { padding: ESPACEMENTS.md, gap: ESPACEMENTS.md },

  header: { marginBottom: ESPACEMENTS.xs },
  titre: {
    fontSize: POLICES.taille.xxl,
    fontWeight: POLICES.poids.heavy,
    color: COULEURS.text,
    letterSpacing: -0.5,
  },

  avatarCard: { gap: ESPACEMENTS.md },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COULEURS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COULEURS.accent,
    alignSelf: 'center',
  },
  avatarInfos: { alignItems: 'center', gap: 4 },
  avatarNom: { fontSize: POLICES.taille.lg, fontWeight: POLICES.poids.bold, color: COULEURS.text },
  avatarSousTitre: { fontSize: POLICES.taille.sm, color: COULEURS.text2 },
  avatarStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: ESPACEMENTS.sm,
    borderTopWidth: 1,
    borderTopColor: COULEURS.border,
  },
  avatarStat: { alignItems: 'center', gap: 2 },
  avatarStatValeur: { fontSize: POLICES.taille.md, fontWeight: POLICES.poids.bold, color: COULEURS.text },
  avatarStatLabel: { fontSize: POLICES.taille.xs, color: COULEURS.text2 },
  avatarStatSep: { width: 1, height: 32, backgroundColor: COULEURS.border },

  section: { gap: ESPACEMENTS.xs },
  sectionTitre: {
    fontSize: POLICES.taille.sm,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.text2,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: ESPACEMENTS.xs,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.md,
    paddingVertical: ESPACEMENTS.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COULEURS.border,
  },
  menuIcone: {
    width: 38,
    height: 38,
    borderRadius: RAYONS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuInfos: { flex: 1, gap: 2 },
  menuTitre: { fontSize: POLICES.taille.md, fontWeight: POLICES.poids.medium, color: COULEURS.text },
  menuSousTitre: { fontSize: POLICES.taille.xs, color: COULEURS.text2 },
  badge: {
    backgroundColor: COULEURS.accentLight,
    paddingHorizontal: ESPACEMENTS.sm,
    paddingVertical: 2,
    borderRadius: RAYONS.full,
    borderWidth: 1,
    borderColor: COULEURS.accent,
  },
  badgeTexte: { fontSize: POLICES.taille.xs, fontWeight: POLICES.poids.bold, color: COULEURS.accent },
  chargement: { fontSize: POLICES.taille.sm, color: COULEURS.text3 },

  version: { alignItems: 'center', paddingTop: ESPACEMENTS.sm, gap: 4 },
  versionTexte: { fontSize: POLICES.taille.sm, color: COULEURS.text3, fontWeight: POLICES.poids.medium },
  versionSous: { fontSize: POLICES.taille.xs, color: COULEURS.text3 },
})
