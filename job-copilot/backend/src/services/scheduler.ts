/**
 * Scheduler — lance la découverte d'offres toutes les 4h via node-cron
 * Crée aussi des notifications pour les nouveaux jobs trouvés
 */
import { runDiscoveryPipeline } from './jobDiscovery'
import { createNotification } from './notificationService'

const FOUR_HOURS = 4 * 60 * 60 * 1000

let isRunning = false
let intervalHandle: ReturnType<typeof setInterval> | null = null
let currentSkills: string[] = []

async function runDiscovery(skills: string[]) {
  if (isRunning) {
    console.log('[Scheduler] Discovery already running, skipping')
    return
  }
  isRunning = true
  try {
    const { added } = await runDiscoveryPipeline(skills)
    if (added > 0) {
      createNotification({
        type: 'new_job',
        title: `${added} nouvelle${added > 1 ? 's' : ''} offre${added > 1 ? 's' : ''} trouvée${added > 1 ? 's' : ''}`,
        body: 'De nouvelles offres correspondent à votre profil. Consultez-les maintenant.',
        link: '/jobs',
      })
    }
  } finally {
    isRunning = false
  }
}

export function startScheduler(initialSkills: string[] = []) {
  currentSkills = initialSkills

  // Run immediately on start
  runDiscovery(currentSkills)

  // Then every 4 hours
  intervalHandle = setInterval(() => {
    console.log('[Scheduler] Tick — running discovery')
    runDiscovery(currentSkills)
  }, FOUR_HOURS)

  console.log('[Scheduler] Started — discovery every 4h')
}

export function updateSchedulerSkills(skills: string[]) {
  currentSkills = skills
}

export function stopScheduler() {
  if (intervalHandle) { clearInterval(intervalHandle); intervalHandle = null }
}

export function triggerManualDiscovery(skills?: string[]): Promise<{ added: number; total: number; sources: string[] }> {
  return runDiscoveryPipeline(skills ?? currentSkills)
}
