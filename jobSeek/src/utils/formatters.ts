export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatDateCourte(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function formatRelative(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diff < 3600) return 'il y a moins d\'1h'
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)}j`
  if (diff < 2592000) return `il y a ${Math.floor(diff / 604800)} sem.`
  return formatDateCourte(dateStr)
}

export function scoreLabel(score: number): 'excellent' | 'bon' | 'faible' {
  if (score >= 80) return 'excellent'
  if (score >= 50) return 'bon'
  return 'faible'
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    to_apply: 'À postuler',
    applied: 'Postulé',
    interview: 'Entretien',
    offer: 'Offre',
    rejected: 'Refus',
  }
  return labels[status] ?? status
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    to_apply: '#6366F1',
    applied: '#F59E0B',
    interview: '#10B981',
    offer: '#06B6D4',
    rejected: '#EF4444',
  }
  return colors[status] ?? '#606080'
}

export function prenomDe(name: string): string {
  return name.split(' ')[0] ?? name
}

export function initiales(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}
