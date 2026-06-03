import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ResultatPipeline } from '../types'
import styles from './Analyse.module.css'

type Onglet = 'apercu' | 'strategie' | 'contenu' | 'pubs'

type EtapePipeline = {
  etape: number
  total: number
  nom: string
  statut: 'en_cours' | 'termine' | 'erreur'
}

const NOMS_ETAPES = [
  'Analyse Produit',
  'Analyse Marché FR',
  'Avatar Client',
  'Stratégie Marketing',
  "Création d'Offre",
  'Page Produit FR',
  'Campagnes Pub',
  'Plan Contenu',
  'Scoring Master',
]

export default function Analyse() {
  const navigate = useNavigate()
  const [etapes, setEtapes] = useState<EtapePipeline[]>([])
  const [etapeCourante, setEtapeCourante] = useState<string>('')
  const [resultat, setResultat] = useState<ResultatPipeline | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [onglet, setOnglet] = useState<Onglet>('apercu')
  const [copie, setCopie] = useState<string | null>(null)
  const lanceDeja = useRef(false)

  useEffect(() => {
    if (lanceDeja.current) return
    lanceDeja.current = true
    lancerAnalyse()
  }, [])

  async function lancerAnalyse() {
    const mode = sessionStorage.getItem('paf_mode')
    if (!mode) { navigate('/'); return }

    const formData = new FormData()

    if (mode === 'image') {
      const b64 = sessionStorage.getItem('paf_image_b64')
      const type = sessionStorage.getItem('paf_image_type') || 'image/jpeg'
      const name = sessionStorage.getItem('paf_image_name') || 'image.jpg'
      if (!b64) { navigate('/'); return }
      const blob = await fetch(b64).then(r => r.blob())
      formData.append('image', new File([blob], name, { type }))
    } else {
      formData.append('nom', sessionStorage.getItem('paf_nom') || '')
      formData.append('description', sessionStorage.getItem('paf_description') || '')
      const url = sessionStorage.getItem('paf_url')
      if (url) formData.append('url', url)
      const prix = sessionStorage.getItem('paf_prix')
      if (prix) formData.append('prix', prix)
      const cat = sessionStorage.getItem('paf_categorie')
      if (cat) formData.append('categorie', cat)
    }

    const response = await fetch('/api/analyse/lancer', { method: 'POST', body: formData })
    if (!response.body) { setErreur('Connexion impossible'); return }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE messages are separated by double newline
      const messages = buffer.split('\n\n')
      buffer = messages.pop() || ''

      for (const msg of messages) {
        let evtName = 'message'
        let dataStr = ''
        for (const line of msg.split('\n')) {
          if (line.startsWith('event: ')) evtName = line.slice(7).trim()
          else if (line.startsWith('data: ')) dataStr = line.slice(6)
        }
        if (!dataStr) continue
        let data: unknown
        try { data = JSON.parse(dataStr) } catch { continue }

        if (evtName === 'progres') {
          const d = data as EtapePipeline
          setEtapeCourante(d.nom)
          setEtapes(prev => {
            const existing = prev.findIndex(e => e.etape === d.etape)
            if (existing >= 0) {
              const next = [...prev]
              next[existing] = d
              return next
            }
            return [...prev, d]
          })
        } else if (evtName === 'termine') {
          setResultat(data as ResultatPipeline)
          setEtapeCourante('')
        } else if (evtName === 'erreur') {
          setErreur((data as { message: string }).message)
        }
      }
    }
  }

  const copier = (texte: string, cle: string) => {
    navigator.clipboard.writeText(texte)
    setCopie(cle)
    setTimeout(() => setCopie(null), 2000)
  }

  const chargement = !resultat && !erreur

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.retour} onClick={() => navigate('/')}>← Retour</button>
        <div className={styles.logo}>⚡ Product Agent <span className={styles.logoFr}>FR</span></div>
        {resultat && (
          <div className={`${styles.verdict} ${styles[`verdict_${resultat.score.verdict.replace('é', 'e')}`]}`}>
            {resultat.score.indicateur} {resultat.score.decision}
          </div>
        )}
        {!resultat && <div />}
      </header>

      {/* Progression */}
      {chargement && (
        <div className={styles.progres}>
          <div className={styles.progresInner}>
            <div className={styles.progresTitre}>
              <div className={styles.spinner} />
              <span>Analyse en cours — {etapeCourante || 'Initialisation...'}</span>
            </div>
            <div className={styles.etapes}>
              {NOMS_ETAPES.map((nom, i) => {
                const etape = etapes.find(e => e.etape === i + 1)
                return (
                  <div key={nom} className={`${styles.etape} ${etape ? styles[`etape_${etape.statut}`] : ''}`}>
                    <div className={styles.etapeDot}>
                      {etape?.statut === 'termine' ? '✓' : etape?.statut === 'en_cours' ? '◉' : '○'}
                    </div>
                    <span>{nom}</span>
                  </div>
                )
              })}
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${(etapes.filter(e => e.statut === 'termine').length / 9) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Erreur */}
      {erreur && (
        <div className={styles.erreur}>
          <div className={styles.erreurIcon}>⚠️</div>
          <h2>Erreur d'analyse</h2>
          <p>{erreur}</p>
          <button className={styles.retourBtn} onClick={() => navigate('/')}>Recommencer</button>
        </div>
      )}

      {/* Résultats */}
      {resultat && (
        <div className={styles.resultats}>
          {/* Score Card */}
          <div className={styles.scoreCard}>
            <div className={styles.scoreGauche}>
              <div className={styles.scoreNom}>{resultat.produit.nom}</div>
              <div className={styles.scoreCategorie}>{resultat.produit.categorie}</div>
              <div className={styles.scorePrix}>
                Prix recommandé : <strong>{resultat.offre.prix_psychologique}€</strong>
                <s>{resultat.offre.prix_barre}€</s>
              </div>
            </div>
            <div className={styles.scoreDroite}>
              <div className={styles.scoreBig}>{resultat.score.score_global}/10</div>
              <div className={`${styles.scoreBadge} ${styles[`badge_${resultat.score.verdict.replace('é', 'e')}`]}`}>
                {resultat.score.indicateur} {resultat.score.verdict.toUpperCase()}
              </div>
              <div className={styles.scoreDecision}>{resultat.score.decision}</div>
            </div>
          </div>

          {/* Détail scores */}
          <div className={styles.detailScores}>
            {Object.entries(resultat.score.detail_scores).map(([cle, val]) => (
              <div key={cle} className={styles.scoreDetail}>
                <div className={styles.scoreDetailLabel}>{cle.replace(/_/g, ' ')}</div>
                <div className={styles.scoreDetailBar}>
                  <div className={styles.scoreDetailFill} style={{ width: `${val * 10}%`, background: val >= 7 ? 'var(--green)' : val >= 5 ? 'var(--yellow)' : 'var(--red)' }} />
                </div>
                <div className={styles.scoreDetailVal}>{val}/10</div>
              </div>
            ))}
          </div>

          {/* Onglets */}
          <div className={styles.onglets}>
            {([['apercu', '📊 Aperçu'], ['strategie', '🎯 Stratégie'], ['contenu', '📱 Contenu'], ['pubs', '📣 Publicités']] as [Onglet, string][]).map(([id, label]) => (
              <button
                key={id}
                className={`${styles.onglet} ${onglet === id ? styles.ongletActif : ''}`}
                onClick={() => setOnglet(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Contenu onglets */}
          <div className={styles.ongletContenu}>

            {/* APERÇU */}
            {onglet === 'apercu' && (
              <div className={styles.grid2}>
                {/* Produit */}
                <div className={styles.bloc}>
                  <h3 className={styles.blocTitre}>🛍️ Analyse Produit</h3>
                  <div className={styles.kv}>
                    <span>Bénéfice principal</span>
                    <strong>{resultat.produit.benefice_principal}</strong>
                  </div>
                  <div className={styles.kv}>
                    <span>Problème résolu</span>
                    <strong>{resultat.produit.probleme_resolu}</strong>
                  </div>
                  <div className={styles.kv}>
                    <span>Facteur WOW</span>
                    <strong>{resultat.produit.facteur_wow}</strong>
                  </div>
                  <div className={styles.kv}>
                    <span>Potentiel viral</span>
                    <strong className={resultat.produit.potentiel_viral === 'élevé' ? styles.vert : resultat.produit.potentiel_viral === 'moyen' ? styles.jaune : styles.rouge}>
                      {resultat.produit.potentiel_viral}
                    </strong>
                  </div>
                  <div className={styles.tags}>
                    {resultat.produit.caracteristiques_uniques.map(c => <span key={c} className={styles.tag}>{c}</span>)}
                  </div>
                </div>

                {/* Marché */}
                <div className={styles.bloc}>
                  <h3 className={styles.blocTitre}>📈 Marché FR</h3>
                  <div className={styles.kv}>
                    <span>Score demande</span>
                    <strong className={styles.accent}>{resultat.marche.score_demande}/100</strong>
                  </div>
                  <div className={styles.kv}>
                    <span>Tendance</span>
                    <strong>{resultat.marche.tendance}</strong>
                  </div>
                  <div className={styles.kv}>
                    <span>Concurrence</span>
                    <strong className={resultat.marche.niveau_concurrence === 'faible' ? styles.vert : resultat.marche.niveau_concurrence === 'moyen' ? styles.jaune : styles.rouge}>
                      {resultat.marche.niveau_concurrence}
                    </strong>
                  </div>
                  <div className={styles.kv}>
                    <span>Fenêtre opportunité</span>
                    <strong>{resultat.marche.fenetre_opportunite}</strong>
                  </div>
                  <div className={styles.kv}>
                    <span>Taille marché estimé</span>
                    <strong>{resultat.marche.taille_marche_estime}</strong>
                  </div>
                  <div className={styles.kv}>
                    <span>Recherches/mois</span>
                    <strong>{resultat.marche.recherches_mensuelles_estimees.toLocaleString('fr-FR')}</strong>
                  </div>
                </div>

                {/* Avatar */}
                <div className={styles.bloc}>
                  <h3 className={styles.blocTitre}>👤 Avatar Client — {resultat.avatar.prenom}</h3>
                  <div className={styles.kv}>
                    <span>Age</span>
                    <strong>{resultat.avatar.age.min} – {resultat.avatar.age.max} ans, {resultat.avatar.genre}</strong>
                  </div>
                  <div className={styles.kv}>
                    <span>Revenu</span>
                    <strong>{resultat.avatar.revenu}</strong>
                  </div>
                  <div className={styles.kv}>
                    <span>Localisation</span>
                    <strong>{resultat.avatar.localisation.join(', ')}</strong>
                  </div>
                  <div className={styles.kv}>
                    <span>Sensibilité prix</span>
                    <strong>{resultat.avatar.sensibilite_prix}</strong>
                  </div>
                  <div className={styles.sousSect}>Points de douleur</div>
                  <ul className={styles.liste}>
                    {resultat.avatar.points_douleur.map(p => <li key={p}>{p}</li>)}
                  </ul>
                  <div className={styles.sousSect}>Déclencheurs d'achat</div>
                  <ul className={styles.liste}>
                    {resultat.avatar.declencheurs_achat.map(d => <li key={d}>{d}</li>)}
                  </ul>
                </div>

                {/* Offre */}
                <div className={styles.bloc}>
                  <h3 className={styles.blocTitre}>🎁 Offre Commerciale</h3>
                  <div className={styles.offrePrix}>
                    <span className={styles.prixPsycho}>{resultat.offre.prix_psychologique}€</span>
                    <s className={styles.prixBarre}>{resultat.offre.prix_barre}€</s>
                  </div>
                  <div className={styles.kv}>
                    <span>Garantie</span>
                    <strong>{resultat.offre.garantie.duree} — {resultat.offre.garantie.type}</strong>
                  </div>
                  <div className={styles.kv}>
                    <span>Livraison</span>
                    <strong>{resultat.offre.livraison.delai} · {resultat.offre.livraison.gratuite_a_partir}</strong>
                  </div>
                  {resultat.offre.paiement_plusieurs_fois.disponible && (
                    <div className={styles.kv}>
                      <span>Paiement fractionné</span>
                      <strong>{resultat.offre.paiement_plusieurs_fois.options.join(' · ')}</strong>
                    </div>
                  )}
                  <div className={styles.tags}>
                    {resultat.offre.badge_confiance.map(b => <span key={b} className={styles.tagVert}>{b}</span>)}
                  </div>
                  <div className={styles.sousSect}>Urgence / Rareté</div>
                  <ul className={styles.liste}>
                    {resultat.offre.urgence_rarete.map(u => <li key={u}>{u}</li>)}
                  </ul>
                </div>

                {/* CA Estimé */}
                <div className={styles.bloc}>
                  <h3 className={styles.blocTitre}>💰 CA Estimé</h3>
                  <div className={styles.caGrid}>
                    <div className={styles.caMois}><div className={styles.caLabel}>Mois 1</div><div className={styles.caVal}>{resultat.score.chiffre_affaires_estime.mois_1}</div></div>
                    <div className={styles.caMois}><div className={styles.caLabel}>Mois 3</div><div className={styles.caVal}>{resultat.score.chiffre_affaires_estime.mois_3}</div></div>
                    <div className={styles.caMois}><div className={styles.caLabel}>Mois 6</div><div className={styles.caVal}>{resultat.score.chiffre_affaires_estime.mois_6}</div></div>
                  </div>
                  <div className={styles.kv}>
                    <span>ROAS estimé</span>
                    <strong className={styles.accent}>{resultat.strategie.roas_estime}</strong>
                  </div>
                  <div className={styles.kv}>
                    <span>Budget lancement</span>
                    <strong>{resultat.strategie.budget_lancement_recommande}</strong>
                  </div>
                  <div className={styles.kv}>
                    <span>Seuil rentabilité</span>
                    <strong>{resultat.score.seuil_rentabilite_unites} unités</strong>
                  </div>
                </div>

                {/* Conseil + Plan d'action */}
                <div className={styles.bloc}>
                  <h3 className={styles.blocTitre}>🚀 Plan d'action immédiat</h3>
                  <div className={styles.conseil}>{resultat.score.conseil_final}</div>
                  <div className={styles.actions}>
                    {resultat.score.plan_action_immediat.map(a => (
                      <div key={a.priorite} className={styles.action}>
                        <div className={styles.actionNum}>{a.priorite}</div>
                        <div className={styles.actionContent}>
                          <div className={styles.actionTexte}>{a.action}</div>
                          <div className={styles.actionMeta}>
                            <span className={`${styles.actionImpact} ${a.impact === 'élevé' ? styles.vert : a.impact === 'moyen' ? styles.jaune : ''}`}>{a.impact}</span>
                            <span>{a.delai}</span>
                            <span>{a.budget_estime}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STRATÉGIE */}
            {onglet === 'strategie' && (
              <div className={styles.grid2}>
                <div className={styles.bloc}>
                  <h3 className={styles.blocTitre}>🎯 Positionnement</h3>
                  <p className={styles.texte}>{resultat.strategie.positionnement}</p>
                  <div className={styles.pvuBox}>
                    <div className={styles.pvuLabel}>Proposition de Valeur Unique</div>
                    <div className={styles.pvuTexte}>"{resultat.strategie.proposition_valeur_unique}"</div>
                  </div>
                  <div className={styles.kv}>
                    <span>Stratégie prix</span>
                    <strong>{resultat.strategie.strategie_prix}</strong>
                  </div>
                </div>

                <div className={styles.bloc}>
                  <h3 className={styles.blocTitre}>📊 KPIs</h3>
                  {resultat.strategie.kpis.map(k => (
                    <div key={k.metrique} className={styles.kv}>
                      <span>{k.metrique}</span>
                      <strong className={styles.accent}>{k.objectif}</strong>
                    </div>
                  ))}
                </div>

                <div className={`${styles.bloc} ${styles.blocFull}`}>
                  <h3 className={styles.blocTitre}>🔄 Tunnel de Conversion</h3>
                  <div className={styles.tunnel}>
                    {resultat.strategie.tunnel_de_conversion.map((t, i) => (
                      <div key={i} className={styles.tunnelEtape}>
                        <div className={styles.tunnelNum}>{i + 1}</div>
                        <div className={styles.tunnelContent}>
                          <div className={styles.tunnelEtapeName}>{t.etape}</div>
                          <div className={styles.tunnelCanal}>{t.canal}</div>
                          <div className={styles.tunnelMsg}>{t.message_cle}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`${styles.bloc} ${styles.blocFull}`}>
                  <h3 className={styles.blocTitre}>📅 Phases de Lancement</h3>
                  <div className={styles.phases}>
                    {resultat.strategie.phases_lancement.map((p, i) => (
                      <div key={i} className={styles.phase}>
                        <div className={styles.phaseHeader}>
                          <div className={styles.phaseNom}>{p.phase}</div>
                          <div className={styles.phaseMeta}>
                            <span>{p.duree}</span>
                            <span className={styles.phaseBudget}>{p.budget}</span>
                          </div>
                        </div>
                        <div className={styles.phaseObjectif}>{p.objectif}</div>
                        <ul className={styles.liste}>
                          {p.actions.map(a => <li key={a}>{a}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`${styles.bloc} ${styles.blocFull}`}>
                  <h3 className={styles.blocTitre}>📡 Canaux Marketing</h3>
                  <div className={styles.canaux}>
                    {resultat.strategie.canaux.map(c => (
                      <div key={c.canal} className={styles.canal}>
                        <div className={styles.canalHeader}>
                          <div className={styles.canalNom}>{c.canal}</div>
                          <div className={styles.canalMeta}>
                            <span className={c.priorite === 'principal' ? styles.tagVert : styles.tag}>{c.priorite}</span>
                            <span className={styles.accent}>{c.budget_pourcent}% budget</span>
                          </div>
                        </div>
                        <ul className={styles.liste}>
                          {c.tactiques.map(t => <li key={t}>{t}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Page Produit */}
                <div className={`${styles.bloc} ${styles.blocFull}`}>
                  <h3 className={styles.blocTitre}>📄 Page Produit FR</h3>
                  <div className={styles.pageProduit}>
                    <div className={styles.ppTitre}>{resultat.page.titre_principal}</div>
                    <div className={styles.ppSousTitre}>{resultat.page.sous_titre}</div>
                    <div className={styles.ppHero}>{resultat.page.description_hero}</div>
                    <div className={styles.ppPoints}>
                      {resultat.page.points_cles.map(p => <div key={p} className={styles.ppPoint}>{p}</div>)}
                    </div>
                    <div className={styles.ppAvis}>
                      {resultat.page.preuves_sociales.map(a => <div key={a} className={styles.ppAvisItem}>{a}</div>)}
                    </div>
                    <div className={styles.ppFaq}>
                      {resultat.page.faq.map(f => (
                        <div key={f.question} className={styles.ppFaqItem}>
                          <div className={styles.ppQuestion}>❓ {f.question}</div>
                          <div className={styles.ppReponse}>{f.reponse}</div>
                        </div>
                      ))}
                    </div>
                    <div className={styles.ppSeo}>
                      <div className={styles.kv}><span>Titre SEO</span><strong>{resultat.page.titre_seo}</strong></div>
                      <div className={styles.kv}><span>Meta description</span><strong>{resultat.page.meta_description}</strong></div>
                    </div>
                    <button className={styles.copierBtn} onClick={() => copier(
                      `${resultat.page.titre_principal}\n\n${resultat.page.description_hero}\n\n${resultat.page.points_cles.join('\n')}`,
                      'page'
                    )}>
                      {copie === 'page' ? '✓ Copié !' : '📋 Copier le texte de la page'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CONTENU */}
            {onglet === 'contenu' && (
              <div className={styles.grid1}>
                {resultat.contenu.scripts_tiktok.map((s, i) => (
                  <div key={i} className={styles.bloc}>
                    <div className={styles.scriptHeader}>
                      <h3 className={styles.blocTitre}>🎬 Script TikTok #{i + 1} — {s.angle}</h3>
                      <div className={styles.scriptMeta}>
                        <span className={styles.tag}>{s.duree}</span>
                        <span className={styles.tag}>{s.type_createur}</span>
                      </div>
                    </div>
                    <div className={styles.scriptAccroche}>🎣 {s.accroche}</div>
                    <div className={styles.scriptTexte}>{s.script}</div>
                    <div className={styles.scriptCta}>CTA : {s.appel_a_action}</div>
                    <button className={styles.copierBtn} onClick={() => copier(
                      `ANGLE : ${s.angle}\n\nACCROCHE (3s) : ${s.accroche}\n\nSCRIPT :\n${s.script}\n\nCTA : ${s.appel_a_action}`,
                      `script_${i}`
                    )}>
                      {copie === `script_${i}` ? '✓ Copié !' : '📋 Copier le script'}
                    </button>
                  </div>
                ))}

                <div className={styles.bloc}>
                  <h3 className={styles.blocTitre}>🎣 Accroches</h3>
                  <div className={styles.accroches}>
                    {resultat.contenu.accroches.map((a, i) => (
                      <div key={i} className={styles.accroche}>
                        <span className={styles.accrocheNum}>{i + 1}</span>
                        <span>{a}</span>
                        <button className={styles.copierMini} onClick={() => copier(a, `accroche_${i}`)}>
                          {copie === `accroche_${i}` ? '✓' : '📋'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.bloc}>
                  <h3 className={styles.blocTitre}>📅 Calendrier Contenu</h3>
                  <div className={styles.calendrier}>
                    {resultat.contenu.calendrier_contenu.map((c, i) => (
                      <div key={i} className={styles.calItem}>
                        <div className={styles.calJour}>J+{c.jour}</div>
                        <div className={styles.calContent}>
                          <div className={styles.calPlateforme}>{c.plateforme}</div>
                          <div className={styles.calType}>{c.type}</div>
                          <div className={styles.calSujet}>{c.sujet}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.bloc}>
                  <h3 className={styles.blocTitre}>📧 Séquence Email</h3>
                  {resultat.contenu.sequence_email.map((e, i) => (
                    <div key={i} className={styles.email}>
                      <div className={styles.emailHeader}>
                        <span className={styles.emailDelai}>{e.delai}</span>
                        <span className={styles.emailObjet}>📧 {e.objet}</span>
                      </div>
                      <div className={styles.emailPreview}>{e.previsualisation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PUBLICITÉS */}
            {onglet === 'pubs' && (
              <div className={styles.grid1}>
                <h3 className={`${styles.blocTitre} ${styles.sectionTitre}`}>📘 Publicités Meta (Facebook / Instagram)</h3>
                {resultat.pubs.meta.principales.map((p, i) => (
                  <div key={i} className={styles.bloc}>
                    <div className={styles.pubHeader}>
                      <div className={styles.pubFormat}>{p.format}</div>
                      <div className={styles.pubAngle}>{p.angle}</div>
                      <div className={styles.tags}>
                        <span className={styles.tag}>{p.objectif}</span>
                        <span className={styles.tag}>{p.audience}</span>
                      </div>
                    </div>
                    <div className={styles.pubAccroche}>"{p.accroche}"</div>
                    <div className={styles.pubTexte}>{p.texte_principal}</div>
                    <div className={styles.pubCta}>{p.appel_a_action} →</div>
                    <button className={styles.copierBtn} onClick={() => copier(
                      `FORMAT : ${p.format}\n\nACCROCHE : ${p.accroche}\n\nTEXTE :\n${p.texte_principal}\n\nDESCRIPTION : ${p.description}\n\nCTA : ${p.appel_a_action}`,
                      `meta_${i}`
                    )}>
                      {copie === `meta_${i}` ? '✓ Copié !' : '📋 Copier cette pub'}
                    </button>
                  </div>
                ))}

                <h3 className={`${styles.blocTitre} ${styles.sectionTitre}`}>🎵 Publicités TikTok</h3>
                {resultat.pubs.tiktok.pubs.map((p, i) => (
                  <div key={i} className={styles.bloc}>
                    <div className={styles.pubHeader}>
                      <div className={styles.pubFormat}>{p.format}</div>
                      <div className={styles.tags}>
                        <span className={styles.tag}>{p.duree}</span>
                        <span className={styles.tag}>{p.angle_createur}</span>
                      </div>
                    </div>
                    <div className={styles.pubAccroche}>"{p.accroche}"</div>
                    <div className={styles.pubLegende}>{p.legende}</div>
                    <div className={styles.pubHashtags}>{p.hashtags.join(' ')}</div>
                    <div className={styles.kv}><span>🎵 Musique</span><strong>{p.musique}</strong></div>
                    <button className={styles.copierBtn} onClick={() => copier(
                      `FORMAT : ${p.format}\nDURÉE : ${p.duree}\n\nACCROCHE (hook) : ${p.accroche}\n\nLÉGENDE :\n${p.legende}\n\nHASHTAGS : ${p.hashtags.join(' ')}\n\nMUSIQUE : ${p.musique}`,
                      `tiktok_${i}`
                    )}>
                      {copie === `tiktok_${i}` ? '✓ Copié !' : '📋 Copier cette pub TikTok'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
