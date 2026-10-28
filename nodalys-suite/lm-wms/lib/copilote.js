'use strict';
/* ============================================================
 *  Copilote superviseur — agent IA (lecture seule, v1).
 *
 *  Un assistant conversationnel pour le superviseur : il répond en
 *  langage naturel en INTERROGEANT LA VRAIE DONNÉE du WMS via des
 *  outils (tool-use). Il n'invente jamais de chiffres, il lit.
 *
 *  - Modèle : API Anthropic (Claude). Clé via ANTHROPIC_API_KEY
 *    (le repreneur met sa propre clé). Sans clé → fonctionnalité
 *    désactivée proprement.
 *  - v1 = LECTURE SEULE : aucune mutation de stock/commande. Les
 *    actions (valider une mission, expédier…) viendront en v2 avec
 *    confirmation explicite.
 *  - Chaque échange est journalisé (opérateur + outils appelés).
 * ============================================================ */

const store = require('./store');
const d = require('./domaine');

const CLE = process.env.ANTHROPIC_API_KEY || process.env.CLE_ANTHROPIC || '';
const MODELE = process.env.ANTHROPIC_MODELE || 'claude-sonnet-5';
const MAX_TOURS = 6;      // garde-fou sur la boucle d'outils
const LIMITE_DEF = 20;
const LIMITE_MAX = 50;

function estActif() { return !!CLE; }
function modele() { return MODELE; }

/* ---------- Helpers de lecture (compacts, plafonnés) ---------- */
function borne(n) {
  n = Number(n) || LIMITE_DEF;
  return Math.max(1, Math.min(LIMITE_MAX, n));
}
function zoneDe(db, code) {
  const e = db.emplacements.find(x => x.code === code);
  return e ? e.zone : '';
}
function aujourdhui() { return new Date().toISOString().slice(0, 10); }

/* ---------- Outils exposés à l'agent (lecture seule) ---------- */
const OUTILS = {
  tableau_de_bord() {
    return d.dashboard();
  },

  commandes({ statut, client, en_retard, rupture, limite } = {}) {
    const db = store.getDb();
    const auj = aujourdhui();
    let liste = db.commandes;
    if (statut) liste = liste.filter(c => c.statut === String(statut).toUpperCase());
    if (client) liste = liste.filter(c => (c.client || '').toUpperCase().includes(String(client).toUpperCase()));
    if (rupture === true) liste = liste.filter(c => c.rupture);
    if (en_retard === true) liste = liste.filter(c => c.statut !== 'EXPEDIEE' && c.dateLivraison && c.dateLivraison < auj);
    const total = liste.length;
    const lignes = liste.slice(-borne(limite)).reverse().map(c => ({
      numero: c.numero, client: c.client, statut: c.statut, priorite: c.priorite,
      livraison: c.dateLivraison, transporteur: c.transporteur || null,
      rupture: !!c.rupture, nbLignes: c.lignes.length,
    }));
    return { total, affichees: lignes.length, commandes: lignes };
  },

  stock({ article, emplacement, zone, limite } = {}) {
    const db = store.getDb();
    let liste = db.stock;
    if (article) liste = liste.filter(s => (s.article || '').toUpperCase().includes(String(article).toUpperCase()));
    if (emplacement) liste = liste.filter(s => (s.emplacement || '').toUpperCase().includes(String(emplacement).toUpperCase()));
    if (zone) liste = liste.filter(s => zoneDe(db, s.emplacement) === String(zone).toUpperCase());
    const total = liste.length;
    const lignes = liste.slice(0, borne(limite)).map(s => ({
      article: s.article, emplacement: s.emplacement, zone: zoneDe(db, s.emplacement),
      lot: s.lot || null, dlc: s.dlc || null, qte: s.qte, reserve: s.qteReservee || 0, statut: s.statut,
    }));
    return { total, affichees: lignes.length, stock: lignes };
  },

  missions({ type, statut, limite } = {}) {
    const db = store.getDb();
    let liste = db.missions;
    if (type) liste = liste.filter(m => m.type === String(type).toUpperCase());
    if (statut) liste = liste.filter(m => m.statut === String(statut).toUpperCase());
    const total = liste.length;
    const lignes = liste.slice(-borne(limite)).reverse().map(m => ({
      id: m.id, type: m.type, article: m.article, qte: m.qte,
      de: m.source, vers: m.dest, statut: m.statut, operateur: m.operateur || null, reference: m.reference,
    }));
    return { total, affichees: lignes.length, missions: lignes };
  },

  vagues({ statut, limite } = {}) {
    const db = store.getDb();
    let liste = db.vagues;
    if (statut) liste = liste.filter(v => v.statut === String(statut).toUpperCase());
    const total = liste.length;
    const lignes = liste.slice(-borne(limite)).reverse().map(v => ({
      numero: v.numero, statut: v.statut, creee: v.dateCreation, nbCommandes: (v.commandes || []).length,
    }));
    return { total, affichees: lignes.length, vagues: lignes };
  },

  mouvements({ type, article, limite } = {}) {
    const db = store.getDb();
    let liste = [...db.mouvements].reverse();
    if (type) liste = liste.filter(m => m.type === String(type).toUpperCase());
    if (article) liste = liste.filter(m => (m.article || '').toUpperCase().includes(String(article).toUpperCase()));
    const lignes = liste.slice(0, borne(limite)).map(m => ({
      date: m.date, type: m.type, article: m.article, qte: m.qte,
      de: m.source, vers: m.dest, operateur: m.operateur, reference: m.reference,
    }));
    return { affiches: lignes.length, mouvements: lignes };
  },

  article({ code } = {}) {
    const db = store.getDb();
    const a = db.articles.find(x => x.code === String(code || '').toUpperCase());
    if (!a) return { trouve: false };
    const lignes = db.stock.filter(s => s.article === a.code);
    const qteTotale = lignes.reduce((s, l) => s + l.qte, 0);
    const reserve = lignes.reduce((s, l) => s + (l.qteReservee || 0), 0);
    return {
      trouve: true, code: a.code, designation: a.designation, ean: a.ean,
      gereLot: a.gereLot, gereDLC: a.gereDLC, classeRotation: a.classeRotation,
      emplacementPicking: a.emplacementPicking, stockMiniPicking: a.stockMiniPicking,
      qteTotale, reserve, disponible: qteTotale - reserve,
      emplacements: lignes.map(l => ({ emplacement: l.emplacement, qte: l.qte, lot: l.lot || null, dlc: l.dlc || null })),
    };
  },

  recherche_article({ texte } = {}) {
    const db = store.getDb();
    const q = String(texte || '').toUpperCase();
    const res = db.articles.filter(a =>
      (a.code || '').toUpperCase().includes(q) || (a.designation || '').toUpperCase().includes(q));
    return {
      total: res.length,
      articles: res.slice(0, LIMITE_MAX).map(a => ({ code: a.code, designation: a.designation, classeRotation: a.classeRotation })),
    };
  },
};

/* ---------- Schéma des outils pour l'API Anthropic ---------- */
const SCHEMA_OUTILS = [
  { name: 'tableau_de_bord', description: "Vue d'ensemble de l'entrepôt : portefeuille par statut, occupation des zones, missions en attente, ruptures, retards, mouvements 24h.", input_schema: { type: 'object', properties: {} } },
  { name: 'commandes', description: 'Liste les commandes clients. Filtres optionnels : statut (ATTENTE/ALLOUEE/EN_PREPARATION/PREPAREE/EMBALLEE/EXPEDIEE), client, en_retard (bool), rupture (bool), limite.', input_schema: { type: 'object', properties: { statut: { type: 'string' }, client: { type: 'string' }, en_retard: { type: 'boolean' }, rupture: { type: 'boolean' }, limite: { type: 'integer' } } } },
  { name: 'stock', description: 'Stock à l\'emplacement. Filtres : article, emplacement, zone (RECEPTION/RESERVE/PICKING/EXPEDITION), limite.', input_schema: { type: 'object', properties: { article: { type: 'string' }, emplacement: { type: 'string' }, zone: { type: 'string' }, limite: { type: 'integer' } } } },
  { name: 'missions', description: 'Missions (RANGEMENT/PICKING/REAPPRO). Filtres : type, statut (EN_ATTENTE/TERMINEE), limite.', input_schema: { type: 'object', properties: { type: { type: 'string' }, statut: { type: 'string' }, limite: { type: 'integer' } } } },
  { name: 'vagues', description: 'Vagues de préparation. Filtre : statut (CREEE/LANCEE/TERMINEE), limite.', input_schema: { type: 'object', properties: { statut: { type: 'string' }, limite: { type: 'integer' } } } },
  { name: 'mouvements', description: 'Journal des mouvements de stock récents. Filtres : type, article, limite.', input_schema: { type: 'object', properties: { type: { type: 'string' }, article: { type: 'string' }, limite: { type: 'integer' } } } },
  { name: 'article', description: 'Fiche détaillée d\'un article et son stock (par code exact).', input_schema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] } },
  { name: 'recherche_article', description: 'Recherche un article par code ou désignation (texte libre).', input_schema: { type: 'object', properties: { texte: { type: 'string' } }, required: ['texte'] } },
];

/* ---------- Appel API Anthropic ---------- */
async function appelAnthropic(messages, systeme) {
  const reponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': CLE,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODELE,
      max_tokens: 1024,
      system: systeme,
      tools: SCHEMA_OUTILS,
      messages,
    }),
  });
  if (!reponse.ok) {
    const txt = await reponse.text().catch(() => '');
    throw new Error(`API IA ${reponse.status} : ${txt.slice(0, 200)}`);
  }
  return reponse.json();
}

function systemePrompt(utilisateur) {
  return [
    "Tu es le copilote du superviseur d'un WMS (logiciel de gestion d'entrepôt) nommé Nodalys.",
    `Superviseur connecté : ${utilisateur.nom} (rôle ${utilisateur.role}). Date du jour : ${aujourdhui()}.`,
    '',
    'RÈGLES ABSOLUES :',
    "- Pour toute donnée (stock, commandes, missions, chiffres…), tu DOIS appeler un outil. N'invente JAMAIS un chiffre ou un numéro.",
    '- Si une information demandée n\'est pas couverte par les outils, dis-le simplement.',
    '- Tu es en LECTURE SEULE : tu ne peux rien modifier (pas de validation de mission, pas d\'expédition, pas d\'ajustement). Si on te demande d\'agir, explique que les actions ne sont pas encore activées et propose la marche à suivre dans l\'IHM.',
    '',
    'STYLE : réponds dans la langue du superviseur, de façon concise et opérationnelle. Donne des chiffres précis et les numéros concernés. Propose la prochaine action utile quand c\'est pertinent.',
  ].join('\n');
}

/* Historique client → messages API (sécurisé : seulement texte user/assistant) */
function normaliserHistorique(historique) {
  if (!Array.isArray(historique)) return [];
  return historique
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-12)
    .map(m => ({ role: m.role, content: m.content }));
}

/* ---------- Point d'entrée ---------- */
async function executer({ message, historique, utilisateur }) {
  if (!estActif()) {
    return { actif: false, reponse: "Le copilote n'est pas configuré sur ce serveur (clé ANTHROPIC_API_KEY manquante)." };
  }
  const texte = String(message || '').trim();
  if (!texte) return { actif: true, reponse: 'Posez votre question.' };

  const messages = [...normaliserHistorique(historique), { role: 'user', content: texte }];
  const systeme = systemePrompt(utilisateur);
  const outilsUtilises = [];

  try {
    for (let tour = 0; tour < MAX_TOURS; tour++) {
      const rep = await appelAnthropic(messages, systeme);
      messages.push({ role: 'assistant', content: rep.content });

      if (rep.stop_reason !== 'tool_use') {
        const texteFinal = (rep.content || [])
          .filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
        console.log(`[copilote] ${utilisateur.code}: "${texte.slice(0, 80)}" → outils: ${outilsUtilises.join(', ') || '(aucun)'}`);
        return { actif: true, reponse: texteFinal || '(réponse vide)', outils: outilsUtilises };
      }

      // Exécuter les outils demandés
      const resultats = [];
      for (const bloc of rep.content) {
        if (bloc.type !== 'tool_use') continue;
        outilsUtilises.push(bloc.name);
        let resultat;
        try {
          const fn = OUTILS[bloc.name];
          resultat = fn ? fn(bloc.input || {}) : { erreur: 'outil inconnu' };
        } catch (e) {
          resultat = { erreur: String(e.message || e) };
        }
        resultats.push({ type: 'tool_result', tool_use_id: bloc.id, content: JSON.stringify(resultat) });
      }
      messages.push({ role: 'user', content: resultats });
    }
    return { actif: true, reponse: "Désolé, la demande est trop complexe (trop d'étapes). Reformulez plus simplement.", outils: outilsUtilises };
  } catch (e) {
    console.error('[copilote] erreur:', e.message);
    return { actif: true, reponse: `Le copilote est momentanément indisponible (${e.message}).`, erreur: true };
  }
}

module.exports = { executer, estActif, modele };
