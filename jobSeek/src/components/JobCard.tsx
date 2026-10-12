import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COULEURS, POLICES, ESPACEMENTS, RAYONS } from '../constants/theme'
import { Badge } from './ui/Badge'
import { scoreLabel, formatRelative } from '../utils/formatters'
import type { Job } from '../types'

interface JobCardProps {
  job: Job
  favori?: boolean
  onPress: () => void
  onFavori?: () => void
  compact?: boolean
}

export function JobCard({ job, favori = false, onPress, onFavori, compact = false }: JobCardProps) {
  const score = job.matchScore ?? 0
  const niveau = scoreLabel(score)
  const scoreColor = niveau === 'excellent' ? COULEURS.success : niveau === 'bon' ? COULEURS.warning : COULEURS.danger

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoLettre}>
            {job.company[0]?.toUpperCase()}
          </Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.titre} numberOfLines={1}>{job.title}</Text>
          <Text style={styles.entreprise} numberOfLines={1}>{job.company}</Text>
        </View>

        <View style={styles.scoreCol}>
          <View style={[styles.scoreBadge, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreTexte, { color: scoreColor }]}>{score}%</Text>
          </View>
          {onFavori && (
            <TouchableOpacity onPress={onFavori} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons
                name={favori ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={favori ? COULEURS.accent : COULEURS.text3}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={13} color={COULEURS.text3} />
        <Text style={styles.meta}>{job.location}</Text>
        {job.remote && (
          <>
            <View style={styles.dot} />
            <Text style={[styles.meta, { color: COULEURS.success }]}>Remote</Text>
          </>
        )}
        <View style={styles.dot} />
        <Text style={styles.meta}>{job.type}</Text>
        {job.salary && !compact && (
          <>
            <View style={styles.dot} />
            <Text style={styles.meta} numberOfLines={1}>{job.salary}</Text>
          </>
        )}
      </View>

      {!compact && (
        <View style={styles.tags}>
          {job.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} label={tag} small />
          ))}
          {job.tags.length > 4 && (
            <Text style={styles.plusTags}>+{job.tags.length - 4}</Text>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <Badge
          label={niveau === 'excellent' ? 'Excellent match' : niveau === 'bon' ? 'Bon match' : 'Match faible'}
          variant={niveau}
          small
        />
        <Text style={styles.date}>{formatRelative(job.postedAt)}</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COULEURS.card,
    borderRadius: RAYONS.lg,
    borderWidth: 1,
    borderColor: COULEURS.cardBorder,
    padding: ESPACEMENTS.md,
    gap: ESPACEMENTS.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ESPACEMENTS.sm,
  },
  logoContainer: {
    width: 42,
    height: 42,
    borderRadius: RAYONS.md,
    backgroundColor: COULEURS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoLettre: {
    fontSize: POLICES.taille.lg,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.accent,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  titre: {
    fontSize: POLICES.taille.md,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.text,
  },
  entreprise: {
    fontSize: POLICES.taille.sm,
    color: COULEURS.text2,
  },
  scoreCol: {
    alignItems: 'flex-end',
    gap: ESPACEMENTS.xs,
    flexShrink: 0,
  },
  scoreBadge: {
    borderWidth: 1.5,
    borderRadius: RAYONS.full,
    paddingHorizontal: ESPACEMENTS.sm,
    paddingVertical: 2,
  },
  scoreTexte: {
    fontSize: POLICES.taille.sm,
    fontWeight: POLICES.poids.bold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.xs,
    flexWrap: 'wrap',
  },
  meta: {
    fontSize: POLICES.taille.xs,
    color: COULEURS.text3,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 99,
    backgroundColor: COULEURS.text3,
  },
  tags: {
    flexDirection: 'row',
    gap: ESPACEMENTS.xs,
    flexWrap: 'wrap',
  },
  plusTags: {
    fontSize: POLICES.taille.xs,
    color: COULEURS.text3,
    alignSelf: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COULEURS.border,
    paddingTop: ESPACEMENTS.sm,
  },
  date: {
    fontSize: POLICES.taille.xs,
    color: COULEURS.text3,
  },
})
