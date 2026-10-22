'use strict';
/* ============================================================
 *  LM-OMS - métier "tour de contrôle des commandes".
 *
 *  Cycle de vie d'une commande OMS :
 *    RECUE -> VALIDEE (stock contrôlé + transporteur choisi)
 *          -> EN_RUPTURE (stock insuffisant, revalidable)
 *    VALIDEE -> TRANSMISE (envoyée au WMS)
 *    puis suivi automatique : EN_PREPARATION -> PREPAREE ->
 *    EXPEDIEE (WMS) -> LIVREE (TMS)  |  ANNULEE à tout moment
 *    avant transmission.
 *
 *  Les fonctions de décision (validation, choix transporteur,
 *  suivi) reçoivent les données WMS/TMS en PARAMÈTRES : le métier
 *  reste pur et testable sans réseau ; l'orchestration réseau vit
 *  dans integration.js.
 * ============================================================ */

const store = require('./store');

function erreur(message) { const e = new Error(message); e.metier = true; return e; }
function maintenant() { return new Date().toISOString(); }
function arrondi(n) { return Math.round(n * 100) / 100; }

/* ------------------------------------------------------------
 *  Canaux de vente
 * ------------------------------------------------------------ */

const REGLES_TRANSPORTEUR = ['MOINS_CHER', 'PLUS_RAPIDE'];   // ou un code transporteur imposé

function canalCreer(data) {
  return store.mutate(db => {
    const code = String(data.code || '').trim().toUpperCase();
    if (!code) throw erreur('Code canal obligatoire');
    if (db.canaux.find(c => c.code === code)) throw erreur(`Canal ${code} déjà existant`);
    const canal = {
      code,
      nom: data.nom || code,
      regleTransporteur: data.regleTransporteur || 'MOINS_CHER',
      prioriteDefaut: Number(data.prioriteDefaut) || 5,
      actif: true,
    };
    db.canaux.push(canal);
    return canal;
  });
}

function canalModifier(code, data) {
  return store.mutate(db => {
    const canal = db.canaux.find(c => c.code === code);
    if (!canal) throw erreur(`Canal ${code} inconnu`);
    if (data.nom !== undefined) canal.nom = data.nom;
    if (data.regleTransporteur !== undefined) canal.regleTransporteur = data.regleTransporteur;
    if (data.prioriteDefaut !== undefined) canal.prioriteDefaut = Number(data.prioriteDefaut) || 5;
    if (data.actif !== undefined) canal.actif = !!data.actif;
    return canal;
  });
}

/* ------------------------------------------------------------
 *  Clients (synchronisés depuis le WMS)
 * ------------------------------------------------------------ */

function clientUpsert(data) {
  return store.mutate(db => {
    let client = db.clients.find(c => c.code === data.code);
    if (client) {
      client.nom = data.nom || client.nom;
      client.ville = data.ville || client.ville;
      client.adresse = data.adresse || client.adresse;
      return { client, cree: false };
    }
    client = { code: data.code, nom: data.nom || data.code,
               ville: data.ville || '', adresse: data.adresse || '' };
    db.clients.push(client);
    return { client, cree: true };
  });
}

/* ------------------------------------------------------------
 *  Commandes
 * ------------------------------------------------------------ */

function commandeCreer(data) {
  return store.mutate(db => {
    const canal = db.canaux.find(c => c.code === data.canal);
    if (!canal) throw erreur(`Canal ${data.canal} inconnu`);
    if (!canal.actif) throw erreur(`Canal ${canal.code} inactif`);
    if (!db.clients.find(c => c.code === data.client)) {
      throw erreur(`Client ${data.client} inconnu (synchronisez depuis le WMS)`);
    }
    if (!data.lignes || data.lignes.length === 0) throw erreur('Au moins une ligne obligatoire');
    for (const l of data.lignes) {
      if (!l.article || !(Number(l.qte) > 0)) throw erreur('Ligne invalide (article + quantité > 0)');
    }
    const commande = {
      id: store.prochainId('commande'),
      numero: 'OM' + String(db.sequences.commande - 1).padStart(6, '0'),
      canal: canal.code,
      client: data.client,
      dateCreation: maintenant(),
      dateLivraisonSouhaitee: data.dateLivraisonSouhaitee || '',
      priorite: Number(data.priorite) || canal.prioriteDefaut,
      statut: 'RECUE',
      lignes: data.lignes.map(l => ({ article: l.article.toUpperCase(), qte: Number(l.qte) })),
      manquants: [],
      poidsEstime: 0,
      transporteurChoisi: '', motifTransporteur: '', coutTransportEstime: 0,
      wmsNumero: '', wmsStatut: '', tmsExpedition: '', tmsStatut: '',
      dateLivraisonReelle: '',
    };
    db.commandes.push(commande);
    return commande;
  });
}

/* Validation : contrôle du stock WMS + choix du transporteur TMS.
 * donnees = {
 *   articles:   [{code, poidsUnitaire, designation}]   (WMS)
 *   disponibles: { 'ART-001': 120, ... }               (WMS, qte dispo)
 *   simulation: [{transporteur, nom, service, delaiJours, cout}] (TMS, trié prix croissant)
 * } — simulation peut être null si le TMS est injoignable. */
function commandeValider(commandeId, donnees) {
  return store.mutate(db => {
    const commande = db.commandes.find(c => c.id === Number(commandeId));
    if (!commande) throw erreur('Commande inconnue');
    if (!['RECUE', 'EN_RUPTURE'].includes(commande.statut)) {
      throw erreur(`Commande ${commande.numero} déjà ${commande.statut}`);
    }
    const articlesParCode = new Map((donnees.articles || []).map(a => [a.code, a]));

    /* 1. contrôle articles + stock */
    const manquants = [];
    let poids = 0;
    for (const ligne of commande.lignes) {
      const article = articlesParCode.get(ligne.article);
      if (!article) { manquants.push({ article: ligne.article, motif: 'inconnu au WMS' }); continue; }
      poids += (article.poidsUnitaire || 0) * ligne.qte;
      const disponible = donnees.disponibles[ligne.article] || 0;
      if (disponible < ligne.qte) {
        manquants.push({ article: ligne.article, motif: `stock ${disponible} < demandé ${ligne.qte}` });
      }
    }
    commande.poidsEstime = arrondi(Math.max(0.1, poids));
    if (manquants.length > 0) {
      commande.statut = 'EN_RUPTURE';
      commande.manquants = manquants;
      return commande;
    }
    commande.manquants = [];

    /* 2. choix du transporteur selon la règle du canal */
    const canal = db.canaux.find(c => c.code === commande.canal);
    const regle = canal ? canal.regleTransporteur : 'MOINS_CHER';
    const simulation = donnees.simulation || [];

    if (!REGLES_TRANSPORTEUR.includes(regle)) {
      /* transporteur imposé par le canal */
      commande.transporteurChoisi = regle;
      const offre = simulation.find(s => s.transporteur === regle);
      commande.coutTransportEstime = offre ? offre.cout : 0;
      commande.motifTransporteur = `imposé par le canal ${commande.canal}`;
    } else if (simulation.length === 0) {
      commande.transporteurChoisi = '';
      commande.motifTransporteur = 'TMS injoignable : à affecter manuellement';
      commande.coutTransportEstime = 0;
    } else if (regle === 'PLUS_RAPIDE') {
      const choix = [...simulation].sort((a, b) =>
        a.delaiJours - b.delaiJours || a.cout - b.cout)[0];
      commande.transporteurChoisi = choix.transporteur;
      commande.coutTransportEstime = choix.cout;
      commande.motifTransporteur =
        `le plus rapide (${choix.delaiJours} j à ${choix.cout.toFixed(2)} €, le moins cher était ${simulation[0].cout.toFixed(2)} €)`;
    } else {
      const choix = simulation[0];   // déjà trié prix croissant
      commande.transporteurChoisi = choix.transporteur;
      commande.coutTransportEstime = choix.cout;
      const suivant = simulation[1];
      commande.motifTransporteur = `le moins cher (${choix.cout.toFixed(2)} €`
        + (suivant ? ` contre ${suivant.cout.toFixed(2)} € pour ${suivant.nom}` : '') + ')';
    }

    commande.statut = 'VALIDEE';
    return commande;
  });
}

/* Transmission : marque la commande transmise au WMS (l'appel réseau
 * est fait par integration.js qui fournit le numéro WMS obtenu). */
function commandeMarquerTransmise(commandeId, wmsNumero) {
  return store.mutate(db => {
    const commande = db.commandes.find(c => c.id === Number(commandeId));
    if (!commande) throw erreur('Commande inconnue');
    if (commande.statut !== 'VALIDEE') throw erreur(`Commande ${commande.numero} non validée (${commande.statut})`);
    commande.statut = 'TRANSMISE';
    commande.wmsNumero = wmsNumero;
    commande.wmsStatut = 'ATTENTE';
    return commande;
  });
}

function commandeAnnuler(commandeId) {
  return store.mutate(db => {
    const commande = db.commandes.find(c => c.id === Number(commandeId));
    if (!commande) throw erreur('Commande inconnue');
    if (!['RECUE', 'VALIDEE', 'EN_RUPTURE'].includes(commande.statut)) {
      throw erreur('Impossible d\'annuler : la commande est déjà au WMS');
    }
    commande.statut = 'ANNULEE';
    return commande;
  });
}

/* ------------------------------------------------------------
 *  Suivi : projection des statuts WMS / TMS sur la commande OMS
 * ------------------------------------------------------------ */

const PROJECTION_WMS = {
  ATTENTE: 'TRANSMISE', ALLOUEE: 'TRANSMISE',
  EN_PREPARATION: 'EN_PREPARATION',
  PREPAREE: 'PREPAREE', EMBALLEE: 'PREPAREE',
  EXPEDIEE: 'EXPEDIEE',
};

/* donnees = { commandesWms: [...], expeditionsTms: [...] } */
function suiviRafraichir(donnees) {
  return store.mutate(db => {
    const wmsParReference = new Map(
      (donnees.commandesWms || []).filter(c => c.referenceExterne)
        .map(c => [c.referenceExterne, c]));
    let mises = 0;

    for (const commande of db.commandes) {
      if (!['TRANSMISE', 'EN_PREPARATION', 'PREPAREE', 'EXPEDIEE'].includes(commande.statut)) continue;
      const wms = wmsParReference.get(commande.numero);
      if (wms) {
        commande.wmsNumero = wms.numero;
        commande.wmsStatut = wms.statut;
        const projete = PROJECTION_WMS[wms.statut] || commande.statut;
        if (projete !== commande.statut) { commande.statut = projete; mises++; }
      }
      if (commande.statut === 'EXPEDIEE' && commande.wmsNumero) {
        const expedition = (donnees.expeditionsTms || []).find(e =>
          (e.commandes || []).includes(commande.wmsNumero));
        if (expedition) {
          commande.tmsExpedition = expedition.numero;
          commande.tmsStatut = expedition.statut;
          if (expedition.statut === 'LIVREE') {
            commande.statut = 'LIVREE';
            commande.dateLivraisonReelle = expedition.dateLivraisonReelle;
            mises++;
          }
        }
      }
    }
    return { misesAJour: mises };
  });
}

/* ------------------------------------------------------------
 *  KPI tour de contrôle
 * ------------------------------------------------------------ */

function kpi() {
  const db = store.getDb();
  const aujourdhui = maintenant().slice(0, 10);
  const parStatut = {};
  const parCanal = {};
  for (const c of db.commandes) {
    parStatut[c.statut] = (parStatut[c.statut] || 0) + 1;
    const canal = parCanal[c.canal] || (parCanal[c.canal] = { total: 0, livrees: 0 });
    canal.total++;
    if (c.statut === 'LIVREE') canal.livrees++;
  }
  const actives = db.commandes.filter(c => !['LIVREE', 'ANNULEE'].includes(c.statut));
  return {
    totalCommandes: db.commandes.length,
    parStatut, parCanal,
    aValider: parStatut.RECUE || 0,
    enRupture: parStatut.EN_RUPTURE || 0,
    aTransmettre: parStatut.VALIDEE || 0,
    enRetard: actives.filter(c =>
      c.dateLivraisonSouhaitee && c.dateLivraisonSouhaitee < aujourdhui).length,
    coutTransportEstime: arrondi(db.commandes
      .filter(c => !['ANNULEE'].includes(c.statut))
      .reduce((somme, c) => somme + (c.coutTransportEstime || 0), 0)),
  };
}

module.exports = {
  canalCreer, canalModifier, clientUpsert,
  commandeCreer, commandeValider, commandeMarquerTransmise, commandeAnnuler,
  suiviRafraichir, kpi, PROJECTION_WMS,
};
