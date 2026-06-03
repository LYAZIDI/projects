import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Polyline, Line, Text as SvgText, Defs, LinearGradient, Stop, Rect } from 'react-native-svg'
import { formatMAD, formatMoisAnnee } from '../utils/formatters'
import { COULEURS, POLICES, ESPACEMENTS } from '../constants/theme'

interface Point {
  mois: string   // YYYY-MM
  total: number
}

interface LineChartViewProps {
  donnees: Point[]
  largeur?: number
  hauteur?: number
}

export function LineChartView({ donnees, largeur = 320, hauteur = 150 }: LineChartViewProps) {
  if (donnees.length < 2) {
    return (
      <View style={[styles.container, { height: hauteur }]}>
        <Text style={styles.videTexte}>Données insuffisantes</Text>
      </View>
    )
  }

  // Trier du plus vieux au plus récent
  const sorted = [...donnees].sort((a, b) => a.mois.localeCompare(b.mois))
  const valeurs = sorted.map(d => d.total)
  const max = Math.max(...valeurs, 1)
  const min = 0

  const paddingG = 4
  const paddingD = 8
  const paddingH = 16
  const paddingB = 24
  const largeurGraph = largeur - paddingG - paddingD
  const hauteurGraph = hauteur - paddingH - paddingB

  const xFor = (i: number) => paddingG + (i / (sorted.length - 1)) * largeurGraph
  const yFor = (v: number) => paddingH + (1 - (v - min) / (max - min)) * hauteurGraph

  const points = sorted.map((d, i) => `${xFor(i)},${yFor(d.total)}`).join(' ')

  return (
    <View style={styles.container}>
      <Svg width={largeur} height={hauteur}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={COULEURS.accent} stopOpacity="0.3" />
            <Stop offset="1" stopColor={COULEURS.accent} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Ligne de base */}
        <Line
          x1={paddingG} y1={paddingH + hauteurGraph}
          x2={largeur - paddingD} y2={paddingH + hauteurGraph}
          stroke={COULEURS.border} strokeWidth={1}
        />

        {/* Courbe */}
        <Polyline
          points={points}
          fill="none"
          stroke={COULEURS.accent}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {sorted.map((d, i) => (
          <React.Fragment key={d.mois}>
            <Svg.Circle
              cx={xFor(i)} cy={yFor(d.total)}
              r={4} fill={COULEURS.accent}
            />
            {/* Label mois */}
            <SvgText
              x={xFor(i)} y={hauteur - 4}
              textAnchor="middle"
              fontSize={9}
              fill={COULEURS.text3}
            >
              {d.mois.slice(5, 7)}/{d.mois.slice(2, 4)}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videTexte: {
    color: COULEURS.text3,
    fontSize: POLICES.taille.sm,
  },
})
