'use strict';
/* Test de bout en bout du flux WMS complet (sans serveur HTTP).
 * Lancement : node test-flux.js   — réinitialise le jeu de démo. */

const { seed } = require('./lib/seed');
const store = require('./lib/store');
const d = require('./lib/domaine');

let etape = 0;
function ok(libelle, condition) {
  etape++;
  if (!condition) { console.error(`ECHEC  ${etape}. ${libelle}`); process.exit(1); }
  console.log(`OK     ${etape}. ${libelle}`);
}

seed();
const db = store.getDb();

/* ---------- 1. Réception d'un attendu ---------- */
const attendu = db.attendus[0];   // FRN-TEXTIL : t-shirts + jeans
const r1 = d.receptionner(attendu.id, 0, { qte: 100, operateur: 'OP-RECEP' });
ok('réception ligne 1 : stock sur quai + mission rangement', r1.mission.type === 'RANGEMENT' && r1.mission.dest !== '');
const r2 = d.receptionner(attendu.id, 1, { qte: 100, operateur: 'OP-RECEP' });
const r3 = d.receptionner(attendu.id, 2, { qte: 40, operateur: 'OP-RECEP' });
ok('attendu clôturé quand tout est reçu', db.attendus[0].statut === 'CLOTURE');

/* réception avec lot/DLC obligatoires */
let erreurLot = null;
try { d.receptionner(db.attendus[1].id, 0, { qte: 240, operateur: 'OP-RECEP' }); }
catch (e) { erreurLot = e; }
ok('lot obligatoire refusé pour article géré au lot', erreurLot && erreurLot.metier);
d.receptionner(db.attendus[1].id, 0, { qte: 240, lot: 'LOT2608C', dlc: '2026-12-31', operateur: 'OP-RECEP' });

/* ---------- 2. Rangement ---------- */
const rangements = db.missions.filter(m => m.type === 'RANGEMENT' && m.statut === 'EN_ATTENTE');
ok('4 missions de rangement en attente', rangements.length === 4);
for (const m of rangements) d.missionValider(m.id, { operateur: 'OP-CACES' });
ok('plus de stock sur les quais après rangement',
   db.stock.filter(s => s.emplacement.startsWith('REC')).length === 0);

/* ---------- 3. Vague + picking ---------- */
const idsCommandes = db.commandes.slice(0, 3).map(c => c.id);
const vague = d.vagueCreer({ commandes: idsCommandes });
const { ruptures } = d.vagueLancer(vague.id);
ok('vague lancée sans rupture', ruptures.length === 0);
const missionsPicking = db.missions.filter(m => m.vague === vague.id);
ok('missions picking générées et séquencées',
   missionsPicking.length > 0 && missionsPicking.every(m => m.ordre > 0));

/* FEFO : le chocolat doit partir du lot à DLC la plus courte */
const missionChoco = missionsPicking.find(m => m.article === 'ART-CHOCO-N');
ok('FEFO : chocolat servi sur le lot LOT2606A (DLC la plus courte)', missionChoco.lot === 'LOT2606A');

for (const m of missionsPicking) d.missionValider(m.id, { operateur: 'OP-PICK' });
ok('commandes de la vague PREPAREE',
   idsCommandes.every(id => db.commandes.find(c => c.id === id).statut === 'PREPAREE'));
ok('vague TERMINEE', db.vagues.find(v => v.id === vague.id).statut === 'TERMINEE');

/* ---------- 4. Réappro picking ---------- */
const reappros = d.reapproDetecter();
ok('réappro picking détecté après consommation', reappros.length > 0);
d.missionValider(reappros[0].id, { operateur: 'OP-CACES' });

/* ---------- 5. Colisage SSCC ---------- */
const commande = db.commandes[0];
const colis = d.colisCreer(commande.id);
ok('SSCC sur 18 chiffres', /^\d{18}$/.test(colis.sscc));
for (const l of commande.lignes) d.colisAjouterLigne(colis.id, { article: l.article, qte: l.qtePreparee });
ok('commande EMBALLEE une fois tout emballé',
   db.commandes.find(c => c.id === commande.id).statut === 'EMBALLEE');
d.colisFermer(colis.id);

/* ---------- 6. Chargement + expédition ---------- */
const chargement = d.chargementCreer({ transporteur: 'TRP-CHRONO' });
d.chargementAjouterColis(chargement.id, colis.sscc);
d.chargementExpedier(chargement.id, 'OP-EXPED');
ok('commande EXPEDIEE au départ du chargement',
   db.commandes.find(c => c.id === commande.id).statut === 'EXPEDIEE');

/* ---------- 7. Inventaire ---------- */
const emplacement = 'P1-01';
const inv = d.inventaireCreer(emplacement);
const theorique = inv.lignes[0].qteTheorique;
d.inventaireCompter(inv.id, [{ article: inv.lignes[0].article, lot: inv.lignes[0].lot,
                               qteComptee: theorique - 2 }], 'OP-INV');
d.inventaireValider(inv.id, 'OP-INV');
const apres = db.stock.find(s => s.emplacement === emplacement);
ok('écart d\'inventaire appliqué au stock', apres.qte === theorique - 2);
ok('mouvement INVENTAIRE tracé', db.mouvements.some(m => m.type === 'INVENTAIRE' && m.qte === -2));

/* ---------- 8. Dashboard ---------- */
const kpi = d.dashboard();
ok('dashboard calculé', kpi.totalCommandes === 4 && kpi.commandesParStatut.EXPEDIEE === 1);

/* ---------- 9. Utilisateurs & rôles ---------- */
d.utilisateurCreer({ code: 'TESTOP', nom: 'Opérateur Test', role: 'OPERATEUR', mdp: 'pin1234' });
ok('authentification acceptée avec le bon mot de passe',
   d.utilisateurAuthentifier('TESTOP', 'pin1234') !== null);
ok('authentification refusée avec un mauvais mot de passe',
   d.utilisateurAuthentifier('TESTOP', 'faux') === null);
ok('mot de passe stocké haché (jamais en clair)',
   !JSON.stringify(db.utilisateurs).includes('pin1234'));
ok('hiérarchie des rôles respectée',
   d.roleSuffisant('ADMIN', 'SUPERVISEUR') && d.roleSuffisant('SUPERVISEUR', 'OPERATEUR')
   && !d.roleSuffisant('OPERATEUR', 'SUPERVISEUR'));

/* ---------- 10. Supports / palettes ---------- */
d.articleCreer({ code: 'ART-PALETTE', designation: 'Article test palette', pcb: 10 });
const attenduSupport = d.attenduCreer({ fournisseur: 'FRN-TEXTIL', lignes: [
  { article: 'ART-PALETTE', qtePrevue: 30 },
]});
const rSupport = d.receptionner(attenduSupport.id, 0, { qte: 30, support: true, operateur: 'TESTOP' });
const sscc = rSupport.mission.support;
ok('support SSCC créé à la réception', /^\d{18}$/.test(sscc)
   && db.supports.some(s => s.sscc === sscc && s.statut === 'ACTIF'));
d.missionValider(rSupport.mission.id, { operateur: 'TESTOP' });
const supportRange = db.supports.find(s => s.sscc === sscc);
ok('rangement du support entier : contenu et support déplacés ensemble',
   supportRange.emplacement === rSupport.mission.dest
   && db.stock.some(s => s.support === sscc && s.emplacement === supportRange.emplacement));
d.supportDeplacer(sscc, 'R2-03-2', 'TESTOP');
ok('déplacement manuel du support', db.supports.find(s => s.sscc === sscc).emplacement === 'R2-03-2'
   && db.stock.some(s => s.support === sscc && s.emplacement === 'R2-03-2'));

/* dissolution : la palette entièrement consommée par le picking devient VIDE */
const cmdPalette = d.commandeCreer({ client: 'CLI-BOUTIK', lignes: [{ article: 'ART-PALETTE', qte: 30 }] });
const vaguePalette = d.vagueCreer({ commandes: [cmdPalette.id] });
d.vagueLancer(vaguePalette.id);
for (const m of db.missions.filter(x => x.vague === vaguePalette.id)) {
  d.missionValider(m.id, { operateur: 'TESTOP' });
}
ok('support VIDE après consommation complète au picking',
   db.supports.find(s => s.sscc === sscc).statut === 'VIDE');

/* ---------- 11. Connecteur EDI ---------- */
const edi = require('./lib/edi');
const fs = require('fs');
const path = require('path');
edi.initialiser();

fs.writeFileSync(path.join(edi.REPERTOIRES.entrant, 'commandes_test.csv'),
  'numeroExterne;client;dateLivraison;transporteur;priorite;article;qte\n' +
  'TST-001;CLI-WEBSHOP;2026-12-01;TRP-COLIS;2;ART-TSHIRT-L;5\n' +
  'TST-001;CLI-WEBSHOP;;;;ART-MUG-BLC;3\n', 'utf8');
let resultatsEdi = edi.scannerEntrant();
ok('import EDI ORDERS accepté', resultatsEdi.some(r => r.fichier === 'commandes_test.csv' && r.statut === 'OK'));
ok('commande créée depuis le fichier EDI',
   db.commandes.some(c => c.referenceExterne === 'TST-001' && c.lignes.length === 2));

fs.writeFileSync(path.join(edi.REPERTOIRES.entrant, 'commandes_test2.csv'),
  'numeroExterne;client;dateLivraison;transporteur;priorite;article;qte\n' +
  'TST-001;CLI-WEBSHOP;;;;ART-TSHIRT-L;5\n', 'utf8');
resultatsEdi = edi.scannerEntrant();
ok('doublon EDI rejeté (référence externe déjà importée)',
   resultatsEdi.some(r => r.fichier === 'commandes_test2.csv' && r.statut === 'ERREUR'));

const fichierInvrpt = edi.exporterInvrpt();
ok('export INVRPT produit', fs.existsSync(path.join(edi.REPERTOIRES.sortant, fichierInvrpt)));
const fichierRecadv = edi.exporterRecadv(db.attendus[0]);
ok('export RECADV produit', fs.existsSync(path.join(edi.REPERTOIRES.sortant, fichierRecadv)));
ok('échanges journalisés en base', db.echangesEdi.length >= 4);

console.log('\nFlux complet valide. Le jeu de données de démo a été consommé :');
console.log('relancez "node lib/seed-realiste.js" pour repartir d\'un entrepôt réaliste.');
