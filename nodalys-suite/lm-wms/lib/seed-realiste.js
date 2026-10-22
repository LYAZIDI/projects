'use strict';
/* ============================================================
 *  Jeu de données RÉALISTE - entrepôt e-commerce multi-familles.
 *
 *  Ne fabrique pas des enregistrements "posés là" : il REJOUE
 *  trois semaines de vie de l'entrepôt à travers les vrais flux
 *  métier (attendus -> réceptions -> rangements -> commandes ->
 *  vagues -> picking -> colisage -> chargements -> expéditions,
 *  plus réappros, inventaires, blocages qualité), en déplaçant
 *  l'horloge du domaine. Résultat : une base cohérente où chaque
 *  mouvement a une origine, exploitable pour TOUS les scénarios.
 *
 *  Lancement : node lib/seed-realiste.js   (5 à 15 secondes)
 * ============================================================ */

const store = require('./store');
const d = require('./domaine');

/* ---------- Aléa déterministe (rejouable) ---------- */
function mulberry32(graine) {
  return function () {
    graine |= 0; graine = (graine + 0x6D2B79F5) | 0;
    let t = Math.imul(graine ^ (graine >>> 15), 1 | graine);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const alea = mulberry32(20260709);
const entier = (min, max) => min + Math.floor(alea() * (max - min + 1));
const parmi = tableau => tableau[Math.floor(alea() * tableau.length)];
const chance = p => alea() < p;

/* ---------- Horloge simulée ---------- */
let horloge = new Date();
function reglerJour(joursAvantAujourdhui, heure = 7, minute = 30) {
  horloge = new Date();
  horloge.setDate(horloge.getDate() - joursAvantAujourdhui);
  horloge.setHours(heure, minute, 0, 0);
  d.reglerHorloge(horloge);
}
function avancer(minutes) {
  horloge = new Date(horloge.getTime() + minutes * 60000);
  d.reglerHorloge(horloge);
}
const dateISO = (decalageJours = 0) => {
  const dt = new Date(horloge.getTime() + decalageJours * 86400000);
  return dt.toISOString().slice(0, 10);
};

/* ---------- EAN-13 valide (préfixe fictif 376…) ---------- */
let serieEan = 100001;
function ean13() {
  const corps = '376' + String(serieEan++).padStart(9, '0');
  let somme = 0;
  for (let i = 0; i < 12; i++) somme += (corps.charCodeAt(i) - 48) * (i % 2 === 0 ? 1 : 3);
  return corps + String((10 - (somme % 10)) % 10);
}

const OPERATEURS = ['NADIA', 'KARIM', 'JULIE', 'MEHDI', 'SOFIA', 'THOMAS', 'AICHA', 'LUCAS'];
const op = () => parmi(OPERATEURS);

/* Comptes de démonstration (mots de passe volontairement simples) */
function creerUtilisateurs() {
  d.utilisateurCreer({ code: 'ADMIN', nom: 'Administrateur', role: 'ADMIN', mdp: 'admin123' });
  d.utilisateurCreer({ code: 'CHEF', nom: 'Chef d\'équipe', role: 'SUPERVISEUR', mdp: 'chef123' });
  const noms = { NADIA: 'Nadia B.', KARIM: 'Karim T.', JULIE: 'Julie M.', MEHDI: 'Mehdi R.',
                 SOFIA: 'Sofia L.', THOMAS: 'Thomas D.', AICHA: 'Aïcha K.', LUCAS: 'Lucas P.' };
  for (const code of OPERATEURS) {
    d.utilisateurCreer({ code, nom: noms[code], role: 'OPERATEUR', mdp: '1234' });
  }
}

/* ============================================================
 *  1. Référentiels
 * ============================================================ */

const FAMILLES = [
  { code: 'TEX', nom: 'Textile', gereLot: false, gereDLC: false, pcb: [5, 10], poids: [0.15, 0.8],
    produits: ['T-shirt coton', 'Polo piqué', 'Sweat capuche', 'Jean brut', 'Chino stretch',
               'Chaussettes x3', 'Pull maille fine', 'Veste softshell', 'Bermuda toile', 'Robe chemise'],
    variantes: ['T.S', 'T.M', 'T.L', 'T.XL'] },
  { code: 'EPI', nom: 'Épicerie', gereLot: true, gereDLC: true, pcb: [12, 24], poids: [0.1, 1.2],
    produits: ['Chocolat noir 70%', 'Café moulu 250g', 'Thé vert bio 20s', 'Biscuits sablés',
               'Miel acacia 500g', 'Confiture fraise', 'Pâtes penne 500g', 'Huile olive 75cl',
               'Riz basmati 1kg', 'Céréales muesli', 'Sauce tomate basilic', 'Jus orange 1L'],
    variantes: [''] },
  { code: 'DPH', nom: 'Droguerie-Hygiène', gereLot: true, gereDLC: false, pcb: [4, 6, 12], poids: [0.3, 3.5],
    produits: ['Lessive liquide 3L', 'Shampoing doux 400ml', 'Gel douche karité', 'Savon Marseille x4',
               'Liquide vaisselle', 'Dentifrice menthe x2', 'Adoucissant 1.5L', 'Coton-tiges x200', 'Crème mains 75ml'],
    variantes: [''] },
  { code: 'ELE', nom: 'Électronique', gereLot: true, gereDLC: false, pcb: [2, 4, 6], poids: [0.1, 1.5],
    produits: ['Casque Bluetooth', 'Chargeur USB-C 30W', 'Câble HDMI 2m', 'Souris sans fil',
               'Clavier AZERTY', 'Enceinte nomade', 'Batterie externe 10Ah', 'Webcam FullHD',
               'Hub USB 4 ports', 'Support téléphone', 'Écouteurs filaires', 'Lampe LED bureau'],
    variantes: [''] },
  { code: 'MAI', nom: 'Maison', gereLot: false, gereDLC: false, pcb: [4, 6, 8], poids: [0.2, 2.0],
    produits: ['Mug céramique 30cl', 'Assiette plate x4', 'Bougie parfumée', 'Cadre photo A4',
               'Coussin 40x40', 'Plaid polaire', 'Verre à eau x6', 'Saladier verre',
               'Plateau bambou', 'Boîte rangement', 'Horloge murale', 'Vase céramique'],
    variantes: [''] },
];

function creerArticles() {
  const codes = [];
  for (const famille of FAMILLES) {
    let numero = 1;
    for (const produit of famille.produits) {
      for (const variante of famille.variantes) {
        const code = `${famille.code}-${String(numero).padStart(3, '0')}`;
        numero++;
        const rotation = chance(0.22) ? 'A' : chance(0.65) ? 'B' : 'C';
        d.articleCreer({
          code,
          designation: (produit + ' ' + variante).trim(),
          ean: ean13(),
          pcb: parmi(famille.pcb),
          gereLot: famille.gereLot,
          gereDLC: famille.gereDLC,
          classeRotation: rotation,
          poidsUnitaire: Math.round((famille.poids[0] + alea() * (famille.poids[1] - famille.poids[0])) * 100) / 100,
        });
        codes.push(code);
      }
    }
  }
  return codes;
}

function creerEmplacements() {
  for (let q = 1; q <= 4; q++) d.emplacementCreer({ code: `REC-0${q}`, zone: 'RECEPTION', type: 'QUAI', capacite: 20000 });
  for (let q = 1; q <= 4; q++) d.emplacementCreer({ code: `EXP-0${q}`, zone: 'EXPEDITION', type: 'QUAI', capacite: 20000 });
  for (let a = 1; a <= 5; a++) {
    for (let travee = 1; travee <= 15; travee++) {
      for (let niveau = 1; niveau <= 3; niveau++) {
        d.emplacementCreer({ code: `R${a}-${String(travee).padStart(2, '0')}-${niveau}`,
          zone: 'RESERVE', allee: 'R' + a, type: 'PALETTE', capacite: 300 });
      }
    }
  }
  for (let a = 1; a <= 4; a++) {
    for (let casier = 1; casier <= 30; casier++) {
      d.emplacementCreer({ code: `P${a}-${String(casier).padStart(2, '0')}`,
        zone: 'PICKING', allee: 'P' + a, type: 'ETAGERE', capacite: 200 });
    }
  }
}

/* Affecte les casiers picking aux plus fortes rotations */
function affecterPicking() {
  const db = store.getDb();
  const casiers = db.emplacements.filter(e => e.zone === 'PICKING').map(e => e.code);
  const prioritaires = [...db.articles].sort((x, y) =>
    x.classeRotation.localeCompare(y.classeRotation));
  let i = 0;
  for (const article of prioritaires) {
    if (i >= casiers.length) break;
    d.articleModifier(article.code, {
      emplacementPicking: casiers[i++],
      stockMiniPicking: article.pcb * 2,
    });
  }
}

const VILLES = ['Lyon', 'Dijon', 'Nantes', 'Lille', 'Bordeaux', 'Toulouse', 'Rennes',
                'Strasbourg', 'Orléans', 'Rouen', 'Metz', 'Angers', 'Reims', 'Tours', 'Grenoble'];

function creerTiers() {
  const fournisseurs = ['Textile Import SAS', 'Filature du Nord', 'Épicerie Fine Distribution',
    'Comptoir des Saveurs', 'HygièneCo France', 'Drogatis SARL', 'ElectroGros', 'TechniSourcing',
    'Maison & Style', 'Arts de la Table Réunis', 'Nordic Import', 'Provence Logistique Négoce'];
  fournisseurs.forEach((nom, i) => d.tiersCreer({
    code: 'FRN-' + String(i + 1).padStart(3, '0'), nom, type: 'FOURNISSEUR', ville: parmi(VILLES) }));

  const enseignes = ['La Boutique du Coin', 'WebShop.fr', 'Grand Sud Distribution', 'Market Express',
    'Maison Moderne', 'Le Panier Bio', 'UrbanStyle Store', 'TechAvenue', 'Casa Déco', 'Prix Malins',
    'Boutique des Halles', 'e-Tendance', 'Comptoir Familial', 'Vitrine du Centre', 'Shop&Go',
    'Les Trois Arcades', 'Bazar Moderne', 'Concept Store 21', 'Galerie Lumière', 'Achats Direct',
    'Maxi Courses', 'Le Comptoir Digital', 'Style Avenue', 'Panier Express', 'Grande Épicerie du Parc'];
  enseignes.forEach((nom, i) => d.tiersCreer({
    code: 'CLI-' + String(i + 1).padStart(3, '0'), nom, type: 'CLIENT',
    adresse: `${entier(1, 120)} rue ${parmi(['des Halles', 'de la Gare', 'Pasteur', 'des Lilas', 'Victor Hugo', 'du Commerce'])}`,
    ville: parmi(VILLES) }));

  [['TRP-COLIS', 'Colissimo'], ['TRP-CHRONO', 'Chronopost'], ['TRP-DPD', 'DPD France'],
   ['TRP-GLS', 'GLS'], ['TRP-SCHENK', 'Schenker Palette'], ['TRP-FREXP', 'France Express']]
    .forEach(([code, nom]) => d.transporteurCreer({ code, nom }));
}

/* ============================================================
 *  2. Routines de flux (réutilisées chaque journée simulée)
 * ============================================================ */

const db = () => store.getDb();
const fournisseurs = () => db().tiers.filter(t => t.type === 'FOURNISSEUR');
const clients = () => db().tiers.filter(t => t.type === 'CLIENT');
let serieLot = 1;

function creerEtRecevoirAttendu(articles, options = {}) {
  const nbLignes = options.nbLignes || entier(3, 6);
  const selection = [];
  while (selection.length < nbLignes) {
    const code = parmi(articles);
    if (!selection.includes(code)) selection.push(code);
  }
  const lignes = selection.map(code => {
    const article = db().articles.find(a => a.code === code);
    return { article: code, qtePrevue: article.pcb * entier(options.pcbMin || 5, options.pcbMax || 12) };
  });
  const attendu = d.attenduCreer({ fournisseur: parmi(fournisseurs()).code, datePrevue: dateISO(), lignes });
  if (options.nePasRecevoir) return attendu;

  avancer(entier(10, 40));
  attendu.lignes.forEach((ligne, index) => {
    if (options.reçoitPartiellement && index === attendu.lignes.length - 1) return; // dernière ligne non reçue
    const article = db().articles.find(a => a.code === ligne.article);
    const qte = options.reçoitPartiellement && index === 0
      ? Math.floor(ligne.qtePrevue * 0.6) : ligne.qtePrevue;
    d.receptionner(attendu.id, index, {
      qte,
      lot: article.gereLot ? 'L' + dateISO().replace(/-/g, '').slice(2) + '-' + String(serieLot++).padStart(3, '0') : '',
      dlc: article.gereDLC ? dateISO(entier(45, 300)) : '',
      support: chance(0.8),          // la plupart des réceptions arrivent sur palette SSCC
      operateur: op(),
    });
    avancer(entier(2, 8));
  });
  return attendu;
}

function validerRangements(options = {}) {
  const enAttente = db().missions.filter(m => m.type === 'RANGEMENT' && m.statut === 'EN_ATTENTE');
  for (const mission of enAttente) {
    if (options.enLaisser && chance(0.3)) continue;   // travail restant volontaire
    if (!mission.dest) continue;                       // pas d'adressage possible : reste à traiter
    try { d.missionValider(mission.id, { operateur: op() }); avancer(entier(1, 4)); } catch { /* plein */ }
  }
}

function creerCommandesDuJour(articles, nombre, options = {}) {
  const creees = [];
  for (let i = 0; i < nombre; i++) {
    const nbLignes = entier(1, 5);
    const selection = [];
    while (selection.length < nbLignes) {
      const code = parmi(articles);
      if (!selection.includes(code)) selection.push(code);
    }
    const commande = d.commandeCreer({
      client: parmi(clients()).code,
      priorite: chance(0.15) ? entier(1, 2) : entier(3, 8),
      dateLivraison: options.dateLivraison || dateISO(entier(1, 3)),
      transporteur: parmi(db().transporteurs).code,
      lignes: selection.map(code => {
        const article = db().articles.find(a => a.code === code);
        return { article: code, qte: article.pcb * entier(1, 3) };
      }),
    });
    creees.push(commande);
    avancer(entier(1, 5));
  }
  return creees;
}

function lancerEtPreparerVague(idsCommandes, options = {}) {
  if (idsCommandes.length === 0) return null;
  let vague;
  try {
    vague = d.vagueCreer({ commandes: idsCommandes });
    if (options.nePasLancer) return vague;
    d.vagueLancer(vague.id);
  } catch { return null; }
  if (options.nePasPicker) return vague;

  avancer(entier(10, 30));
  const missions = db().missions.filter(m => m.vague === vague.id && m.statut === 'EN_ATTENTE');
  let faites = 0;
  for (const mission of missions) {
    if (options.pickingPartiel && faites >= Math.floor(missions.length / 2)) break;
    const qte = chance(0.03) ? Math.max(0, mission.qte - entier(1, 2)) : mission.qte;  // écarts occasionnels
    try { d.missionValider(mission.id, { qte, operateur: op() }); faites++; avancer(entier(1, 3)); } catch { /* stock disparu */ }
  }
  return vague;
}

function coliserEtExpedier(options = {}) {
  const preparees = db().commandes.filter(c => c.statut === 'PREPAREE');
  const colisFermes = [];
  for (const commande of preparees) {
    if (options.enLaisser && chance(0.25)) continue;   // reste à emballer
    try {
      const colis = d.colisCreer(commande.id);
      for (const ligne of commande.lignes) {
        const reste = ligne.qtePreparee - ligne.qteEmballee;
        if (reste > 0) d.colisAjouterLigne(colis.id, { article: ligne.article, qte: reste });
      }
      d.colisFermer(colis.id);
      colisFermes.push(colis);
      avancer(entier(2, 6));
    } catch { /* rien à emballer */ }
  }
  if (options.nePasExpedier) return;

  /* un chargement par transporteur ayant des colis fermés */
  const parTransporteur = {};
  for (const colis of colisFermes) {
    const commande = db().commandes.find(c => c.id === colis.commande);
    (parTransporteur[commande.transporteur || 'TRP-COLIS'] ||= []).push(colis);
  }
  for (const [transporteur, listeColis] of Object.entries(parTransporteur)) {
    const chargement = d.chargementCreer({ transporteur });
    for (const colis of listeColis) d.chargementAjouterColis(chargement.id, colis.sscc);
    avancer(entier(5, 20));
    d.chargementExpedier(chargement.id, op());
  }
}

function executerReappros(options = {}) {
  const creees = d.reapproDetecter();
  for (const mission of creees) {
    if (options.enLaisser && chance(0.4)) continue;
    try { d.missionValider(mission.id, { operateur: op() }); avancer(entier(1, 3)); } catch { /* plein */ }
  }
}

function inventaireTournant() {
  const candidats = db().emplacements.filter(e =>
    (e.zone === 'PICKING' || e.zone === 'RESERVE') &&
    db().stock.some(s => s.emplacement === e.code) &&
    !db().stock.some(s => s.emplacement === e.code && s.qteReservee > 0));
  for (let essai = 0; essai < 5; essai++) {
    const emplacement = parmi(candidats);
    try {
      const inventaire = d.inventaireCreer(emplacement.code);
      const comptages = inventaire.lignes.map(l => ({
        article: l.article, lot: l.lot,
        qteComptee: chance(0.25) ? Math.max(0, l.qteTheorique + entier(-2, 1)) : l.qteTheorique,
      }));
      d.inventaireCompter(inventaire.id, comptages, op());
      d.inventaireValider(inventaire.id, op());
      return;
    } catch { /* emplacement réservé entre-temps : suivant */ }
  }
}

/* ============================================================
 *  3. Simulation
 * ============================================================ */

function seedRealiste() {
  console.log('Réinitialisation de la base…');
  store.reinitialiser();

  console.log('Référentiels : articles, emplacements, tiers, utilisateurs…');
  reglerJour(23, 8, 0);
  creerUtilisateurs();
  const articles = creerArticles();
  creerEmplacements();
  affecterPicking();
  creerTiers();

  /* ---------- Garnissage initial (J-22) ---------- */
  console.log('Garnissage initial de la réserve et du picking (J-22)…');
  reglerJour(22, 7, 0);
  for (let i = 0; i < 16; i++) {
    creerEtRecevoirAttendu(articles, { nbLignes: 8, pcbMin: 8, pcbMax: 15 });
  }
  validerRangements();
  executerReappros();

  /* ---------- 3 semaines d'exploitation (J-21 à J-1) ---------- */
  for (let jour = 21; jour >= 1; jour--) {
    const dateJour = new Date(Date.now() - jour * 86400000);
    if (dateJour.getDay() === 0) continue;   // fermé le dimanche
    process.stdout.write(`Journée J-${jour}… `);

    /* matin : réceptions + rangement */
    reglerJour(jour, 7, entier(0, 45));
    for (let i = 0; i < entier(1, 3); i++) creerEtRecevoirAttendu(articles);
    validerRangements();

    /* journée : commandes, vagues, picking (reprend aussi les
       commandes en attente des jours précédents) */
    reglerJour(jour, 10, entier(0, 59));
    creerCommandesDuJour(articles, entier(8, 16));
    const aPreparer = db().commandes.filter(c => c.statut === 'ATTENTE' && !c.vague);
    for (let i = 0; i < aPreparer.length; i += 6) {
      lancerEtPreparerVague(aPreparer.slice(i, i + 6).map(c => c.id));
    }
    executerReappros();

    /* après-midi : colisage + départs transporteurs */
    reglerJour(jour, 15, entier(0, 59));
    coliserEtExpedier();

    /* inventaire tournant deux fois par semaine */
    if (jour % 3 === 0) { reglerJour(jour, 17, 30); inventaireTournant(); }
    console.log('ok');
  }

  /* ---------- Aujourd'hui : entrepôt en pleine activité ---------- */
  console.log('Journée du jour : travail en cours…');
  reglerJour(0, 7, 15);

  /* réceptions : une complète, une partielle, une pas commencée, une pour demain */
  creerEtRecevoirAttendu(articles);
  validerRangements({ enLaisser: true });                       // rangements restants
  creerEtRecevoirAttendu(articles, { reçoitPartiellement: true });
  creerEtRecevoirAttendu(articles, { nePasRecevoir: true });
  const attenduDemain = creerEtRecevoirAttendu(articles, { nePasRecevoir: true });
  store.getDb().attendus.find(a => a.id === attenduDemain.id).datePrevue = dateISO(1);

  /* commandes du jour + 2 retards d'hier restés en attente */
  reglerJour(0, 9, 30);
  const commandesJour = creerCommandesDuJour(articles, 12);
  creerCommandesDuJour(articles, 2, { dateLivraison: dateISO(-1) });   // retard !

  /* une vague créée non lancée, une vague en cours de picking,
     une vague entièrement préparée (pour le colisage) */
  lancerEtPreparerVague(commandesJour.slice(0, 3).map(c => c.id), { nePasLancer: true });
  lancerEtPreparerVague(commandesJour.slice(3, 7).map(c => c.id), { pickingPartiel: true });
  lancerEtPreparerVague(commandesJour.slice(7, 10).map(c => c.id));

  /* scénario rupture : grosse commande sur un article à faible stock */
  reglerJour(0, 10, 45);
  const petitStock = db().articles.find(a => {
    const total = db().stock.filter(s => s.article === a.code && s.statut === 'DISPO')
      .reduce((somme, s) => somme + s.qte - s.qteReservee, 0);
    return total > 0 && total < a.pcb * 4;
  });
  if (petitStock) {
    const grosse = d.commandeCreer({
      client: parmi(clients()).code, priorite: 1, dateLivraison: dateISO(1),
      transporteur: 'TRP-CHRONO',
      lignes: [{ article: petitStock.code, qte: petitStock.pcb * 20 }],
    });
    lancerEtPreparerVague([grosse.id], { nePasPicker: true });
  }

  /* colisage en cours : 2 commandes emballées (chargement ouvert non
     parti), 1 colis ouvert partiellement rempli, le reste PREPAREE */
  reglerJour(0, 11, 30);
  const preparees = db().commandes.filter(c => c.statut === 'PREPAREE');
  const colisFermes = [];
  for (const commande of preparees.slice(0, 2)) {
    const colis = d.colisCreer(commande.id);
    for (const ligne of commande.lignes) {
      const reste = ligne.qtePreparee - ligne.qteEmballee;
      if (reste > 0) d.colisAjouterLigne(colis.id, { article: ligne.article, qte: reste });
    }
    d.colisFermer(colis.id);
    colisFermes.push(colis);
  }
  if (colisFermes.length > 0) {
    const chargement = d.chargementCreer({ transporteur: 'TRP-DPD' });
    for (const colis of colisFermes) d.chargementAjouterColis(chargement.id, colis.sscc);
    /* volontairement non expédié : à faire dans l'IHM */
  }
  const aEmballer = preparees[2];
  if (aEmballer) {
    const colisOuvert = d.colisCreer(aEmballer.id);
    const premiereLigne = aEmballer.lignes.find(l => l.qtePreparee - l.qteEmballee > 0);
    if (premiereLigne) {
      d.colisAjouterLigne(colisOuvert.id, {
        article: premiereLigne.article,
        qte: Math.max(1, Math.floor((premiereLigne.qtePreparee - premiereLigne.qteEmballee) / 2)),
      });
    }
    /* colis laissé OUVERT : à terminer dans l'IHM */
  }

  /* réappros en attente + blocage qualité + inventaire en cours */
  d.reapproDetecter();
  const bloquable = db().stock.find(s => s.qteReservee === 0 && s.statut === 'DISPO'
    && db().emplacements.find(e => e.code === s.emplacement)?.zone === 'RESERVE');
  if (bloquable) d.stockBloquer(bloquable.id, true, 'NADIA');
  const inventoriable = db().emplacements.find(e => e.zone === 'RESERVE'
    && db().stock.some(s => s.emplacement === e.code)
    && !db().stock.some(s => s.emplacement === e.code && s.qteReservee > 0));
  if (inventoriable) d.inventaireCreer(inventoriable.code);

  d.reglerHorloge(null);
}

/* ---------- Statistiques finales ---------- */
function statistiques() {
  const donnees = store.getDb();
  const parStatut = {};
  for (const c of donnees.commandes) parStatut[c.statut] = (parStatut[c.statut] || 0) + 1;
  console.log('\n================ BASE GÉNÉRÉE ================');
  console.log(`  Base                : ${store.DATA_FILE}`);
  console.log(`  Articles            : ${donnees.articles.length}`);
  console.log(`  Emplacements        : ${donnees.emplacements.length}`);
  console.log(`  Tiers               : ${donnees.tiers.length} + ${donnees.transporteurs.length} transporteurs`);
  console.log(`  Lignes de stock     : ${donnees.stock.length}`);
  console.log(`  Utilisateurs        : ${donnees.utilisateurs.length} (ADMIN/admin123, CHEF/chef123, opérateurs PIN 1234)`);
  console.log(`  Supports (palettes) : ${donnees.supports.length} (${donnees.supports.filter(s => s.statut === 'ACTIF').length} actifs)`);
  console.log(`  Attendus            : ${donnees.attendus.length}`);
  console.log(`  Commandes           : ${donnees.commandes.length}  ${JSON.stringify(parStatut)}`);
  console.log(`  Vagues              : ${donnees.vagues.length}`);
  console.log(`  Missions            : ${donnees.missions.length} (${donnees.missions.filter(m => m.statut === 'EN_ATTENTE').length} en attente)`);
  console.log(`  Colis               : ${donnees.colis.length}`);
  console.log(`  Chargements         : ${donnees.chargements.length}  (le TMS les importe via l'API)`);
  console.log(`  Inventaires         : ${donnees.inventaires.length}`);
  console.log(`  Mouvements          : ${donnees.mouvements.length}`);
  console.log('==============================================');
}

if (require.main === module) {
  (async () => {
    const debut = Date.now();
    await store.preparer();
    store.enLot(seedRealiste);
    await store.valider();
    statistiques();
    console.log(`Généré en ${((Date.now() - debut) / 1000).toFixed(1)} s`);
  })().catch(e => { console.error(e); process.exit(1); });
}
module.exports = { seedRealiste };
