import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Path, Circle, G } from 'react-native-svg'
import type { StatCategorie } from '../types'
import { formatMAD } from '../utils/formatters'
import { COULEURS, POLICES, ESPACEMENTS } from '../constants/theme'

interface PieChartViewProps {
  stats: StatCategorie[]
  taille?: number
}

function degreToRad(deg: number) {
  return (deg * Math.PI) / 180
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = degreToRad(startAngle - 90)
  const end = degreToRad(endAngle - 90)
  const x1 = cx + r * Math.cos(start)
  const y1 = cy + r * Math.sin(start)
  const x2 = cx + r * Math.cos(end)
  const y2 = cy + r * Math.sin(end)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
}

export function PieChartView({ stats, taille = 180 }: PieChartViewProps) {
  const cx = taille / 2
  const cy = taille / 2
  const r = taille / 2 - 8
  const rInterieur = r * 0.55  // donut

  if (stats.length === 0) {
    return (
      <View style={[styles.container, { height: taille }]}>
        <View style={styles.vide}>
          <Text style={styles.videTexte}>Aucune dépense</Text>
        </View>
      </View>
    )
  }

  let angleDebut = 0
  const segments = stats.slice(0, 8).map(s => {
    const angle = (s.pourcentage / 100) * 360
    const segment = { ...s, angleDebut, angleFin: angleDebut + angle }
    angleDebut += angle
    return segment
  })

  const total = stats.reduce((s, d) => s + d.total, 0)

  return (
    <View style={styles.container}>
      <View style={styles.graphContainer}>
        <Svg width={taille} height={taille}>
          <G>
            {segments.map((seg, i) => (
              <Path
                key={seg.categorie.id}
                d={arcPath(cx, cy, r, seg.angleDebut, seg.angleFin)}
                fill={seg.categorie.couleur}
                opacity={0.9}
              />
            ))}
            {/* Cercle central (donut) */}
            <Circle cx={cx} cy={cy} r={rInterieur} fill={COULEURS.card} />
          </G>
        </Svg>
        {/* Texte centre */}
        <View style={[styles.centre, { width: rInterieur * 2, height: rInterieur * 2 }]}>
          <Text style={styles.centreTotal}>{formatMAD(total, true)}</Text>
          <Text style={styles.centreSub}>ce mois</Text>
        </View>
      </View>

      {/* Légende */}
      <View style={styles.legende}>
        {segments.map(seg => (
          <View key={seg.categorie.id} style={styles.legendeItem}>
            <View style={[styles.legendeDot, { backgroundColor: seg.categorie.couleur }]} />
            <Text style={styles.legendeNom} numberOfLines={1}>{seg.categorie.nom}</Text>
            <Text style={styles.legendePct}>{seg.pourcentage}%</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: ESPACEMENTS.md,
  },
  graphContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centre: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  centreTotal: {
    fontSize: POLICES.taille.lg,
    fontWeight: POLICES.poids.bold,
    color: COULEURS.text,
    letterSpacing: -0.5,
  },
  centreSub: {
    fontSize: POLICES.taille.xs,
    color: COULEURS.text2,
    marginTop: 2,
  },
  legende: {
    width: '100%',
    gap: 6,
  },
  legendeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.sm,
  },
  legendeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendeNom: {
    flex: 1,
    fontSize: POLICES.taille.sm,
    color: COULEURS.text2,
  },
  legendePct: {
    fontSize: POLICES.taille.sm,
    fontWeight: POLICES.poids.semibold,
    color: COULEURS.text,
  },
  vide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videTexte: {
    color: COULEURS.text3,
    fontSize: POLICES.taille.md,
  },
})
