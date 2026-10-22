'use strict';
/* ============================================================
 *  Pré-remplissage d'une commande depuis un texte libre (email,
 *  message client…) avec Jev — « sélectionner plutôt que générer » :
 *   - le code repère les quantités candidates (nombres du texte) ;
 *   - Jev choisit, pour chacune, l'article du catalogue WMS qu'elle
 *     commande (ou « aucun » : date, prix, téléphone…), et le client
 *     parmi les clients connus ;
 *   - le code assemble une PROPOSITION : rien n'est créé, l'opérateur
 *     vérifie le formulaire pré-rempli puis crée la commande.
 *  Les fonctions de ce fichier sont pures (testées sans réseau).
 * ============================================================ */

const AUCUN = 'aucun';
const SEUIL_A_VERIFIER = 0.5;   // confiance sous laquelle un champ est signalé « à vérifier »
const MAX_TEXTE = 6000;
const MAX_QUANTITES = 40;

/* Quantités candidates : entiers isolés, hors dates (12/07, 2026-07-20),
 * heures, codes article (TEX-013), décimaux et longs numéros (tél., EAN). */
function quantitesCandidates(texte) {
  const candidats = [];
  const motif = /\d+(?:[.,:/\-]\d+)*/g;
  let m;
  while ((m = motif.exec(texte)) && candidats.length < MAX_QUANTITES) {
    const brut = m[0];
    if (!/^\d{1,5}$/.test(brut)) continue;
    const avant = texte[m.index - 1] || '';
    if (/[A-Za-z\-]/.test(avant)) continue;            // TEX-013, A4…
    const qte = Number(brut);
    if (!(qte > 0)) continue;
    candidats.push({ index: m.index, longueur: brut.length, qte });
  }
  return candidats;
}

/* Texte avec chaque quantité candidate repérée par un marqueur [Qn]. */
function texteMarque(texte, candidats) {
  let sortie = '';
  let curseur = 0;
  candidats.forEach((c, i) => {
    sortie += texte.slice(curseur, c.index) + `[Q${i + 1}]` + texte.slice(c.index, c.index + c.longueur);
    curseur = c.index + c.longueur;
  });
  return sortie + texte.slice(curseur);
}

function construireRequete(texte, clients, articles) {
  const propre = String(texte || '').slice(0, MAX_TEXTE);
  const candidats = quantitesCandidates(propre);

  const criteresArticles = { [AUCUN]: 'Ce nombre n\'est pas une quantité commandée (date, prix, numéro de rue, téléphone, référence de commande…) ou l\'article n\'est pas au catalogue' };
  for (const a of articles) criteresArticles[a.code] = a.designation || a.code;

  const criteresClients = { [AUCUN]: 'Aucun des clients connus, ou impossible à déterminer' };
  for (const c of clients) {
    criteresClients[c.code] = [c.nom, c.adresse, c.ville].filter(Boolean).join(', ');
  }

  const questions = {
    client: {
      type: 'choice',
      instructions: 'Quel client passe cette commande ? Appuie-toi sur la signature, l\'en-tête, l\'adresse de livraison ou le nom de la société dans `commande`.',
      criteria: criteresClients,
    },
  };
  candidats.forEach((c, i) => {
    questions[`ligne_${i + 1}`] = {
      type: 'choice',
      instructions: `Dans \`commande\`, le nombre ${c.qte} repéré par le marqueur [Q${i + 1}] est-il la quantité commandée d'un article du catalogue ? Si oui, lequel ?`,
      criteria: criteresArticles,
    };
  });

  return { state: { commande: texteMarque(propre, candidats) }, questions, candidats };
}

/* Assemble la proposition à partir des réponses de Jev. */
function interpreter(reponses, candidats) {
  const client = reponses.client;
  const proposition = {
    client: client && client.choice !== AUCUN ? client.choice : '',
    confianceClient: client ? client.confidence : 0,
    lignes: [],
  };
  proposition.clientAVerifier = !proposition.client || proposition.confianceClient < SEUIL_A_VERIFIER;

  const parArticle = new Map();
  candidats.forEach((c, i) => {
    const r = reponses[`ligne_${i + 1}`];
    if (!r || r.choice === AUCUN) return;
    const ligne = parArticle.get(r.choice) || { article: r.choice, qte: 0, confiance: 1 };
    ligne.qte += c.qte;
    ligne.confiance = Math.min(ligne.confiance, r.confidence);
    parArticle.set(r.choice, ligne);
  });
  proposition.lignes = [...parArticle.values()].map(l => ({ ...l, aVerifier: l.confiance < SEUIL_A_VERIFIER }));
  return proposition;
}

module.exports = { quantitesCandidates, texteMarque, construireRequete, interpreter, SEUIL_A_VERIFIER };
