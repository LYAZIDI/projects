'use strict';
/* ============================================================
 *  Domaine métier du WMS - inspiré des flux LM7 / LMxt (Savoye)
 *
 *  Réception   : attendus fournisseur -> réception quai -> missions
 *                de rangement (règles d'adressage automatique)
 *  Stock       : lignes de stock à l'emplacement, lot + DLC,
 *                réservations, traçabilité par mouvements
 *  Préparation : commandes -> allocation FEFO/FIFO -> vagues ->
 *                missions de picking séquencées (chemin de picking)
 *  Réappro     : surveillance des mini picking, missions réserve->picking
 *  Expédition  : colisage SSCC (GS1), chargements transporteur, BL
 *  Inventaire  : comptage par emplacement, écarts, ajustements
 * ============================================================ */

const crypto = require('crypto');
const store = require('./store');

/* ------------------------------------------------------------
 *  Utilitaires
 * ------------------------------------------------------------ */

/* Horloge simulable : les générateurs de données historisées
 * (seed-realiste) déplacent le temps pour dater les flux passés. */
let horlogeSimulee = null;
function maintenant() { return (horlogeSimulee || new Date()).toISOString(); }
function reglerHorloge(date) { horlogeSimulee = date; }

function erreur(message) { const e = new Error(message); e.metier = true; return e; }

function mouvementAjouter(db, m) {
  db.mouvements.push({
    id: db.sequences.mouvement++,
    date: maintenant(),
    type: m.type,                 // RECEPTION, RANGEMENT, PICKING, REAPPRO, INVENTAIRE, EXPEDITION
    article: m.article,
    lot: m.lot || '',
    qte: m.qte,
    source: m.source || '',
    dest: m.dest || '',
    operateur: m.operateur || 'SYSTEME',
    reference: m.reference || '',
  });
}

/* SSCC GS1 : extension(1) + préfixe entreprise(9) + série(7) + clé(1) */
const PREFIXE_GS1 = '376001234';
function ssccGenerer(db) {
  const serie = String(db.sequences.sscc++).padStart(7, '0');
  const corps = '3' + PREFIXE_GS1 + serie;      // 17 chiffres
  let somme = 0;
  for (let i = 0; i < corps.length; i++) {
    const chiffre = corps.charCodeAt(i) - 48;
    somme += (i % 2 === 0) ? chiffre * 3 : chiffre;  // pondération 3-1 depuis la gauche (17 chiffres)
  }
  const cle = (10 - (somme % 10)) % 10;
  return corps + String(cle);
}

/* ------------------------------------------------------------
 *  Utilisateurs et rôles
 *  Hiérarchie : OPERATEUR < SUPERVISEUR < ADMIN.
 *  Mots de passe hachés en scrypt (sel aléatoire), jamais stockés
 *  en clair ni renvoyés par l'API.
 * ------------------------------------------------------------ */

const NIVEAUX_ROLE = { OPERATEUR: 1, SUPERVISEUR: 2, ADMIN: 3 };

function roleSuffisant(role, roleRequis) {
  return (NIVEAUX_ROLE[role] || 0) >= (NIVEAUX_ROLE[roleRequis] || 99);
}

function mdpHacher(mdp) {
  const sel = crypto.randomBytes(8).toString('hex');
  return sel + ':' + crypto.scryptSync(String(mdp), sel, 32).toString('hex');
}

function mdpVerifier(mdp, stocke) {
  const [sel, hash] = String(stocke).split(':');
  if (!sel || !hash) return false;
  const calcule = crypto.scryptSync(String(mdp), sel, 32);
  const attendu = Buffer.from(hash, 'hex');
  return calcule.length === attendu.length && crypto.timingSafeEqual(calcule, attendu);
}

function utilisateurPublic(u) {
  return { code: u.code, nom: u.nom, role: u.role, actif: u.actif };
}

function utilisateurCreer(data) {
  return store.mutate(db => {
    const code = String(data.code || '').trim().toUpperCase();
    if (!code || !data.mdp) throw erreur('Code et mot de passe obligatoires');
    if (!NIVEAUX_ROLE[data.role]) throw erreur('Rôle invalide (OPERATEUR / SUPERVISEUR / ADMIN)');
    if (db.utilisateurs.find(u => u.code === code)) throw erreur(`Utilisateur ${code} déjà existant`);
    const u = { code, nom: data.nom || code, role: data.role,
                mdpHash: mdpHacher(data.mdp), actif: true };
    db.utilisateurs.push(u);
    return utilisateurPublic(u);
  });
}

function utilisateurModifier(code, data) {
  return store.mutate(db => {
    const u = db.utilisateurs.find(x => x.code === code);
    if (!u) throw erreur(`Utilisateur ${code} inconnu`);
    if (data.nom !== undefined) u.nom = data.nom;
    if (data.role !== undefined) {
      if (!NIVEAUX_ROLE[data.role]) throw erreur('Rôle invalide');
      u.role = data.role;
    }
    if (data.actif !== undefined) u.actif = !!data.actif;
    if (data.mdp) u.mdpHash = mdpHacher(data.mdp);
    return utilisateurPublic(u);
  });
}

function utilisateurAuthentifier(code, mdp) {
  const db = store.getDb();
  const u = db.utilisateurs.find(x => x.code === String(code || '').trim().toUpperCase());
  if (!u || !u.actif || !mdpVerifier(mdp, u.mdpHash)) return null;
  return utilisateurPublic(u);
}

function utilisateurLister() {
  return store.getDb().utilisateurs.map(utilisateurPublic);
}

/* ------------------------------------------------------------
 *  Référentiels
 * ------------------------------------------------------------ */

function articleTrouver(db, code) { return db.articles.find(a => a.code === code); }
function emplacementTrouver(db, code) { return db.emplacements.find(e => e.code === code); }

function articleCreer(data) {
  return store.mutate(db => {
    if (!data.code || !data.designation) throw erreur('Code et désignation obligatoires');
    if (articleTrouver(db, data.code)) throw erreur(`Article ${data.code} déjà existant`);
    const article = {
      code: data.code.trim().toUpperCase(),
      designation: data.designation.trim(),
      ean: data.ean || '',
      pcb: Number(data.pcb) || 1,                       // unités par colis standard
      gereLot: !!data.gereLot,
      gereDLC: !!data.gereDLC,
      classeRotation: data.classeRotation || 'B',       // A / B / C
      emplacementPicking: data.emplacementPicking || '',
      stockMiniPicking: Number(data.stockMiniPicking) || 0,
      poidsUnitaire: Number(data.poidsUnitaire) || 0,   // kg
    };
    db.articles.push(article);
    return article;
  });
}

function articleModifier(code, data) {
  return store.mutate(db => {
    const a = articleTrouver(db, code);
    if (!a) throw erreur(`Article ${code} inconnu`);
    const champs = ['designation', 'ean', 'pcb', 'gereLot', 'gereDLC',
                    'classeRotation', 'emplacementPicking', 'stockMiniPicking', 'poidsUnitaire'];
    for (const c of champs) if (data[c] !== undefined) a[c] = data[c];
    return a;
  });
}

function emplacementCreer(data) {
  return store.mutate(db => {
    if (!data.code || !data.zone) throw erreur('Code et zone obligatoires');
    if (emplacementTrouver(db, data.code)) throw erreur(`Emplacement ${data.code} déjà existant`);
    const emplacement = {
      code: data.code.trim().toUpperCase(),
      zone: data.zone.trim().toUpperCase(),   // RECEPTION / RESERVE / PICKING / EXPEDITION
      allee: data.allee || data.code.split('-')[0] || '',
      type: data.type || 'ETAGERE',           // PALETTE / ETAGERE / QUAI
      capacite: Number(data.capacite) || 100, // en unités
      bloque: !!data.bloque,
    };
    db.emplacements.push(emplacement);
    return emplacement;
  });
}

function emplacementBloquer(code, bloque) {
  return store.mutate(db => {
    const e = emplacementTrouver(db, code);
    if (!e) throw erreur(`Emplacement ${code} inconnu`);
    e.bloque = !!bloque;
    return e;
  });
}

function tiersCreer(data) {
  return store.mutate(db => {
    if (db.tiers.find(t => t.code === data.code)) throw erreur(`Tiers ${data.code} déjà existant`);
    const t = { code: data.code, nom: data.nom, type: data.type || 'CLIENT',
                adresse: data.adresse || '', ville: data.ville || '' };
    db.tiers.push(t);
    return t;
  });
}

function transporteurCreer(data) {
  return store.mutate(db => {
    if (db.transporteurs.find(t => t.code === data.code)) throw erreur(`Transporteur ${data.code} déjà existant`);
    const t = { code: data.code, nom: data.nom };
    db.transporteurs.push(t);
    return t;
  });
}

/* ------------------------------------------------------------
 *  Stock
 * ------------------------------------------------------------ */

function qteAEmplacement(db, codeEmplacement) {
  return db.stock.filter(s => s.emplacement === codeEmplacement)
                 .reduce((somme, s) => somme + s.qte, 0);
}

function capaciteRestante(db, emplacement) {
  return emplacement.capacite - qteAEmplacement(db, emplacement.code);
}

/* Ajoute du stock (fusionne avec une ligne identique si possible ;
 * deux lignes ne fusionnent que si elles sont sur le même support) */
function stockAjouter(db, { article, emplacement, lot, dlc, qte, support }) {
  let ligne = db.stock.find(s => s.article === article && s.emplacement === emplacement
                              && s.lot === (lot || '') && s.statut === 'DISPO'
                              && (s.support || '') === (support || ''));
  if (ligne) {
    ligne.qte += qte;
    if (dlc && (!ligne.dlc || dlc < ligne.dlc)) ligne.dlc = dlc;
  } else {
    ligne = { id: db.sequences.stock++, article, emplacement, lot: lot || '',
              dlc: dlc || '', qte, qteReservee: 0, dateEntree: maintenant(),
              statut: 'DISPO', support: support || '' };
    db.stock.push(ligne);
  }
  return ligne;
}

/* Un support sans plus aucune ligne de stock est déclaré VIDE */
function nettoyerSupport(db, sscc) {
  if (!sscc) return;
  if (db.stock.some(s => s.support === sscc)) return;
  const support = db.supports.find(x => x.sscc === sscc);
  if (support) { support.statut = 'VIDE'; support.emplacement = ''; }
}

/* Retire du stock sur une ligne précise ; supprime la ligne si vide */
function stockRetirerLigne(db, ligne, qte, avecReservation) {
  if (ligne.qte < qte) throw erreur(`Stock insuffisant sur ${ligne.emplacement} (${ligne.qte} < ${qte})`);
  ligne.qte -= qte;
  if (avecReservation) ligne.qteReservee = Math.max(0, ligne.qteReservee - qte);
  if (ligne.qte === 0) {
    db.stock.splice(db.stock.indexOf(ligne), 1);
    nettoyerSupport(db, ligne.support);
  }
}

/* Ajustement manuel superviseur (avec traçabilité) */
function stockAjuster(stockId, nouvelleQte, operateur, motif) {
  return store.mutate(db => {
    const ligne = db.stock.find(s => s.id === Number(stockId));
    if (!ligne) throw erreur('Ligne de stock inconnue');
    const delta = Number(nouvelleQte) - ligne.qte;
    if (Number(nouvelleQte) < ligne.qteReservee) {
      throw erreur(`Impossible : ${ligne.qteReservee} unités sont réservées pour la préparation`);
    }
    mouvementAjouter(db, { type: 'AJUSTEMENT', article: ligne.article, lot: ligne.lot,
      qte: delta, source: ligne.emplacement, dest: ligne.emplacement,
      operateur, reference: motif || 'Ajustement manuel' });
    ligne.qte = Number(nouvelleQte);
    if (ligne.qte === 0 && ligne.qteReservee === 0) {
      db.stock.splice(db.stock.indexOf(ligne), 1);
      nettoyerSupport(db, ligne.support);
    }
    return ligne;
  });
}

function stockBloquer(stockId, bloque, operateur) {
  return store.mutate(db => {
    const ligne = db.stock.find(s => s.id === Number(stockId));
    if (!ligne) throw erreur('Ligne de stock inconnue');
    if (bloque && ligne.qteReservee > 0) throw erreur('Ligne réservée par une préparation en cours');
    ligne.statut = bloque ? 'BLOQUE' : 'DISPO';
    mouvementAjouter(db, { type: 'BLOCAGE', article: ligne.article, lot: ligne.lot,
      qte: ligne.qte, source: ligne.emplacement, dest: ligne.emplacement,
      operateur, reference: bloque ? 'Blocage qualité' : 'Déblocage' });
    return ligne;
  });
}

/* ------------------------------------------------------------
 *  Réception : attendus + règle de rangement
 * ------------------------------------------------------------ */

function attenduCreer(data) {
  return store.mutate(db => {
    if (!data.lignes || data.lignes.length === 0) throw erreur('Un attendu doit avoir au moins une ligne');
    for (const l of data.lignes) {
      if (!articleTrouver(db, l.article)) throw erreur(`Article ${l.article} inconnu`);
      if (!(Number(l.qtePrevue) > 0)) throw erreur('Quantité prévue invalide');
    }
    if (data.referenceExterne
        && db.attendus.some(a => a.referenceExterne === data.referenceExterne)) {
      throw erreur(`Attendu externe ${data.referenceExterne} déjà importé`);
    }
    const attendu = {
      id: store.prochainId('attendu'),
      numero: 'AT' + String(db.sequences.attendu - 1).padStart(6, '0'),
      referenceExterne: data.referenceExterne || '',
      fournisseur: data.fournisseur || '',
      datePrevue: data.datePrevue || maintenant().slice(0, 10),
      statut: 'PREVU',                       // PREVU -> EN_COURS -> CLOTURE
      dateCreation: maintenant(),
      lignes: data.lignes.map(l => ({ article: l.article, qtePrevue: Number(l.qtePrevue), qteRecue: 0 })),
    };
    db.attendus.push(attendu);
    return attendu;
  });
}

/* Règle d'adressage automatique au rangement :
 *  1. emplacement picking dédié de l'article s'il a la place
 *  2. emplacement RESERVE qui contient déjà cet article avec la place
 *  3. premier emplacement RESERVE vide
 */
function regleRangement(db, article, qte) {
  const art = articleTrouver(db, article);
  if (art && art.emplacementPicking) {
    const ep = emplacementTrouver(db, art.emplacementPicking);
    if (ep && !ep.bloque && capaciteRestante(db, ep) >= qte) return ep.code;
  }
  const reserves = db.emplacements.filter(e => e.zone === 'RESERVE' && !e.bloque);
  const memeArticle = reserves.find(e =>
    db.stock.some(s => s.emplacement === e.code && s.article === article) && capaciteRestante(db, e) >= qte);
  if (memeArticle) return memeArticle.code;
  const vide = reserves.find(e => qteAEmplacement(db, e.code) === 0 && e.capacite >= qte);
  if (vide) return vide.code;
  const place = reserves.find(e => capaciteRestante(db, e) >= qte);
  return place ? place.code : '';
}

function quaiReception(db) {
  const quai = db.emplacements.find(e => e.zone === 'RECEPTION' && !e.bloque);
  if (!quai) throw erreur('Aucun emplacement de zone RECEPTION défini');
  return quai;
}

/* Réceptionne une quantité sur une ligne d'attendu :
 * stock créé sur le quai + mission de RANGEMENT proposée. */
function receptionner(attenduId, indexLigne, data) {
  return store.mutate(db => {
    const attendu = db.attendus.find(a => a.id === Number(attenduId));
    if (!attendu) throw erreur('Attendu inconnu');
    if (attendu.statut === 'CLOTURE') throw erreur('Attendu déjà clôturé');
    const ligne = attendu.lignes[Number(indexLigne)];
    if (!ligne) throw erreur('Ligne d\'attendu inconnue');

    const article = articleTrouver(db, ligne.article);
    const qte = Number(data.qte);
    if (!(qte > 0)) throw erreur('Quantité invalide');
    if (article.gereLot && !data.lot) throw erreur(`L'article ${article.code} est géré au lot : n° de lot obligatoire`);
    if (article.gereDLC && !data.dlc) throw erreur(`L'article ${article.code} est géré en DLC : date obligatoire`);

    const quai = quaiReception(db);

    /* Réception sur support (palette SSCC) : le support devient
     * l'unité scannable qui sera rangée d'un seul geste. */
    let ssccSupport = '';
    if (data.support) {
      const support = {
        id: store.prochainId('support'),
        sscc: ssccGenerer(db),
        type: data.typeSupport || 'PALETTE',
        emplacement: quai.code,
        statut: 'ACTIF',
        dateCreation: maintenant(),
      };
      db.supports.push(support);
      ssccSupport = support.sscc;
    }

    stockAjouter(db, { article: article.code, emplacement: quai.code,
                       lot: data.lot || '', dlc: data.dlc || '', qte, support: ssccSupport });
    mouvementAjouter(db, { type: 'RECEPTION', article: article.code, lot: data.lot,
      qte, source: attendu.fournisseur, dest: quai.code,
      operateur: data.operateur, reference: attendu.numero + (ssccSupport ? ' / ' + ssccSupport : '') });

    ligne.qteRecue += qte;
    attendu.statut = attendu.lignes.every(l => l.qteRecue >= l.qtePrevue) ? 'CLOTURE' : 'EN_COURS';

    const mission = {
      id: store.prochainId('mission'),
      type: 'RANGEMENT',
      statut: 'EN_ATTENTE',
      article: article.code,
      lot: data.lot || '',
      dlc: data.dlc || '',
      qte,
      source: quai.code,
      dest: regleRangement(db, article.code, qte),
      vague: null, commande: null, ordre: 0,
      operateur: '', dateCreation: maintenant(),
      reference: attendu.numero,
      support: ssccSupport,
    };
    db.missions.push(mission);
    return { attendu, mission };
  });
}

/* ------------------------------------------------------------
 *  Commandes + allocation FEFO / FIFO
 * ------------------------------------------------------------ */

function commandeCreer(data) {
  return store.mutate(db => {
    if (!data.client) throw erreur('Client obligatoire');
    if (!data.lignes || data.lignes.length === 0) throw erreur('Une commande doit avoir au moins une ligne');
    for (const l of data.lignes) {
      if (!articleTrouver(db, l.article)) throw erreur(`Article ${l.article} inconnu`);
      if (!(Number(l.qte) > 0)) throw erreur('Quantité invalide');
    }
    if (data.referenceExterne
        && db.commandes.some(c => c.referenceExterne === data.referenceExterne)) {
      throw erreur(`Commande externe ${data.referenceExterne} déjà importée`);
    }
    const commande = {
      id: store.prochainId('commande'),
      numero: 'CD' + String(db.sequences.commande - 1).padStart(6, '0'),
      referenceExterne: data.referenceExterne || '',
      client: data.client,
      priorite: Number(data.priorite) || 5,          // 1 = urgent ... 9
      dateCreation: maintenant(),
      dateLivraison: data.dateLivraison || '',
      transporteur: data.transporteur || '',
      statut: 'ATTENTE',   // ATTENTE -> ALLOUEE -> EN_PREPARATION -> PREPAREE -> EMBALLEE -> EXPEDIEE
      rupture: false,
      vague: null,
      lignes: data.lignes.map(l => ({
        article: l.article, qteCommandee: Number(l.qte),
        qteAllouee: 0, qtePreparee: 0, qteEmballee: 0, allocations: [],
      })),
    };
    db.commandes.push(commande);
    return commande;
  });
}

/* Alloue le stock d'une commande : FEFO (DLC croissante) pour les
 * articles gérés en DLC, sinon FIFO (date d'entrée). Le picking est
 * servi en priorité sur la zone PICKING, puis sur la RESERVE. */
function allouerCommande(db, commande) {
  for (const ligne of commande.lignes) {
    let restant = ligne.qteCommandee - ligne.qteAllouee;
    if (restant <= 0) continue;
    const article = articleTrouver(db, ligne.article);

    const candidats = db.stock.filter(s => {
      if (s.article !== ligne.article || s.statut !== 'DISPO') return false;
      if (s.qte - s.qteReservee <= 0) return false;
      const e = emplacementTrouver(db, s.emplacement);
      return e && !e.bloque && (e.zone === 'PICKING' || e.zone === 'RESERVE');
    });

    candidats.sort((a, b) => {
      const za = emplacementTrouver(db, a.emplacement).zone === 'PICKING' ? 0 : 1;
      const zb = emplacementTrouver(db, b.emplacement).zone === 'PICKING' ? 0 : 1;
      if (za !== zb) return za - zb;
      if (article.gereDLC) return (a.dlc || '9999').localeCompare(b.dlc || '9999');   // FEFO
      return a.dateEntree.localeCompare(b.dateEntree);                                 // FIFO
    });

    for (const s of candidats) {
      if (restant <= 0) break;
      const dispo = s.qte - s.qteReservee;
      const pris = Math.min(dispo, restant);
      s.qteReservee += pris;
      ligne.allocations.push({ stockId: s.id, emplacement: s.emplacement, lot: s.lot, dlc: s.dlc, qte: pris });
      ligne.qteAllouee += pris;
      restant -= pris;
    }
  }
  commande.rupture = commande.lignes.some(l => l.qteAllouee < l.qteCommandee);
  if (commande.statut === 'ATTENTE' && commande.lignes.some(l => l.qteAllouee > 0)) {
    commande.statut = 'ALLOUEE';
  }
  return commande;
}

/* ------------------------------------------------------------
 *  Vagues de préparation
 * ------------------------------------------------------------ */

function vagueCreer(data) {
  return store.mutate(db => {
    const ids = (data.commandes || []).map(Number);
    if (ids.length === 0) throw erreur('Sélectionnez au moins une commande');
    const commandes = ids.map(id => {
      const c = db.commandes.find(x => x.id === id);
      if (!c) throw erreur(`Commande ${id} inconnue`);
      if (c.statut !== 'ATTENTE' && c.statut !== 'ALLOUEE') {
        throw erreur(`Commande ${c.numero} déjà en préparation (${c.statut})`);
      }
      if (c.vague) throw erreur(`Commande ${c.numero} déjà affectée à une vague`);
      return c;
    });
    const vague = {
      id: store.prochainId('vague'),
      numero: 'VG' + String(db.sequences.vague - 1).padStart(6, '0'),
      dateCreation: maintenant(),
      statut: 'CREEE',            // CREEE -> LANCEE -> TERMINEE
      commandes: ids,
      missions: [],
    };
    for (const c of commandes) c.vague = vague.id;
    db.vagues.push(vague);
    return vague;
  });
}

/* Lance une vague : allocation du stock puis génération des missions
 * de picking triées par chemin (zone puis code emplacement). */
function vagueLancer(vagueId) {
  return store.mutate(db => {
    const vague = db.vagues.find(v => v.id === Number(vagueId));
    if (!vague) throw erreur('Vague inconnue');
    if (vague.statut !== 'CREEE') throw erreur(`Vague déjà ${vague.statut}`);

    const ruptures = [];
    const missions = [];
    for (const cid of vague.commandes) {
      const commande = db.commandes.find(c => c.id === cid);
      allouerCommande(db, commande);
      commande.statut = 'EN_PREPARATION';
      for (const ligne of commande.lignes) {
        if (ligne.qteAllouee < ligne.qteCommandee) {
          ruptures.push({ commande: commande.numero, article: ligne.article,
                          manquant: ligne.qteCommandee - ligne.qteAllouee });
        }
        for (const alloc of ligne.allocations.filter(a => !a.missionId)) {
          const mission = {
            id: store.prochainId('mission'),
            type: 'PICKING',
            statut: 'EN_ATTENTE',
            article: ligne.article, lot: alloc.lot, dlc: alloc.dlc,
            qte: alloc.qte, source: alloc.emplacement, dest: 'PREPA',
            vague: vague.id, commande: commande.id, ordre: 0,
            operateur: '', dateCreation: maintenant(),
            reference: commande.numero, stockId: alloc.stockId,
          };
          alloc.missionId = mission.id;
          missions.push(mission);
        }
      }
    }

    /* chemin de picking : zone PICKING d'abord, puis tri par code emplacement */
    missions.sort((a, b) => {
      const za = (emplacementTrouver(db, a.source) || {}).zone === 'PICKING' ? 0 : 1;
      const zb = (emplacementTrouver(db, b.source) || {}).zone === 'PICKING' ? 0 : 1;
      if (za !== zb) return za - zb;
      return a.source.localeCompare(b.source);
    });
    missions.forEach((m, i) => { m.ordre = i + 1; db.missions.push(m); });

    vague.missions = missions.map(m => m.id);
    vague.statut = 'LANCEE';
    return { vague, ruptures };
  });
}

/* ------------------------------------------------------------
 *  Missions (RF) : rangement, picking, réappro
 * ------------------------------------------------------------ */

function missionValider(missionId, data) {
  return store.mutate(db => {
    const mission = db.missions.find(m => m.id === Number(missionId));
    if (!mission) throw erreur('Mission inconnue');
    if (mission.statut === 'TERMINEE') throw erreur('Mission déjà terminée');

    const operateur = data.operateur || 'RF';
    const qte = data.qte !== undefined ? Number(data.qte) : mission.qte;
    if (!(qte >= 0) || qte > mission.qte) throw erreur(`Quantité invalide (attendu : ${mission.qte})`);

    if (mission.type === 'RANGEMENT') {
      const dest = (data.emplacement || mission.dest || '').toUpperCase();
      const eDest = emplacementTrouver(db, dest);
      if (!eDest) throw erreur(`Emplacement ${dest} inconnu`);
      if (eDest.bloque) throw erreur(`Emplacement ${dest} bloqué`);
      if (eDest.zone === 'RECEPTION') throw erreur('Rangement vers la zone RECEPTION interdit');

      if (mission.support) {
        /* rangement d'un support entier : pas de quantité partielle */
        if (qte !== mission.qte) throw erreur('Un support se range en entier (pas de quantité partielle)');
        deplacerSupport(db, mission.support, eDest, operateur, 'RANGEMENT', mission.reference);
      } else {
        if (capaciteRestante(db, eDest) < qte) throw erreur(`Capacité insuffisante sur ${dest}`);
        const source = db.stock.find(s => s.article === mission.article
          && s.emplacement === mission.source && s.lot === mission.lot && !s.support);
        if (!source || source.qte < qte) throw erreur('Stock introuvable sur le quai de réception');
        stockRetirerLigne(db, source, qte, false);
        stockAjouter(db, { article: mission.article, emplacement: dest,
                           lot: mission.lot, dlc: mission.dlc, qte });
        mouvementAjouter(db, { type: 'RANGEMENT', article: mission.article, lot: mission.lot,
          qte, source: mission.source, dest, operateur, reference: mission.reference });
      }
      mission.dest = dest;
    }

    if (mission.type === 'PICKING') {
      const ligneStock = db.stock.find(s => s.id === mission.stockId);
      const commande = db.commandes.find(c => c.id === mission.commande);
      if (qte > 0) {
        if (!ligneStock) throw erreur('Ligne de stock disparue (inventaire ?) : voir superviseur');
        stockRetirerLigne(db, ligneStock, qte, true);
        mouvementAjouter(db, { type: 'PICKING', article: mission.article, lot: mission.lot,
          qte, source: mission.source, dest: 'PREPA', operateur, reference: mission.reference });
        const ligneCmd = commande.lignes.find(l => l.article === mission.article
          && l.qtePreparee < l.qteAllouee);
        if (ligneCmd) ligneCmd.qtePreparee += qte;
      }
      /* écart picking : la part non prélevée est libérée de la réservation */
      if (qte < mission.qte && ligneStock) {
        ligneStock.qteReservee = Math.max(0, ligneStock.qteReservee - (mission.qte - qte));
        const ligneCmd = commande.lignes.find(l => l.article === mission.article);
        if (ligneCmd) ligneCmd.qteAllouee = Math.max(0, ligneCmd.qteAllouee - (mission.qte - qte));
        commande.rupture = true;
      }
      /* statuts commande + vague */
      if (commande.lignes.every(l => l.qtePreparee >= l.qteAllouee)) {
        const missionsCmd = db.missions.filter(m => m.commande === commande.id && m.type === 'PICKING');
        if (missionsCmd.every(m => m.id === mission.id || m.statut === 'TERMINEE')) {
          commande.statut = 'PREPAREE';
        }
      }
      const vague = db.vagues.find(v => v.id === mission.vague);
      if (vague) {
        const missionsVague = db.missions.filter(m => m.vague === vague.id);
        if (missionsVague.every(m => m.id === mission.id || m.statut === 'TERMINEE')) {
          vague.statut = 'TERMINEE';
        }
      }
    }

    if (mission.type === 'REAPPRO') {
      const dest = (data.emplacement || mission.dest || '').toUpperCase();
      const eDest = emplacementTrouver(db, dest);
      if (!eDest) throw erreur(`Emplacement ${dest} inconnu`);
      const source = db.stock.find(s => s.id === mission.stockId);
      if (!source || source.qte < qte) throw erreur('Stock source introuvable');
      stockRetirerLigne(db, source, qte, true);
      stockAjouter(db, { article: mission.article, emplacement: dest,
                         lot: mission.lot, dlc: mission.dlc, qte });
      mouvementAjouter(db, { type: 'REAPPRO', article: mission.article, lot: mission.lot,
        qte, source: mission.source, dest, operateur, reference: 'Réappro picking' });
    }

    mission.statut = 'TERMINEE';
    mission.operateur = operateur;
    mission.qteValidee = qte;
    mission.dateFin = maintenant();
    return mission;
  });
}

/* ------------------------------------------------------------
 *  Supports (unités logistiques scannables : palettes, bacs)
 * ------------------------------------------------------------ */

/* Déplace physiquement un support et tout son contenu (interne) */
function deplacerSupport(db, sscc, eDest, operateur, typeMouvement, reference) {
  const support = db.supports.find(x => x.sscc === sscc);
  if (!support) throw erreur(`Support ${sscc} inconnu`);
  if (support.statut !== 'ACTIF') throw erreur(`Support ${sscc} ${support.statut}`);
  const lignes = db.stock.filter(s => s.support === sscc);
  if (lignes.length === 0) throw erreur(`Support ${sscc} vide`);
  if (lignes.some(l => l.qteReservee > 0)) {
    throw erreur('Support réservé par une préparation en cours');
  }
  const contenu = lignes.reduce((somme, l) => somme + l.qte, 0);
  if (capaciteRestante(db, eDest) < contenu) throw erreur(`Capacité insuffisante sur ${eDest.code}`);

  const origine = support.emplacement;
  for (const ligne of lignes) {
    ligne.emplacement = eDest.code;
    mouvementAjouter(db, { type: typeMouvement, article: ligne.article, lot: ligne.lot,
      qte: ligne.qte, source: origine, dest: eDest.code, operateur,
      reference: (reference ? reference + ' / ' : '') + sscc });
  }
  support.emplacement = eDest.code;
  return support;
}

/* Déplacement manuel d'un support (RF menu déplacement, superviseur) */
function supportDeplacer(sscc, codeEmplacement, operateur) {
  return store.mutate(db => {
    const eDest = emplacementTrouver(db, (codeEmplacement || '').toUpperCase());
    if (!eDest) throw erreur(`Emplacement ${codeEmplacement} inconnu`);
    if (eDest.bloque) throw erreur(`Emplacement ${eDest.code} bloqué`);
    return deplacerSupport(db, sscc, eDest, operateur, 'DEPLACEMENT', '');
  });
}

/* Contenu détaillé d'un support */
function supportContenu(sscc) {
  const db = store.getDb();
  const support = db.supports.find(x => x.sscc === sscc);
  if (!support) throw erreur(`Support ${sscc} inconnu`);
  return { ...support, lignes: db.stock.filter(s => s.support === sscc) };
}

/* ------------------------------------------------------------
 *  Réapprovisionnement picking
 * ------------------------------------------------------------ */

/* Détecte les articles sous leur mini picking et génère des missions
 * de réappro depuis la réserve (FEFO). Renvoie les missions créées. */
function reapproDetecter() {
  return store.mutate(db => {
    const creees = [];
    for (const article of db.articles) {
      if (!article.emplacementPicking || !article.stockMiniPicking) continue;
      const ep = emplacementTrouver(db, article.emplacementPicking);
      if (!ep || ep.bloque) continue;

      const qtePicking = db.stock
        .filter(s => s.emplacement === ep.code && s.article === article.code)
        .reduce((somme, s) => somme + s.qte, 0);
      const enCours = db.missions
        .filter(m => m.type === 'REAPPRO' && m.statut === 'EN_ATTENTE'
                  && m.article === article.code && m.dest === ep.code)
        .reduce((somme, m) => somme + m.qte, 0);
      if (qtePicking + enCours >= article.stockMiniPicking) continue;

      let besoin = Math.min(article.stockMiniPicking * 2 - qtePicking - enCours,
                            capaciteRestante(db, ep) - enCours);
      if (besoin <= 0) continue;

      /* sources en réserve, FEFO / FIFO */
      const sources = db.stock.filter(s => {
        if (s.article !== article.code || s.statut !== 'DISPO') return false;
        if (s.qte - s.qteReservee <= 0) return false;
        const e = emplacementTrouver(db, s.emplacement);
        return e && !e.bloque && e.zone === 'RESERVE';
      }).sort((a, b) => article.gereDLC
        ? (a.dlc || '9999').localeCompare(b.dlc || '9999')
        : a.dateEntree.localeCompare(b.dateEntree));

      for (const s of sources) {
        if (besoin <= 0) break;
        const pris = Math.min(s.qte - s.qteReservee, besoin);
        s.qteReservee += pris;
        const mission = {
          id: store.prochainId('mission'),
          type: 'REAPPRO', statut: 'EN_ATTENTE',
          article: article.code, lot: s.lot, dlc: s.dlc,
          qte: pris, source: s.emplacement, dest: ep.code,
          vague: null, commande: null, ordre: 0, operateur: '',
          dateCreation: maintenant(), reference: 'Mini picking', stockId: s.id,
        };
        db.missions.push(mission);
        creees.push(mission);
        besoin -= pris;
      }
    }
    return creees;
  });
}

/* ------------------------------------------------------------
 *  Colisage SSCC + expédition
 * ------------------------------------------------------------ */

function colisCreer(commandeId) {
  return store.mutate(db => {
    const commande = db.commandes.find(c => c.id === Number(commandeId));
    if (!commande) throw erreur('Commande inconnue');
    if (commande.statut !== 'PREPAREE' && commande.statut !== 'EN_PREPARATION'
        && commande.statut !== 'EMBALLEE') {
      throw erreur(`Commande ${commande.numero} non préparée (${commande.statut})`);
    }
    const colis = {
      id: store.prochainId('colis'),
      sscc: ssccGenerer(db),
      commande: commande.id,
      statut: 'OUVERT',        // OUVERT -> FERME -> EXPEDIE
      lignes: [],
      dateCreation: maintenant(),
    };
    db.colis.push(colis);
    return colis;
  });
}

function colisAjouterLigne(colisId, data) {
  return store.mutate(db => {
    const colis = db.colis.find(c => c.id === Number(colisId));
    if (!colis) throw erreur('Colis inconnu');
    if (colis.statut !== 'OUVERT') throw erreur('Colis fermé');
    const commande = db.commandes.find(c => c.id === colis.commande);
    const ligne = commande.lignes.find(l => l.article === data.article);
    if (!ligne) throw erreur(`Article ${data.article} absent de la commande ${commande.numero}`);
    const qte = Number(data.qte);
    const restant = ligne.qtePreparee - ligne.qteEmballee;
    if (!(qte > 0) || qte > restant) throw erreur(`Quantité invalide (reste à emballer : ${restant})`);

    ligne.qteEmballee += qte;
    const existante = colis.lignes.find(l => l.article === data.article);
    if (existante) existante.qte += qte; else colis.lignes.push({ article: data.article, qte });

    if (commande.statut === 'PREPAREE'
        && commande.lignes.every(l => l.qteEmballee >= l.qtePreparee)) {
      commande.statut = 'EMBALLEE';
    }
    return colis;
  });
}

function colisFermer(colisId) {
  return store.mutate(db => {
    const colis = db.colis.find(c => c.id === Number(colisId));
    if (!colis) throw erreur('Colis inconnu');
    if (colis.lignes.length === 0) throw erreur('Colis vide');
    colis.statut = 'FERME';
    return colis;
  });
}

function chargementCreer(data) {
  return store.mutate(db => {
    const chargement = {
      id: store.prochainId('chargement'),
      numero: 'CH' + String(db.sequences.chargement - 1).padStart(6, '0'),
      transporteur: data.transporteur || '',
      statut: 'OUVERT',        // OUVERT -> EXPEDIE
      colis: [],
      dateCreation: maintenant(), dateDepart: '',
    };
    db.chargements.push(chargement);
    return chargement;
  });
}

function chargementAjouterColis(chargementId, sscc) {
  return store.mutate(db => {
    const chargement = db.chargements.find(c => c.id === Number(chargementId));
    if (!chargement) throw erreur('Chargement inconnu');
    if (chargement.statut !== 'OUVERT') throw erreur('Chargement déjà parti');
    const colis = db.colis.find(c => c.sscc === sscc);
    if (!colis) throw erreur(`Colis ${sscc} inconnu`);
    if (colis.statut === 'OUVERT') throw erreur('Fermez le colis avant de le charger');
    if (colis.statut === 'EXPEDIE') throw erreur('Colis déjà expédié');
    if (chargement.colis.includes(sscc)) throw erreur('Colis déjà sur ce chargement');
    chargement.colis.push(sscc);
    return chargement;
  });
}

/* Départ du chargement : expédie les colis et les commandes associées */
function chargementExpedier(chargementId, operateur) {
  return store.mutate(db => {
    const chargement = db.chargements.find(c => c.id === Number(chargementId));
    if (!chargement) throw erreur('Chargement inconnu');
    if (chargement.statut !== 'OUVERT') throw erreur('Chargement déjà parti');
    if (chargement.colis.length === 0) throw erreur('Chargement vide');

    const commandesTouchees = new Set();
    for (const sscc of chargement.colis) {
      const colis = db.colis.find(c => c.sscc === sscc);
      colis.statut = 'EXPEDIE';
      commandesTouchees.add(colis.commande);
    }
    for (const cid of commandesTouchees) {
      const commande = db.commandes.find(c => c.id === cid);
      const colisCmd = db.colis.filter(c => c.commande === cid);
      if (colisCmd.every(c => c.statut === 'EXPEDIE')) {
        commande.statut = 'EXPEDIEE';
        for (const l of commande.lignes) {
          if (l.qteEmballee > 0) {
            mouvementAjouter(db, { type: 'EXPEDITION', article: l.article, qte: l.qteEmballee,
              source: 'PREPA', dest: commande.client, operateur, reference: commande.numero });
          }
        }
      }
    }
    chargement.statut = 'EXPEDIE';
    chargement.dateDepart = maintenant();
    return chargement;
  });
}

/* ------------------------------------------------------------
 *  Inventaire
 * ------------------------------------------------------------ */

function inventaireCreer(codeEmplacement) {
  return store.mutate(db => {
    const e = emplacementTrouver(db, codeEmplacement);
    if (!e) throw erreur(`Emplacement ${codeEmplacement} inconnu`);
    const lignesStock = db.stock.filter(s => s.emplacement === e.code);
    if (lignesStock.some(s => s.qteReservee > 0)) {
      throw erreur('Des réservations de préparation existent sur cet emplacement : terminez le picking avant d\'inventorier');
    }
    const inventaire = {
      id: store.prochainId('inventaire'),
      numero: 'IN' + String(db.sequences.inventaire - 1).padStart(6, '0'),
      emplacement: e.code,
      statut: 'EN_COURS',        // EN_COURS -> VALIDE
      dateCreation: maintenant(),
      lignes: lignesStock.map(s => ({ article: s.article, lot: s.lot, dlc: s.dlc,
        qteTheorique: s.qte, qteComptee: null, ecart: null })),
    };
    db.inventaires.push(inventaire);
    return inventaire;
  });
}

function inventaireCompter(inventaireId, comptages, operateur) {
  return store.mutate(db => {
    const inv = db.inventaires.find(i => i.id === Number(inventaireId));
    if (!inv) throw erreur('Inventaire inconnu');
    if (inv.statut === 'VALIDE') throw erreur('Inventaire déjà validé');
    for (const c of comptages) {
      let ligne = inv.lignes.find(l => l.article === c.article && l.lot === (c.lot || ''));
      if (!ligne) {   // article trouvé physiquement mais absent du stock théorique
        ligne = { article: c.article, lot: c.lot || '', dlc: c.dlc || '',
                  qteTheorique: 0, qteComptee: null, ecart: null };
        inv.lignes.push(ligne);
      }
      ligne.qteComptee = Number(c.qteComptee);
      ligne.ecart = ligne.qteComptee - ligne.qteTheorique;
    }
    inv.operateur = operateur || '';
    return inv;
  });
}

function inventaireValider(inventaireId, operateur) {
  return store.mutate(db => {
    const inv = db.inventaires.find(i => i.id === Number(inventaireId));
    if (!inv) throw erreur('Inventaire inconnu');
    if (inv.statut === 'VALIDE') throw erreur('Inventaire déjà validé');
    if (inv.lignes.some(l => l.qteComptee === null)) throw erreur('Toutes les lignes doivent être comptées');

    for (const l of inv.lignes) {
      if (l.ecart === 0) continue;
      const ligneStock = db.stock.find(s => s.emplacement === inv.emplacement
        && s.article === l.article && s.lot === l.lot);
      if (ligneStock) {
        ligneStock.qte = l.qteComptee;
        if (ligneStock.qte === 0) {
          db.stock.splice(db.stock.indexOf(ligneStock), 1);
          nettoyerSupport(db, ligneStock.support);
        }
      } else if (l.qteComptee > 0) {
        stockAjouter(db, { article: l.article, emplacement: inv.emplacement,
                           lot: l.lot, dlc: l.dlc, qte: l.qteComptee });
      }
      mouvementAjouter(db, { type: 'INVENTAIRE', article: l.article, lot: l.lot,
        qte: l.ecart, source: inv.emplacement, dest: inv.emplacement,
        operateur, reference: inv.numero });
    }
    inv.statut = 'VALIDE';
    inv.dateValidation = maintenant();
    return inv;
  });
}

/* ------------------------------------------------------------
 *  Tableau de bord superviseur
 * ------------------------------------------------------------ */

function dashboard() {
  const db = store.getDb();
  const aujourdhui = maintenant().slice(0, 10);
  const hier24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const parStatut = {};
  for (const c of db.commandes) parStatut[c.statut] = (parStatut[c.statut] || 0) + 1;

  const occupation = {};
  for (const zone of ['RECEPTION', 'RESERVE', 'PICKING', 'EXPEDITION']) {
    const emps = db.emplacements.filter(e => e.zone === zone);
    const capacite = emps.reduce((s, e) => s + e.capacite, 0);
    const occupe = emps.reduce((s, e) => s + qteAEmplacement(db, e.code), 0);
    occupation[zone] = { capacite, occupe, taux: capacite ? Math.round(100 * occupe / capacite) : 0 };
  }

  const missionsAttente = {};
  for (const type of ['RANGEMENT', 'PICKING', 'REAPPRO']) {
    missionsAttente[type] = db.missions.filter(m => m.type === type && m.statut === 'EN_ATTENTE').length;
  }

  const expedieesJour = db.commandes.filter(c => c.statut === 'EXPEDIEE').length;
  const total = db.commandes.length;
  const ruptures = db.commandes.filter(c => c.rupture && c.statut !== 'EXPEDIEE');
  const retards = db.commandes.filter(c => c.statut !== 'EXPEDIEE'
    && c.dateLivraison && c.dateLivraison < aujourdhui);

  return {
    date: aujourdhui,
    commandesParStatut: parStatut,
    totalCommandes: total,
    tauxService: total ? Math.round(100 * expedieesJour / total) : 0,
    occupation,
    missionsAttente,
    attendusOuverts: db.attendus.filter(a => a.statut !== 'CLOTURE').length,
    vaguesEnCours: db.vagues.filter(v => v.statut === 'LANCEE').length,
    mouvements24h: db.mouvements.filter(m => m.date >= hier24h).length,
    referencesEnStock: new Set(db.stock.map(s => s.article)).size,
    ruptures: ruptures.map(c => c.numero),
    retards: retards.map(c => ({ numero: c.numero, client: c.client, dateLivraison: c.dateLivraison })),
  };
}

module.exports = {
  articleCreer, articleModifier, emplacementCreer, emplacementBloquer,
  tiersCreer, transporteurCreer,
  stockAjuster, stockBloquer,
  attenduCreer, receptionner,
  commandeCreer, vagueCreer, vagueLancer,
  missionValider, reapproDetecter,
  colisCreer, colisAjouterLigne, colisFermer,
  chargementCreer, chargementAjouterColis, chargementExpedier,
  inventaireCreer, inventaireCompter, inventaireValider,
  dashboard, reglerHorloge,
  utilisateurCreer, utilisateurModifier, utilisateurAuthentifier,
  utilisateurLister, roleSuffisant,
  supportDeplacer, supportContenu,
};
