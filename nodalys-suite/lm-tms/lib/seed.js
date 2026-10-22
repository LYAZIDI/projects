'use strict';
/* ============================================================
 *  Seed LM-TMS - démonstration d'intégration réelle :
 *   1. synchronise les transporteurs depuis le LM-WMS (API)
 *   2. crée les grilles tarifaires
 *   3. importe les chargements expédiés du WMS (rattrapage)
 *   4. simule le suivi (transit, livraisons, retards, incidents)
 *   5. génère les factures transporteur (avec surfacturations)
 *
 *  PRÉREQUIS : le LM-WMS doit tourner (node server.js dans lm-wms).
 *  Lancement : node lib/seed.js
 * ============================================================ */

const store = require('./store');
const tms = require('./tms');
const wms = require('./wms-client');
const integration = require('./integration');

/* aléa déterministe */
function mulberry32(graine) {
  return function () {
    graine |= 0; graine = (graine + 0x6D2B79F5) | 0;
    let t = Math.imul(graine ^ (graine >>> 15), 1 | graine);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const alea = mulberry32(20260712);
const chance = p => alea() < p;
const parmi = t => t[Math.floor(alea() * t.length)];
const arrondir = x => Math.round(x * 100) / 100;

const HUBS = ['Hub Paris-Nord', 'Hub Lyon Saint-Priest', 'Agence Bordeaux', 'Plateforme Lille', 'Hub Marseille'];

function creerGrilles() {
  const fiches = [
    ['TRP-COLIS', 3, 'Service Pro Colissimo', '3631'],
    ['TRP-CHRONO', 1, 'Support Chronopost', '0969 391 391'],
    ['TRP-DPD', 2, 'Agence DPD Centre', '0821 231 231'],
    ['TRP-GLS', 2, 'GLS France', '0806 806 100'],
    ['TRP-SCHENK', 4, 'Cellule affrètement Schenker', '01 41 66 30 00'],
    ['TRP-FREXP', 1, 'France Express J+1', '0825 033 033'],
    ['TRP-AFFRT', 4, 'Affrètement palette', ''],
  ];
  for (const [code, delaiJours, contact, telephone] of fiches) {
    try { tms.transporteurModifier(code, { delaiJours, contact, telephone }); }
    catch { /* transporteur absent de ce WMS */ }
  }
  const grilles = [
    ['TRP-COLIS', 'COLIS', [[0.5, 4.99], [1, 6.99], [2, 8.49], [5, 11.5], [10, 16.9], [30, 25.9]], 0.9, 5],
    ['TRP-CHRONO', 'EXPRESS', [[1, 14.9], [2, 18.5], [5, 24.9], [10, 33.9], [30, 49.9]], 1.5, 8],
    ['TRP-DPD', 'COLIS', [[1, 5.9], [3, 7.9], [5, 9.9], [10, 13.9], [20, 19.9], [30, 24.9]], 0.8, 6],
    ['TRP-GLS', 'COLIS', [[1, 6.2], [3, 8.1], [5, 10.2], [10, 14.5], [20, 20.5], [30, 26]], 0.85, 6],
    ['TRP-SCHENK', 'PALETTE', [[100, 39], [300, 69], [600, 109], [1000, 159]], 0.12, 10],
    ['TRP-FREXP', 'PALETTE', [[100, 59], [300, 99], [600, 149], [1000, 219]], 0.18, 12],
  ];
  let creees = 0;
  for (const [transporteur, service, tranches, prixKgSup, supplementCarburant] of grilles) {
    try {
      tms.grilleCreer({ transporteur, service,
        tranches: tranches.map(([poidsMax, prix]) => ({ poidsMax, prix })),
        prixKgSup, supplementCarburant });
      creees++;
    } catch { /* transporteur absent */ }
  }
  return creees;
}

function simulerSuivi(expedition) {
  const jour = 86400000;
  const depart = new Date(expedition.dateDepart).getTime();
  const present = Date.now();
  if (depart + jour > present) return;

  tms.expeditionEvenement(expedition.id, { statut: 'EN_TRANSIT',
    date: new Date(depart + jour).toISOString(), lieu: parmi(HUBS), commentaire: 'Tri effectué' });

  if (chance(0.04)) {
    tms.expeditionEvenement(expedition.id, { statut: 'INCIDENT',
      date: new Date(depart + 2 * jour).toISOString(), lieu: parmi(HUBS),
      commentaire: parmi(['Colis endommagé au tri', 'Adresse introuvable', 'Destinataire absent, avisé']) });
    return;
  }
  const retard = chance(0.12) ? jour : 0;
  const dateLivraison = new Date(expedition.dateLivraisonPrevue + 'T14:00:00Z').getTime() + retard;
  if (dateLivraison < present) {
    tms.expeditionEvenement(expedition.id, { statut: 'LIVREE',
      date: new Date(dateLivraison).toISOString(), lieu: 'Livré au destinataire' });
  }
}

function genererFactures() {
  const db = store.getDb();
  const parTransporteur = {};
  for (const e of db.expeditions.filter(x => x.statut === 'LIVREE')) {
    (parTransporteur[e.transporteur] ||= []).push(e);
  }
  let numero = 1;
  let total = 0;
  for (const [transporteur, expeditions] of Object.entries(parTransporteur)) {
    for (let i = 0; i + 3 <= expeditions.length; i += 8) {
      const lot = expeditions.slice(i, i + 8);
      const facture = tms.factureSaisir({
        transporteur,
        numero: `FAC-${transporteur.slice(4)}-${String(numero++).padStart(4, '0')}`,
        dateFacture: lot[lot.length - 1].dateLivraisonReelle.slice(0, 10),
        lignes: lot.map(e => ({
          expedition: e.id,
          montant: arrondir(e.coutEstime * (chance(0.12) ? 1 + (6 + alea() * 8) / 100 : 1)),
        })),
      });
      if (facture.statut === 'A_VALIDER' && chance(0.6)) tms.factureStatuer(facture.id, 'VALIDEE');
      total++;
    }
  }
  return total;
}

async function seedTms() {
  console.log('Vérification de la liaison WMS…');
  const etat = await wms.etatWms();
  if (!etat.joignable) {
    console.error(`ERREUR : le LM-WMS ne répond pas sur ${etat.url}`);
    console.error('Démarrez-le d\'abord :  cd ../lm-wms && node server.js');
    process.exit(1);
  }

  console.log('Réinitialisation de la base TMS…');
  store.reinitialiser();

  console.log('1. Synchronisation des transporteurs depuis le WMS…');
  const sync = await integration.synchroniserTransporteurs();
  console.log(`   ${sync.total} transporteurs (${sync.nouveaux} créés)`);

  console.log('2. Fiches + grilles tarifaires…');
  console.log(`   ${creerGrilles()} grilles créées`);

  console.log('3. Import des chargements expédiés du WMS…');
  const rattrapage = await integration.importerChargements();
  console.log(`   ${rattrapage.importees} expéditions créées`);

  console.log('4. Simulation du suivi (transit, livraisons, incidents)…');
  for (const expedition of rattrapage.expeditions) simulerSuivi(expedition);

  console.log('5. Factures transporteur…');
  console.log(`   ${genererFactures()} factures générées`);

  const db = store.getDb();
  const parStatut = {};
  for (const e of db.expeditions) parStatut[e.statut] = (parStatut[e.statut] || 0) + 1;
  console.log('\n================ BASE TMS GÉNÉRÉE ================');
  console.log(`  Base                : ${store.DATA_FILE}`);
  console.log(`  Transporteurs       : ${db.transporteurs.length}`);
  console.log(`  Grilles tarifaires  : ${db.grillesTarifaires.length}`);
  console.log(`  Expéditions         : ${db.expeditions.length}  ${JSON.stringify(parStatut)}`);
  console.log(`  Factures            : ${db.facturesTransport.length}  (${db.facturesTransport.filter(f => f.statut === 'LITIGE').length} litiges)`);
  console.log('==================================================');
}

if (require.main === module) {
  (async () => {
    await store.preparer();
    await seedTms();
    await store.valider();
  })().catch(e => { console.error(e); process.exit(1); });
}
module.exports = { seedTms };
