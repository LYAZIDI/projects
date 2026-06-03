import { format, formatDistanceToNow, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Devise MAD ───────────────────────────────────────────────────────────────

export function formatMAD(montant: number, compact = false): string {
  if (compact && montant >= 1000) {
    return `${(montant / 1000).toFixed(1)}k DH`
  }
  return `${montant.toLocaleString('fr-MA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} DH`
}

export function parseMontant(texte: string): number {
  const nettoye = texte.replace(/[^0-9.,]/g, '').replace(',', '.')
  const valeur = parseFloat(nettoye)
  return isNaN(valeur) ? 0 : valeur
}

// ─── Dates ────────────────────────────────────────────────────────────────────

export function formatDateAffichage(dateIso: string): string {
  try {
    return format(parseISO(dateIso), 'dd MMM yyyy', { locale: fr })
  } catch {
    return dateIso
  }
}

export function formatDateCourte(dateIso: string): string {
  try {
    return format(parseISO(dateIso), 'dd/MM', { locale: fr })
  } catch {
    return dateIso
  }
}

export function formatDateRelative(dateIso: string): string {
  try {
    return formatDistanceToNow(parseISO(dateIso), { locale: fr, addSuffix: true })
  } catch {
    return dateIso
  }
}

export function formatMoisAnnee(moisStr: string): string {
  // moisStr = YYYY-MM
  try {
    const date = parseISO(`${moisStr}-01`)
    return format(date, 'MMMM yyyy', { locale: fr })
  } catch {
    return moisStr
  }
}

export function moisCourant(): string {
  return format(new Date(), 'yyyy-MM')
}

export function moisPrecedent(mois: string, delta = 1): string {
  const date = parseISO(`${mois}-01`)
  date.setMonth(date.getMonth() - delta)
  return format(date, 'yyyy-MM')
}

export function moisSuivant(mois: string): string {
  const date = parseISO(`${mois}-01`)
  date.setMonth(date.getMonth() + 1)
  return format(date, 'yyyy-MM')
}

export function dateAujourdHui(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

// ─── Pourcentages / barres ────────────────────────────────────────────────────

export function calculerPourcentage(valeur: number, total: number): number {
  if (total === 0) return 0
  return Math.min(100, Math.round((valeur / total) * 100))
}

export function joursRestantsMois(): number {
  const maintenant = new Date()
  const finMois = endOfMonth(maintenant)
  const diff = finMois.getTime() - maintenant.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function joursDansMois(): number {
  const maintenant = new Date()
  const debutMois = startOfMonth(maintenant)
  const finMois = endOfMonth(maintenant)
  const diff = finMois.getTime() - debutMois.getTime()
  return Math.round(diff / (1000 * 60 * 60 * 24)) + 1
}

// ─── Couleur selon le niveau de budget ───────────────────────────────────────

export function couleurBudget(pourcentage: number): string {
  if (pourcentage >= 100) return '#FF4D6A'   // dépassé — rouge
  if (pourcentage >= 80) return '#FFB302'    // proche — orange
  return '#00D68F'                            // ok — vert
}
