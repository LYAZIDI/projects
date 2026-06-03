// ─── Thème global — dark mode ──────────────────────────────────────────────────

export const COULEURS = {
  // Arrière-plans
  bg: '#0F0F1A',
  bg2: '#151525',
  card: '#1C1C30',
  cardBorder: '#252540',

  // Texte
  text: '#F0F0FF',
  text2: '#8080B0',
  text3: '#4A4A80',

  // Accent principal
  accent: '#6C63FF',
  accentLight: 'rgba(108,99,255,0.15)',
  accentDark: '#4A44CC',

  // États
  success: '#00D68F',
  danger: '#FF4D6A',
  warning: '#FFB302',
  info: '#00B4D8',

  // Séparateur
  border: '#202038',
} as const

export const ESPACEMENTS = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const RAYONS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const

export const POLICES = {
  taille: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    titre: 34,
  },
  poids: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
} as const

// Couleurs des catégories (palette harmonieuse)
export const PALETTE_CATEGORIES = [
  '#6C63FF', // violet
  '#FF6B6B', // rouge corail
  '#4ECDC4', // turquoise
  '#FFE66D', // jaune
  '#A8E6CF', // vert menthe
  '#FF8B94', // rose
  '#88D8B0', // vert clair
  '#FFAAA5', // pêche
  '#B8B8FF', // lavande
  '#FFD93D', // orange doux
  '#6BCB77', // vert
  '#4D96FF', // bleu
] as const
