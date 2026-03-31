import { Router } from 'express'
import { getAllStoredJobs } from '../services/jobDiscovery'
import { loadProfile } from '../services/profileService'
import { runMatchingPipeline, scoreJob } from '../services/matchingEngine'
import { computeMatchFromSkills } from '../services/matcher'
import type { Job } from '../types'

const router = Router()

// Inline fallback pool — transport/logistics focus + autres secteurs
const FALLBACK_JOBS: Job[] = [
  // ── Transport premium ────────────────────────────────────────────────────────
  { id: 'mock_1',  source: 'mock', title: 'Chauffeur VTC',                      company: 'Uber',            location: 'Paris (75)',              description: 'Conduite de passagers en VTC sur Paris et Île-de-France. Permis B exigé, bonne présentation, ponctualité. Horaires flexibles, revenus selon disponibilité. Application fournie, aucun investissement initial.',                                        salary: '1 800 – 2 800 €/mois', type: 'Freelance', remote: false, tags: ['Chauffeur', 'VTC', 'Permis B', 'Conduite', 'Relation client', 'Autonomie', 'Ponctualité'],                               url: 'https://www.uber.com/fr/fr/drive/', logo: 'U', postedAt: 'Aujourd\'hui',     fetchedAt: new Date().toISOString(), matchScore: 0 },
  { id: 'mock_2',  source: 'mock', title: 'Chauffeur Livreur Colis',             company: 'Chronopost',      location: 'Seine-Saint-Denis (93)',   description: 'Livraison de colis en tournée journalière sur un secteur géographique défini. Permis B requis (2 ans minimum), manutention légère, sens de l\'organisation, ponctualité irréprochable. Véhicule fourni.',                               salary: '1 900 – 2 200 €/mois', type: 'CDI',       remote: false, tags: ['Chauffeur-livreur', 'Livraison', 'Permis B', 'Manutention', 'Tournées', 'Ponctualité', 'Organisation'],      url: 'https://www.chronopost.fr/', logo: 'C', postedAt: 'il y a 1 jour',     fetchedAt: new Date().toISOString(), matchScore: 0 },
  { id: 'mock_3',  source: 'mock', title: 'Chauffeur Taxi Paris',                company: 'G7 Taxi',         location: 'Paris (75)',              description: 'Chauffeur de taxi professionnel en région parisienne. Carte professionnelle de taxi exigée (ou en cours d\'obtention). Autonomie, ponctualité et excellent relationnel client indispensables. Véhicule récent mis à disposition.',         salary: '2 200 – 3 200 €/mois', type: 'CDI',       remote: false, tags: ['Chauffeur', 'Taxi', 'Permis B', 'Conduite', 'Ponctualité', 'Autonomie', 'Relation client', 'Service client'], url: 'https://www.g7.fr/', logo: 'G', postedAt: 'il y a 2 jours',    fetchedAt: new Date().toISOString(), matchScore: 0 },
  { id: 'mock_4',  source: 'mock', title: 'Chauffeur Livreur Express B2B',       company: 'DHL Express',     location: 'Hauts-de-Seine (92)',      description: 'Livraisons express B2B dans Paris et première couronne. Véhicule utilitaire fourni. Organisation rigoureuse des tournées, sens du service client. Expérience livraison ou logistique souhaitée.',                                          salary: '2 100 – 2 500 €/mois', type: 'CDI',       remote: false, tags: ['Livraison', 'Logistique', 'Transport', 'Permis B', 'Organisation', 'Relation client', 'Ponctualité'],        url: 'https://www.dhl.com/fr/', logo: 'D', postedAt: 'il y a 3 jours',    fetchedAt: new Date().toISOString(), matchScore: 0 },
  { id: 'mock_9',  source: 'mock', title: 'Conducteur de Bus',                   company: 'RATP',            location: 'Paris Île-de-France',     description: 'Conduite de bus sur lignes régulières RATP. Permis D requis ou formation prise en charge. Sens du service public, ponctualité et maîtrise de la sécurité primordiales. Salaire fixe + primes.',                                         salary: '2 200 – 2 700 €/mois', type: 'CDI',       remote: false, tags: ['Conduite', 'Transport', 'Permis B', 'Ponctualité', 'Service client', 'Sécurité', 'Autonomie'],              url: 'https://www.ratp.fr/carrieres', logo: 'R', postedAt: 'il y a 1 jour', fetchedAt: new Date().toISOString(), matchScore: 0 },
  { id: 'mock_11', source: 'mock', title: 'Chauffeur VTC Haut de Gamme',         company: 'Blacklane',       location: 'Paris (75)',              description: 'Service de transport premium pour clientèle internationale. Permis B + 3 ans, véhicule récent (berline ou SUV), présentation impeccable, maîtrise de l\'anglais appréciée. Réservations depuis l\'appli.',                              salary: '2 500 – 3 500 €/mois', type: 'CDI',       remote: false, tags: ['Chauffeur', 'VTC', 'Permis B', 'Conduite', 'Service client', 'Ponctualité', 'Relation client'],             url: 'https://www.blacklane.com/fr/', logo: 'B', postedAt: 'Aujourd\'hui',  fetchedAt: new Date().toISOString(), matchScore: 0 },
  { id: 'mock_12', source: 'mock', title: 'Livreur Restauration (moto/vélo)',    company: 'Uber Eats',       location: 'Paris (75)',              description: 'Livraison de repas à domicile. Flexible, autonome, disponible surtout midi et soir. Deux-roues ou vélo cargo. Vous gérez vos horaires librement. Paiement hebdomadaire.',                                                                   salary: '1 200 – 2 000 €/mois', type: 'Freelance', remote: false, tags: ['Livraison', 'Conduite', 'Autonomie', 'Organisation', 'Transport', 'Relation client'],                              url: 'https://www.ubereats.com/fr/deliver', logo: 'U', postedAt: 'Aujourd\'hui', fetchedAt: new Date().toISOString(), matchScore: 0 },
  { id: 'mock_13', source: 'mock', title: 'Chauffeur de Car Touristique',        company: 'Transdev',        location: 'Val-de-Marne (94)',       description: 'Transport de groupes touristiques en région parisienne et grandes distances. Permis D + FIMO voyageurs. Présentation soignée, sens du contact. Expérience car appréciée.',                                                             salary: '2 300 – 2 800 €/mois', type: 'CDI',       remote: false, tags: ['Conduite', 'Transport', 'Permis B', 'Tournées', 'Service client', 'Ponctualité', 'Autonomie'],               url: 'https://www.transdev.com/fr/carrieres/', logo: 'T', postedAt: 'il y a 2 jours', fetchedAt: new Date().toISOString(), matchScore: 0 },
  { id: 'mock_14', source: 'mock', title: 'Agent de Transit / Logistique',       company: 'Geodis',          location: 'Roissy-CDG (95)',         description: 'Gestion des flux de marchandises, suivi des expéditions, coordination avec les transporteurs. Organisation, rigueur et maîtrise des outils logistiques requises. Expérience transport/logistique souhaitée.',                               salary: '2 000 – 2 500 €/mois', type: 'CDI',       remote: false, tags: ['Logistique', 'Transport', 'Gestion', 'Organisation', 'Manutention', 'Service client'],                          url: 'https://www.geodis.com/fr/carrieres', logo: 'G', postedAt: 'il y a 4 jours', fetchedAt: new Date().toISOString(), matchScore: 0 },
  { id: 'mock_15', source: 'mock', title: 'Chauffeur SPL Longue Distance',       company: 'XPO Logistics',   location: 'Île-de-France',           description: 'Conduite de semi-remorque sur lignes nationales. Permis CE + FIMO marchandises. Autonomie, rigueur et respect des délais essentiels. Découchés possibles.',                                                                           salary: '2 600 – 3 200 €/mois', type: 'CDI',       remote: false, tags: ['Conduite', 'Transport', 'Permis B', 'Logistique', 'Autonomie', 'Organisation', 'Tournées'],                   url: 'https://jobs.xpo.com/fr/', logo: 'X', postedAt: 'il y a 1 jour',     fetchedAt: new Date().toISOString(), matchScore: 0 },
  { id: 'mock_16', source: 'mock', title: 'Livreur Colis Dernier Kilomètre',     company: 'La Poste',        location: 'Paris (75)',              description: 'Distribution quotidienne de courrier et colis dans un secteur défini. Permis B, ponctualité, capacité à organiser sa tournée. Poste physique avec port de charges. CDI.',                                                             salary: '1 850 – 2 100 €/mois', type: 'CDI',       remote: false, tags: ['Livraison', 'Tournées', 'Permis B', 'Organisation', 'Ponctualité', 'Manutention', 'Service client'],            url: 'https://recrute.laposte.fr/', logo: 'L', postedAt: 'il y a 3 jours',  fetchedAt: new Date().toISOString(), matchScore: 0 },
  { id: 'mock_17', source: 'mock', title: 'Conducteur Transport Sanitaire',      company: 'Ambulances Île-de-France', location: 'Paris (75)',    description: 'Transport de patients en véhicule sanitaire léger (VSL). Permis B + DEA ou formation prise en charge. Empathie, ponctualité, discrétion et sens du service indispensables.',                                                         salary: '1 900 – 2 300 €/mois', type: 'CDI',       remote: false, tags: ['Conduite', 'Transport', 'Permis B', 'Service client', 'Ponctualité', 'Autonomie', 'Relation client'],            url: 'https://www.franceemploi.fr/', logo: 'A', postedAt: 'il y a 2 jours', fetchedAt: new Date().toISOString(), matchScore: 0 },
  // ── Logistique entrepôt ──────────────────────────────────────────────────────
  { id: 'mock_10', source: 'mock', title: 'Agent Logistique Entrepôt',           company: 'Amazon',          location: 'Brétigny-sur-Orge (91)',  description: 'Gestion des stocks, préparation de commandes, manutention légère. Organisation et rigueur requises. Expérience logistique appréciée. Horaires 2×8 ou nuit.',                                                                          salary: '1 900 – 2 300 €/mois', type: 'CDI',       remote: false, tags: ['Logistique', 'Manutention', 'Organisation', 'Transport', 'Gestion', 'Ponctualité'],                              url: 'https://www.amazon.jobs/fr/', logo: 'A', postedAt: 'il y a 2 jours', fetchedAt: new Date().toISOString(), matchScore: 0 },
  { id: 'mock_18', source: 'mock', title: 'Préparateur de Commandes',            company: 'STEF',            location: 'Rungis (94)',             description: 'Préparation de commandes alimentaires sous température dirigée. Permis CACES souhaité. Rigueur, rapidité et esprit d\'équipe. Poste en entrepôt frigorifique.',                                                                         salary: '1 800 – 2 100 €/mois', type: 'CDI',       remote: false, tags: ['Logistique', 'Manutention', 'Organisation', 'Transport', 'Gestion'],                                              url: 'https://www.stef.com/fr/carrieres', logo: 'S', postedAt: 'il y a 5 jours', fetchedAt: new Date().toISOString(), matchScore: 0 },
  // ── Autres secteurs (pour diversité) ─────────────────────────────────────────
  { id: 'mock_7',  source: 'mock', title: 'Comptable Général',                   company: 'BNP Paribas',     location: 'La Défense (92)',         description: 'Gestion comptable, clôtures mensuelles, déclarations fiscales. Maîtrise Sage et Excel requise. Rigueur et organisation indispensables. BTS Comptabilité apprécié.',                                                                   salary: '38 000 – 48 000 €/an', type: 'CDI',       remote: false, tags: ['Comptabilité', 'Sage', 'Gestion', 'Excel', 'Organisation', 'Finance'],                                            url: 'https://careers.bnpparibas.com/', logo: 'B', postedAt: 'il y a 4 jours', fetchedAt: new Date().toISOString(), matchScore: 0 },
  { id: 'mock_5',  source: 'mock', title: 'Développeur React Senior',            company: 'Qonto',           location: 'Paris (75)',              description: 'Rejoignez notre équipe frontend. React, TypeScript, Node.js requis. 5 ans d\'expérience minimum. Travail en Agile.',                                                                                                                   salary: '60 000 – 75 000 €/an', type: 'CDI',       remote: true,  tags: ['React', 'TypeScript', 'Node.js', 'Git', 'Agile', 'JavaScript'],                                                         url: 'https://jobs.qonto.com/', logo: 'Q', postedAt: 'il y a 1 jour',     fetchedAt: new Date().toISOString(), matchScore: 0 },
]

// GET /api/jobs/matched — full matching pipeline using saved server profile
// Returns jobs categorized: excellent / bon / faible
router.get('/matched', (req, res) => {
  const profile = loadProfile()
  const stored = getAllStoredJobs()
  const jobs = stored.length > 0 ? stored : FALLBACK_JOBS

  if (!profile) {
    // No profile yet — return unscored jobs with neutral score
    return res.json({
      hasProfile: false,
      excellent: [],
      bon: jobs.slice(0, 5).map(j => ({ ...j, matchScore: 50, matchCategory: 'bon', matchedSkills: [], missingSkills: j.tags, matchReason: 'Chargez votre CV pour voir votre score de compatibilité.', scoreBreakdown: { skills: 0, titleFit: 0, seniority: 10, bonus: 5 } })),
      faible: [],
      total: jobs.length,
      profileName: null,
      skillsUsed: [],
      scoredAt: new Date().toISOString(),
    })
  }

  const result = runMatchingPipeline(jobs, profile)
  return res.json({ hasProfile: true, ...result })
})

// GET /api/jobs?skills=... — simple scoring from query param (legacy/fallback)
router.get('/', (req, res) => {
  const skillsParam = req.query.skills as string | undefined
  const remoteOnly = req.query.remote === 'true'
  const minScore = parseInt(req.query.minScore as string) || 0
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)

  const userSkills = skillsParam ? skillsParam.split(',').map(s => s.trim()).filter(Boolean) : []

  // Prefer server profile if available
  const profile = loadProfile()
  const stored = getAllStoredJobs()
  let jobs = stored.length > 0 ? stored : FALLBACK_JOBS

  if (profile) {
    // Use full matching engine
    jobs = jobs.map(job => {
      const scored = scoreJob(job, profile)
      return {
        ...scored,
        matchedSkills: scored.matchedSkills,
        missingSkills: scored.missingSkills,
      }
    })
  } else if (userSkills.length > 0) {
    // Fallback: simple skills scoring
    jobs = jobs.map(job => ({
      ...job,
      matchScore: computeMatchFromSkills(userSkills, job.tags),
      matchedSkills: job.tags.filter(t => userSkills.some(s => t.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(t.toLowerCase()))),
      missingSkills: job.tags.filter(t => !userSkills.some(s => t.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(t.toLowerCase()))),
    }))
  } else {
    jobs = jobs.map(j => ({ ...j, matchScore: 50, matchedSkills: [], missingSkills: j.tags }))
  }

  if (remoteOnly) jobs = jobs.filter(j => j.remote)
  if (minScore > 0) jobs = jobs.filter(j => j.matchScore >= minScore)
  jobs.sort((a, b) => b.matchScore - a.matchScore)

  return res.json(jobs.slice(0, limit))
})

// GET /api/jobs/:id
router.get('/:id', (req, res) => {
  const stored = getAllStoredJobs()
  const pool = stored.length > 0 ? stored : FALLBACK_JOBS
  const job = pool.find(j => j.id === req.params.id)
  if (!job) return res.status(404).json({ error: 'Offre non trouvée.' })

  const profile = loadProfile()
  if (profile) {
    const scored = scoreJob(job, profile)
    return res.json(scored)
  }
  return res.json(job)
})

export default router
