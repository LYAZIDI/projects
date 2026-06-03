import { v4 as uuidv4 } from 'uuid'
import { runAnalyseProduit } from '../agents/agent1_analyseProduit'
import { runAnalyseMarche } from '../agents/agent2_analyseMarche'
import { runAvatarClient } from '../agents/agent3_avatarClient'
import { runStrategieMarketing } from '../agents/agent4_strategie'
import { runCreationOffre } from '../agents/agent5_offre'
import { runPageProduit } from '../agents/agent6_page'
import { runCampagnesPub } from '../agents/agent7_pubs'
import { runPlanContenu } from '../agents/agent8_contenu'
import { runScoreMaster } from '../agents/agent9_master'
import type { ProduitInput, ResultatPipeline } from '../agents/types'

export type EtapePipeline = {
  etape: number
  total: number
  nom: string
  statut: 'en_cours' | 'termine' | 'erreur'
  donnees?: unknown
}

export async function lancerPipeline(
  input: ProduitInput,
  onProgres: (etape: EtapePipeline) => void
): Promise<ResultatPipeline> {
  const total = 9

  const notifier = (etape: number, nom: string, statut: EtapePipeline['statut'], donnees?: unknown) => {
    onProgres({ etape, total, nom, statut, donnees })
  }

  // Agent 1 — Analyse Produit
  notifier(1, 'Analyse Produit', 'en_cours')
  const produit = await runAnalyseProduit(input)
  notifier(1, 'Analyse Produit', 'termine', produit)

  // Agent 2 — Analyse Marché FR
  notifier(2, 'Analyse Marché FR', 'en_cours')
  const marche = await runAnalyseMarche(produit)
  notifier(2, 'Analyse Marché FR', 'termine', marche)

  // Agent 3 — Avatar Client
  notifier(3, 'Avatar Client', 'en_cours')
  const avatar = await runAvatarClient(produit, marche)
  notifier(3, 'Avatar Client', 'termine', avatar)

  // Agent 4 — Stratégie Marketing
  notifier(4, 'Stratégie Marketing', 'en_cours')
  const strategie = await runStrategieMarketing(produit, marche, avatar)
  notifier(4, 'Stratégie Marketing', 'termine', strategie)

  // Agent 5 — Création Offre
  notifier(5, "Création d'Offre", 'en_cours')
  const offre = await runCreationOffre(produit, avatar, strategie)
  notifier(5, "Création d'Offre", 'termine', offre)

  // Agent 6 — Page Produit
  notifier(6, 'Page Produit FR', 'en_cours')
  const page = await runPageProduit(produit, avatar, offre)
  notifier(6, 'Page Produit FR', 'termine', page)

  // Agent 7 — Publicités
  notifier(7, 'Campagnes Pub', 'en_cours')
  const pubs = await runCampagnesPub(produit, avatar, offre)
  notifier(7, 'Campagnes Pub', 'termine', pubs)

  // Agent 8 — Contenu
  notifier(8, 'Plan Contenu', 'en_cours')
  const contenu = await runPlanContenu(produit, avatar)
  notifier(8, 'Plan Contenu', 'termine', contenu)

  // Agent 9 — Master Score
  notifier(9, 'Scoring Master', 'en_cours')
  const score = await runScoreMaster(produit, marche, avatar, strategie, offre)
  notifier(9, 'Scoring Master', 'termine', score)

  return {
    id: uuidv4(),
    input,
    cree_le: new Date().toISOString(),
    produit,
    marche,
    avatar,
    strategie,
    offre,
    page,
    pubs,
    contenu,
    score,
  }
}
