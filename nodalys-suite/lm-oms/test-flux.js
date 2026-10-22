'use strict';
/* Tests du métier LM-OMS (sans WMS/TMS ni serveur : les données
 * externes sont injectées). Lancement : node test-flux.js */

const store = require('./lib/store');
const oms = require('./lib/oms');

let etape = 0;
function ok(libelle, condition) {
  etape++;
  if (!condition) { console.error(`ECHEC  ${etape}. ${libelle}`); process.exit(1); }
  console.log(`OK     ${etape}. ${libelle}`);
}

store.reinitialiser();
const db = store.getDb();

/* ---------- Référentiels ---------- */
oms.canalCreer({ code: 'WEB', nom: 'Site web', regleTransporteur: 'MOINS_CHER', prioriteDefaut: 5 });
oms.canalCreer({ code: 'MARKET', nom: 'Marketplace', regleTransporteur: 'PLUS_RAPIDE', prioriteDefaut: 3 });
oms.canalCreer({ code: 'B2B', nom: 'Grossistes', regleTransporteur: 'TRP-PALETTE', prioriteDefaut: 4 });
let erreurDoublon = null;
try { oms.canalCreer({ code: 'WEB' }); } catch (e) { erreurDoublon = e; }
ok('canal en double refusé', erreurDoublon && erreurDoublon.metier);
ok('client upsert : création puis mise à jour',
   oms.clientUpsert({ code: 'CLI-001', nom: 'Boutique' }).cree === true
   && oms.clientUpsert({ code: 'CLI-001', nom: 'Boutique SARL' }).cree === false
   && db.clients[0].nom === 'Boutique SARL');

/* ---------- Données externes simulées (WMS + TMS) ---------- */
const articles = [
  { code: 'ART-A', poidsUnitaire: 0.5, designation: 'Article A' },
  { code: 'ART-B', poidsUnitaire: 2, designation: 'Article B' },
];
const disponibles = { 'ART-A': 100, 'ART-B': 3 };
const simulation = [
  { transporteur: 'TRP-ECO', nom: 'Éco', service: 'COLIS', delaiJours: 4, cout: 8 },
  { transporteur: 'TRP-MOYEN', nom: 'Moyen', service: 'COLIS', delaiJours: 2, cout: 12 },
  { transporteur: 'TRP-VITE', nom: 'Express', service: 'EXPRESS', delaiJours: 1, cout: 19 },
];

/* ---------- Cycle nominal : règle MOINS_CHER ---------- */
const commande = oms.commandeCreer({ canal: 'WEB', client: 'CLI-001',
  lignes: [{ article: 'ART-A', qte: 10 }] });
ok('commande créée RECUE avec numéro OM', commande.statut === 'RECUE' && /^OM\d{6}$/.test(commande.numero));
oms.commandeValider(commande.id, { articles, disponibles, simulation });
const validee = db.commandes.find(c => c.id === commande.id);
ok('validée : poids calculé (10 × 0,5 = 5 kg)', validee.statut === 'VALIDEE' && validee.poidsEstime === 5);
ok('règle MOINS_CHER : TRP-ECO choisi à 8 €',
   validee.transporteurChoisi === 'TRP-ECO' && validee.coutTransportEstime === 8
   && validee.motifTransporteur.includes('moins cher'));
oms.commandeMarquerTransmise(commande.id, 'CD000999');
ok('transmise au WMS avec référence croisée',
   validee.statut === 'TRANSMISE' && validee.wmsNumero === 'CD000999');

/* ---------- Rupture puis revalidation ---------- */
const rupture = oms.commandeCreer({ canal: 'WEB', client: 'CLI-001',
  lignes: [{ article: 'ART-B', qte: 5 }] });
oms.commandeValider(rupture.id, { articles, disponibles, simulation });
ok('stock insuffisant -> EN_RUPTURE avec le manquant détaillé',
   db.commandes.find(c => c.id === rupture.id).statut === 'EN_RUPTURE'
   && db.commandes.find(c => c.id === rupture.id).manquants[0].article === 'ART-B');
oms.commandeValider(rupture.id, { articles, disponibles: { 'ART-B': 50 }, simulation });
ok('revalidable après réappro -> VALIDEE',
   db.commandes.find(c => c.id === rupture.id).statut === 'VALIDEE');

/* ---------- Règles PLUS_RAPIDE et transporteur imposé ---------- */
const rapide = oms.commandeCreer({ canal: 'MARKET', client: 'CLI-001',
  lignes: [{ article: 'ART-A', qte: 2 }] });
oms.commandeValider(rapide.id, { articles, disponibles, simulation });
ok('règle PLUS_RAPIDE : Express choisi (1 j) malgré 19 €',
   db.commandes.find(c => c.id === rapide.id).transporteurChoisi === 'TRP-VITE');
const impose = oms.commandeCreer({ canal: 'B2B', client: 'CLI-001',
  lignes: [{ article: 'ART-A', qte: 4 }] });
oms.commandeValider(impose.id, { articles, disponibles, simulation });
ok('transporteur imposé par le canal B2B',
   db.commandes.find(c => c.id === impose.id).transporteurChoisi === 'TRP-PALETTE');

/* ---------- TMS injoignable ---------- */
const sansTms = oms.commandeCreer({ canal: 'WEB', client: 'CLI-001',
  lignes: [{ article: 'ART-A', qte: 1 }] });
oms.commandeValider(sansTms.id, { articles, disponibles, simulation: null });
ok('TMS injoignable : VALIDEE quand même, à affecter manuellement',
   db.commandes.find(c => c.id === sansTms.id).statut === 'VALIDEE'
   && db.commandes.find(c => c.id === sansTms.id).motifTransporteur.includes('injoignable'));

/* ---------- Suivi : projection WMS puis TMS ---------- */
oms.suiviRafraichir({
  commandesWms: [{ numero: 'CD000999', referenceExterne: commande.numero, statut: 'EXPEDIEE' }],
  expeditionsTms: [{ numero: 'EXP000123', commandes: ['CD000999'], statut: 'LIVREE',
                     dateLivraisonReelle: '2026-07-12T10:00:00Z' }],
});
ok('suivi : WMS EXPEDIEE + TMS LIVREE -> commande OMS LIVREE',
   validee.statut === 'LIVREE' && validee.tmsExpedition === 'EXP000123'
   && validee.dateLivraisonReelle !== '');

/* ---------- Garde-fous ---------- */
let erreurAnnulation = null;
try { oms.commandeAnnuler(commande.id); } catch (e) { erreurAnnulation = e; }
ok('annulation refusée après transmission au WMS', erreurAnnulation && erreurAnnulation.metier);

/* ---------- KPI ---------- */
const kpi = oms.kpi();
ok('KPI tour de contrôle cohérents',
   kpi.totalCommandes === 5 && kpi.parStatut.LIVREE === 1 && kpi.aTransmettre === 4);
/* SQLite si better-sqlite3 se charge, sinon repli JSON (Node 24) ou Turso */
ok('base dédiée à l\'OMS', store.modeTurso || /oms\.(db|json)$/.test(store.DATA_FILE));

console.log('\nMétier OMS valide. Pour la base de démonstration complète :');
console.log('démarrez WMS + TMS puis lancez "node lib/seed.js".');
