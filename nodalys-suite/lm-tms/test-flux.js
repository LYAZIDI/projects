'use strict';
/* Tests du métier LM-TMS (sans WMS ni serveur HTTP).
 * Lancement : node test-flux.js — réinitialise la base TMS. */

const store = require('./lib/store');
const tms = require('./lib/tms');

let etape = 0;
function ok(libelle, condition) {
  etape++;
  if (!condition) { console.error(`ECHEC  ${etape}. ${libelle}`); process.exit(1); }
  console.log(`OK     ${etape}. ${libelle}`);
}

store.reinitialiser();
const db = store.getDb();

/* ---------- 1. Transporteurs & grilles ---------- */
ok('upsert transporteur : création puis mise à jour du nom',
   tms.transporteurUpsert('TRP-TEST', 'Test Express').cree === true
   && tms.transporteurUpsert('TRP-TEST', 'Test Express SA').cree === false
   && db.transporteurs[0].nom === 'Test Express SA');
tms.transporteurModifier('TRP-TEST', { delaiJours: 2 });
tms.transporteurUpsert('TRP-LENT', 'Éco Lent');
tms.transporteurModifier('TRP-LENT', { delaiJours: 5 });

tms.grilleCreer({ transporteur: 'TRP-TEST', service: 'COLIS',
  tranches: [{ poidsMax: 1, prix: 7 }, { poidsMax: 5, prix: 10 }, { poidsMax: 10, prix: 15 }],
  prixKgSup: 1, supplementCarburant: 0 });
tms.grilleCreer({ transporteur: 'TRP-LENT', service: 'COLIS',
  tranches: [{ poidsMax: 5, prix: 6 }, { poidsMax: 10, prix: 9 }],
  prixKgSup: 0.5, supplementCarburant: 10 });

/* ---------- 2. Coûts ---------- */
ok('coût sur tranche exacte (4 kg = 10 €)',
   tms.coutCalculer('TRP-TEST', 'COLIS', 4).cout === 10);
ok('coût au-delà de la dernière tranche (12 kg = 15 + 2×1 €)',
   tms.coutCalculer('TRP-TEST', 'COLIS', 12).cout === 17);
ok('surcharge carburant appliquée (4 kg LENT = 6 × 1,10 = 6,6 €)',
   tms.coutCalculer('TRP-LENT', 'COLIS', 4).cout === 6.6);
const simulation = tms.simulerCouts(4);
ok('simulation triée : le moins cher en premier',
   simulation.length === 2 && simulation[0].transporteur === 'TRP-LENT');

/* ---------- 3. Expéditions (payload venant du WMS) ---------- */
const depart = new Date(Date.now() - 3 * 86400000).toISOString();
const expedition = tms.expeditionEnregistrer({
  chargement: 'CH000042', transporteur: 'TRP-TEST', dateDepart: depart,
  nbColis: 3, poids: 7.5, commandes: ['CD000010', 'CD000011'],
});
ok('expédition créée depuis le payload WMS (coût 15 € pour 7,5 kg)',
   expedition.coutEstime === 15 && expedition.statut === 'ENLEVEE' && expedition.nbColis === 3);
ok('date promise = départ + délai transporteur (2 j)',
   expedition.dateLivraisonPrevue === new Date(new Date(depart).getTime() + 2 * 86400000).toISOString().slice(0, 10));
let erreurDoublon = null;
try { tms.expeditionEnregistrer({ chargement: 'CH000042', transporteur: 'TRP-TEST', poids: 1 }); }
catch (e) { erreurDoublon = e; }
ok('chargement déjà connu refusé (idempotence du webhook)', erreurDoublon && erreurDoublon.metier);
ok('transporteur inconnu créé automatiquement à la volée',
   tms.expeditionEnregistrer({ chargement: 'CH000043', transporteur: 'TRP-NOUVEAU', poids: 2 })
   && db.transporteurs.some(t => t.code === 'TRP-NOUVEAU'));

/* ---------- 4. Suivi ---------- */
tms.expeditionEvenement(expedition.id, { statut: 'EN_TRANSIT', lieu: 'Hub Lyon' });
tms.expeditionEvenement(expedition.id, { statut: 'LIVREE', lieu: 'Client' });
const livree = db.expeditions.find(e => e.id === expedition.id);
ok('suivi : LIVREE, date réelle posée, 3 événements',
   livree.statut === 'LIVREE' && livree.dateLivraisonReelle !== '' && livree.evenements.length === 3);

/* ---------- 5. Pré-facturation ---------- */
const conforme = tms.factureSaisir({ transporteur: 'TRP-TEST', numero: 'F-1',
  lignes: [{ expedition: expedition.id, montant: 15 }] });
ok('facture au coût théorique -> A_VALIDER', conforme.statut === 'A_VALIDER');
const litige = tms.factureSaisir({ transporteur: 'TRP-TEST', numero: 'F-2',
  lignes: [{ expedition: expedition.id, montant: 17.5 }] });
ok('facture avec +16 % d\'écart -> LITIGE automatique', litige.statut === 'LITIGE');

/* ---------- 6. KPI + persistance ---------- */
const kpi = tms.kpiTransport();
ok('KPI cohérents', kpi.totalExpeditions === 2 && kpi.facturesEnLitige === 1);
/* SQLite si better-sqlite3 se charge, sinon repli JSON (Node 24) ou Turso */
ok('base dédiée au TMS', store.modeTurso || /tms\.(db|json)$/.test(store.DATA_FILE));

console.log('\nMétier TMS valide. Pour la base de démonstration complète :');
console.log('démarrez le WMS puis lancez "node lib/seed.js" (import réel par API).');
