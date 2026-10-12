import React, { useState } from 'react'
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useApplicationsStore } from '../../src/store/useApplicationsStore'
import { COULEURS, POLICES, ESPACEMENTS, RAYONS } from '../../src/constants/theme'
import { statusLabel, statusColor, formatDate } from '../../src/utils/formatters'
import type { Application, ApplicationStatus } from '../../src/types'

const STATUTS: ApplicationStatus[] = ['to_apply', 'applied', 'interview', 'offer', 'rejected']

export default function Applications() {
  const router = useRouter()
  const { applications, parStatut, changerStatut, supprimer, stats } = useApplicationsStore()
  const [onglet, setOnglet] = useState<ApplicationStatus>('to_apply')
  const s = stats()

  const liste = parStatut(onglet)

  const onSupprimer = (app: Application) => {
    Alert.alert(
      'Supprimer',
      `Supprimer la candidature pour "${app.job.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => supprimer(app.id) },
      ]
    )
  }

  const renderApp = ({ item }: { item: Application }) => {
    const color = statusColor(item.status)
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.logoMini, { backgroundColor: `${color}22` }]}>
            <Text style={[styles.logoLettre, { color }]}>
              {item.job.company[0]?.toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitre} numberOfLines={1}>{item.job.title}</Text>
            <Text style={styles.cardEntreprise}>{item.job.company} • {item.job.location}</Text>
          </View>
          <TouchableOpacity onPress={() => onSupprimer(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={16} color={COULEURS.text3} />
          </TouchableOpacity>
        </View>

        {item.nextAction && (
          <View style={styles.nextAction}>
            <Ionicons name="time-outline" size={14} color={COULEURS.warning} />
            <Text style={styles.nextActionTexte} numberOfLines={2}>{item.nextAction}</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>Ajouté le {formatDate(item.appliedAt)}</Text>

          {onglet !== 'rejected' && onglet !== 'offer' && (
            <TouchableOpacity
              style={styles.avancerBtn}
              onPress={() => {
                const suivant = STATUTS[STATUTS.indexOf(onglet) + 1]
                if (suivant) changerStatut(item.id, suivant)
              }}
            >
              <Text style={styles.avancerTexte}>
                → {statusLabel(STATUTS[STATUTS.indexOf(onglet) + 1] ?? 'offer')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.titre}>Candidatures</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(tabs)/jobs')}
        >
          <Ionicons name="add" size={20} color={COULEURS.accent} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{s.total}</Text>
          <Text style={styles.statLab}>Total</Text>
        </View>
        <View style={styles.statDiv} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: COULEURS.success }]}>{s.entretiens}</Text>
          <Text style={styles.statLab}>Entretiens</Text>
        </View>
        <View style={styles.statDiv} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: COULEURS.warning }]}>{s.offres}</Text>
          <Text style={styles.statLab}>Offres</Text>
        </View>
        <View style={styles.statDiv} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: COULEURS.accent }]}>{s.taux}%</Text>
          <Text style={styles.statLab}>Taux réponse</Text>
        </View>
      </View>

      {/* Onglets statut */}
      <View style={styles.onglets}>
        {STATUTS.map((s) => {
          const count = parStatut(s).length
          const actif = onglet === s
          const color = statusColor(s)
          return (
            <TouchableOpacity
              key={s}
              style={[styles.onglet, actif && { borderBottomColor: color, borderBottomWidth: 2 }]}
              onPress={() => setOnglet(s)}
            >
              <Text style={[styles.ongletTexte, actif && { color }]}>
                {statusLabel(s)}
              </Text>
              {count > 0 && (
                <View style={[styles.ongletBadge, { backgroundColor: actif ? color : COULEURS.card2 }]}>
                  <Text style={[styles.ongletBadgeTexte, { color: actif ? '#fff' : COULEURS.text3 }]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Liste */}
      <FlatList
        data={liste}
        keyExtractor={(item) => item.id}
        renderItem={renderApp}
        contentContainerStyle={styles.liste}
        ItemSeparatorComponent={() => <View style={{ height: ESPACEMENTS.sm }} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.vide}>
            <Ionicons name="layers-outline" size={48} color={COULEURS.text3} />
            <Text style={styles.videTexte}>Aucune candidature</Text>
            <TouchableOpacity
              style={styles.ajouterBtn}
              onPress={() => router.push('/(tabs)/jobs')}
            >
              <Text style={styles.ajouterTexte}>Parcourir les offres</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COULEURS.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: RAYONS.full,
    backgroundColor: COULEURS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COULEURS.card,
    marginHorizontal: ESPACEMENTS.md,
    borderRadius: RAYONS.lg,
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
    paddingVertical: ESPACEMENTS.md,
    marginBottom: ESPACEMENTS.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statVal: {
    fontSize: POLICES.taille.xl,
    fontWeight: POLICES.poids.heavy,
    color: COULEURS.text,
  },
  statLab: {
    fontSize: 10,
    color: COULEURS.text3,
  },
  statDiv: {
    width: 1,
    height: 32,
    backgroundColor: COULEURS.border,
  },

  onglets: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COULEURS.border,
    paddingHorizontal: ESPACEMENTS.md,
  },
  onglet: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ESPACEMENTS.sm,
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  ongletTexte: {
    fontSize: 11,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.text3,
  },
  ongletBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  ongletBadgeTexte: {
    fontSize: 9,
    fontWeight: POLICES.poids.bold,
  },

  liste: {
    padding: ESPACEMENTS.md,
    paddingBottom: ESPACEMENTS.xxl,
  },

  card: {
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.lg,
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
    padding: ESPACEMENTS.md,
    gap: ESPACEMENTS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.sm,
  },
  logoMini: {
    width: 38,
    height: 38,
    borderRadius: RAYONS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoLettre: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.bold,
  },
  cardInfo: { flex: 1 },
  cardTitre: {
    fontSize: POLICES.taille.sm,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.text,
  },
  cardEntreprise: {
    fontSize: POLICES.taille.xs,
    color: COULEURS.text2,
    marginTop: 2,
  },

  nextAction: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ESPACEMENTS.xs,
    backgroundColor: COULEURS.warningLight,
    borderRadius: RAYONS.sm,
    padding: ESPACEMENTS.sm,
  },
  nextActionTexte: {
    flex: 1,
    fontSize: POLICES.taille.xs,
    color: COULEURS.warning,
    lineHeight: 16,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COULEURS.border,
    paddingTop: ESPACEMENTS.sm,
  },
  cardDate: {
    fontSize: POLICES.taille.xs,
    color: COULEURS.text3,
  },
  avancerBtn: {
    backgroundColor: COULEURS.accentLight,
    paddingHorizontal: ESPACEMENTS.sm,
    paddingVertical: 4,
    borderRadius: RAYONS.full,
  },
  avancerTexte: {
    fontSize: POLICES.taille.xs,
    color: COULEURS.accent,
    fontWeight: POLICES.poids.semibold,
  },

  vide: {
    paddingTop: ESPACEMENTS.xxl,
    alignItems: 'center',
    gap: ESPACEMENTS.md,
  },
  videTexte: {
    fontSize: POLICES.taille.lg,
    color: COULEURS.text2,
    fontWeight: POLICES.poids.semibold,
  },
  ajouterBtn: {
    backgroundColor: COULEURS.accent,
    paddingHorizontal: ESPACEMENTS.lg,
    paddingVertical: ESPACEMENTS.sm + 2,
    borderRadius: RAYONS.full,
  },
  ajouterTexte: {
    color: '#fff',
    fontWeight: POLICES.poids.semibold,
    fontSize: POLICES.taille.sm,
  },
})
