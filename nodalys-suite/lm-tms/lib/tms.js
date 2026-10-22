'use strict';
/* ============================================================
 *  LM-TMS - métier transport (application autonome).
 *
 *  Le TMS reçoit les départs de chargements du WMS (webhook ou
 *  import de rattrapage) et gère tout le reste en propre :
 *  transporteurs enrichis, grilles tarifaires, coûts, suivi,
 *  pré-facturation, KPI.
 * ============================================================ */

const store = require('./store');

const SEUIL_LITIGE_POURCENT = 5;

function erreur(message) { const e = new Error(message); e.metier = true; return e; }
function maintenant() { return new Date().toISOString(); }
function arrondi(n) { return Math.round(n * 100) / 100; }

/* ------------------------------------------------------------
 *  Transporteurs (synchronisés depuis le WMS, enrichis ici)
 * ------------------------------------------------------------ */

/* Upsert lors d'une synchronisation : le nom vient du WMS, les
 * champs métier TMS (délai, contacts, grilles) restent locaux. */
function transporteurUpsert(code, nom) {
  return store.mutate(db => {
    let t = db.transporteurs.find(x => x.code === code);
    if (t) { t.nom = nom || t.nom; return { transporteur: t, cree: false }; }
    t = { code, nom: nom || code, delaiJours: 3, contact: '', telephone: '', email: '', actif: true };
    db.transporteurs.push(t);
    return { transporteur: t, cree: true };
  });
}

function transporteurModifier(code, data) {
  return store.mutate(db => {
    const t = db.transporteurs.find(x => x.code === code);
    if (!t) throw erreur(`Transporteur ${code} inconnu`);
    for (const champ of ['nom', 'contact', 'telephone', 'email']) {
      if (data[champ] !== undefined) t[champ] = data[champ];
    }
    if (data.delaiJours !== undefined) t.delaiJours = Number(data.delaiJours) || 0;
    if (data.actif !== undefined) t.actif = !!data.actif;
    return t;
  });
}

/* ------------------------------------------------------------
 *  Grilles tarifaires
 * ------------------------------------------------------------ */

function grilleValider(data) {
  if (!data.transporteur) throw erreur('Transporteur obligatoire');
  if (!data.service) throw erreur('Service obligatoire (COLIS / EXPRESS / PALETTE)');
  const tranches = (data.tranches || []).map(t => ({
    poidsMax: Number(t.poidsMax), prix: Number(t.prix),
  })).filter(t => t.poidsMax > 0 && t.prix >= 0)
    .sort((a, b) => a.poidsMax - b.poidsMax);
  if (tranches.length === 0) throw erreur('Au moins une tranche de poids obligatoire');
  return tranches;
}

function grilleCreer(data) {
  return store.mutate(db => {
    if (!db.transporteurs.find(t => t.code === data.transporteur)) {
      throw erreur(`Transporteur ${data.transporteur} inconnu (synchronisez depuis le WMS)`);
    }
    const service = String(data.service).toUpperCase();
    if (db.grillesTarifaires.find(g => g.transporteur === data.transporteur && g.service === service)) {
      throw erreur(`Une grille ${service} existe déjà pour ${data.transporteur}`);
    }
    const grille = {
      id: store.prochainId('grille'),
      transporteur: data.transporteur,
      service,
      tranches: grilleValider(data),
      prixKgSup: Number(data.prixKgSup) || 0,
      supplementCarburant: Number(data.supplementCarburant) || 0,
    };
    db.grillesTarifaires.push(grille);
    return grille;
  });
}

function grilleModifier(id, data) {
  return store.mutate(db => {
    const grille = db.grillesTarifaires.find(g => g.id === Number(id));
    if (!grille) throw erreur('Grille inconnue');
    if (data.tranches !== undefined) grille.tranches = grilleValider({ ...grille, ...data });
    if (data.prixKgSup !== undefined) grille.prixKgSup = Number(data.prixKgSup) || 0;
    if (data.supplementCarburant !== undefined) grille.supplementCarburant = Number(data.supplementCarburant) || 0;
    return grille;
  });
}

function grilleSupprimer(id) {
  return store.mutate(db => {
    const index = db.grillesTarifaires.findIndex(g => g.id === Number(id));
    if (index < 0) throw erreur('Grille inconnue');
    db.grillesTarifaires.splice(index, 1);
    return { ok: true };
  });
}

/* ------------------------------------------------------------
 *  Coûts + simulation
 * ------------------------------------------------------------ */

function coutSurGrille(grille, poids) {
  const p = Math.max(0.1, Number(poids) || 0);
  let base;
  const tranche = grille.tranches.find(t => p <= t.poidsMax);
  if (tranche) {
    base = tranche.prix;
  } else {
    const derniere = grille.tranches[grille.tranches.length - 1];
    base = derniere.prix + (p - derniere.poidsMax) * grille.prixKgSup;
  }
  return arrondi(base * (1 + grille.supplementCarburant / 100));
}

function coutCalculer(codeTransporteur, service, poids) {
  const db = store.getDb();
  const grille = db.grillesTarifaires.find(g =>
    g.transporteur === codeTransporteur && (!service || g.service === String(service).toUpperCase()));
  if (!grille) return null;
  return { grille: grille.service, cout: coutSurGrille(grille, poids) };
}

function simulerCouts(poids, service) {
  const db = store.getDb();
  const resultats = [];
  for (const grille of db.grillesTarifaires) {
    if (service && grille.service !== String(service).toUpperCase()) continue;
    const transporteur = db.transporteurs.find(t => t.code === grille.transporteur);
    if (!transporteur || transporteur.actif === false) continue;
    resultats.push({
      transporteur: grille.transporteur,
      nom: transporteur.nom,
      service: grille.service,
      delaiJours: transporteur.delaiJours || 0,
      cout: coutSurGrille(grille, poids),
    });
  }
  return resultats.sort((a, b) => a.cout - b.cout);
}

/* ------------------------------------------------------------
 *  Expéditions (reçues du WMS : webhook ou import de rattrapage)
 * ------------------------------------------------------------ */

/* payload attendu (envoyé par le WMS) :
 * { chargement, transporteur, dateDepart, nbColis, poids, commandes } */
function expeditionEnregistrer(payload) {
  return store.mutate(db => {
    if (!payload.chargement) throw erreur('Numéro de chargement obligatoire');
    if (db.expeditions.find(e => e.chargementNumero === payload.chargement)) {
      throw erreur(`Le chargement ${payload.chargement} a déjà une expédition`);
    }
    /* transporteur inconnu localement : créé en attente d'enrichissement */
    let transporteur = db.transporteurs.find(t => t.code === payload.transporteur);
    if (!transporteur) {
      transporteur = { code: payload.transporteur, nom: payload.transporteur,
                       delaiJours: 3, contact: '', telephone: '', email: '', actif: true };
      db.transporteurs.push(transporteur);
    }
    const poids = arrondi(Math.max(0.1, Number(payload.poids) || 0));
    const grille = db.grillesTarifaires.find(g => g.transporteur === payload.transporteur);
    const dateDepart = payload.dateDepart || maintenant();
    const delai = transporteur.delaiJours || 3;

    const expedition = {
      id: store.prochainId('expedition'),
      numero: 'EXP' + String(db.sequences.expedition - 1).padStart(6, '0'),
      chargementNumero: payload.chargement,
      transporteur: payload.transporteur,
      service: grille ? grille.service : '',
      commandes: payload.commandes || [],
      nbColis: Number(payload.nbColis) || 0,
      poids,
      coutEstime: grille ? coutSurGrille(grille, poids) : 0,
      statut: 'ENLEVEE',
      dateDepart,
      dateLivraisonPrevue: new Date(new Date(dateDepart).getTime() + delai * 86400000)
        .toISOString().slice(0, 10),
      dateLivraisonReelle: '',
      evenements: [{ date: dateDepart, statut: 'ENLEVEE', lieu: 'Entrepôt',
                     commentaire: 'Départ chargement WMS ' + payload.chargement }],
    };
    db.expeditions.push(expedition);
    return expedition;
  });
}

const STATUTS_EXPEDITION = ['ENLEVEE', 'EN_TRANSIT', 'LIVREE', 'INCIDENT'];

function expeditionEvenement(expeditionId, data) {
  return store.mutate(db => {
    const expedition = db.expeditions.find(e => e.id === Number(expeditionId));
    if (!expedition) throw erreur('Expédition inconnue');
    const statut = String(data.statut || '').toUpperCase();
    if (!STATUTS_EXPEDITION.includes(statut)) {
      throw erreur(`Statut invalide (${STATUTS_EXPEDITION.join(' / ')})`);
    }
    if (expedition.statut === 'LIVREE') throw erreur('Expédition déjà livrée');
    const evenement = {
      date: data.date || maintenant(),
      statut,
      lieu: data.lieu || '',
      commentaire: data.commentaire || '',
    };
    expedition.evenements.push(evenement);
    expedition.statut = statut;
    if (statut === 'LIVREE') expedition.dateLivraisonReelle = evenement.date;
    return expedition;
  });
}

/* ------------------------------------------------------------
 *  Pré-facturation
 * ------------------------------------------------------------ */

function factureSaisir(data) {
  return store.mutate(db => {
    if (!data.transporteur || !data.numero) throw erreur('Transporteur et n° de facture obligatoires');
    if (db.facturesTransport.find(f => f.numero === data.numero && f.transporteur === data.transporteur)) {
      throw erreur(`Facture ${data.numero} déjà saisie pour ${data.transporteur}`);
    }
    if (!data.lignes || data.lignes.length === 0) throw erreur('Au moins une ligne d\'expédition');

    const lignes = data.lignes.map(l => {
      const expedition = db.expeditions.find(e =>
        e.id === Number(l.expedition) || e.numero === l.expedition);
      if (!expedition) throw erreur(`Expédition ${l.expedition} inconnue`);
      if (expedition.transporteur !== data.transporteur) {
        throw erreur(`${expedition.numero} n'appartient pas à ${data.transporteur}`);
      }
      const montant = arrondi(Number(l.montant));
      const ecart = arrondi(montant - expedition.coutEstime);
      const ecartPourcent = expedition.coutEstime > 0
        ? arrondi(100 * ecart / expedition.coutEstime) : 0;
      return { expedition: expedition.numero, coutEstime: expedition.coutEstime,
               montant, ecart, ecartPourcent };
    });

    const enLitige = lignes.some(l => Math.abs(l.ecartPourcent) > SEUIL_LITIGE_POURCENT);
    const facture = {
      id: store.prochainId('facture'),
      numero: data.numero,
      transporteur: data.transporteur,
      dateFacture: data.dateFacture || maintenant().slice(0, 10),
      montant: arrondi(lignes.reduce((somme, l) => somme + l.montant, 0)),
      statut: enLitige ? 'LITIGE' : 'A_VALIDER',
      lignes,
    };
    db.facturesTransport.push(facture);
    return facture;
  });
}

function factureStatuer(factureId, statut) {
  return store.mutate(db => {
    const facture = db.facturesTransport.find(f => f.id === Number(factureId));
    if (!facture) throw erreur('Facture inconnue');
    if (!['VALIDEE', 'LITIGE', 'A_VALIDER'].includes(statut)) throw erreur('Statut invalide');
    facture.statut = statut;
    return facture;
  });
}

/* ------------------------------------------------------------
 *  KPI
 * ------------------------------------------------------------ */

function kpiTransport() {
  const db = store.getDb();
  const expeditions = db.expeditions;
  const livrees = expeditions.filter(e => e.statut === 'LIVREE');
  const coutTotal = arrondi(expeditions.reduce((somme, e) => somme + e.coutEstime, 0));
  const enRetard = livrees.filter(e =>
    e.dateLivraisonReelle && e.dateLivraisonReelle.slice(0, 10) > e.dateLivraisonPrevue);

  const parTransporteur = {};
  for (const e of expeditions) {
    const t = parTransporteur[e.transporteur] ||
      (parTransporteur[e.transporteur] = { expeditions: 0, cout: 0, incidents: 0, livrees: 0, retards: 0 });
    t.expeditions++;
    t.cout = arrondi(t.cout + e.coutEstime);
    if (e.statut === 'INCIDENT') t.incidents++;
    if (e.statut === 'LIVREE') {
      t.livrees++;
      if (e.dateLivraisonReelle && e.dateLivraisonReelle.slice(0, 10) > e.dateLivraisonPrevue) t.retards++;
    }
  }

  const ecartsFacturation = db.facturesTransport
    .flatMap(f => f.lignes)
    .reduce((somme, l) => arrondi(somme + l.ecart), 0);

  return {
    totalExpeditions: expeditions.length,
    enCours: expeditions.filter(e => e.statut === 'ENLEVEE' || e.statut === 'EN_TRANSIT').length,
    incidents: expeditions.filter(e => e.statut === 'INCIDENT').length,
    coutTotal,
    coutMoyen: expeditions.length ? arrondi(coutTotal / expeditions.length) : 0,
    tauxPonctualite: livrees.length
      ? Math.round(100 * (livrees.length - enRetard.length) / livrees.length) : 100,
    facturesEnLitige: db.facturesTransport.filter(f => f.statut === 'LITIGE').length,
    ecartsFacturation,
    parTransporteur,
  };
}

module.exports = {
  transporteurUpsert, transporteurModifier,
  grilleCreer, grilleModifier, grilleSupprimer,
  coutCalculer, coutSurGrille, simulerCouts,
  expeditionEnregistrer, expeditionEvenement,
  factureSaisir, factureStatuer,
  kpiTransport, SEUIL_LITIGE_POURCENT,
};
