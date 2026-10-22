'use strict';
/* ============================================================
 *  Seed LM-OMS - démonstration d'intégration réelle :
 *   1. synchronise les clients depuis le LM-WMS
 *   2. crée les canaux de vente avec leurs règles transporteur
 *   3. crée des commandes multi-canaux sur les vrais articles WMS
 *   4. les valide (stock WMS réel + simulation TMS réelle)
 *   5. en transmet une partie au WMS (vraies commandes créées)
 *
 *  PRÉREQUIS : LM-WMS (8747) et LM-TMS (8748) doivent tourner.
 *  Lancement : node lib/seed.js
 * ============================================================ */

const store = require('./store');
const oms = require('./oms');
const suite = require('./suite-client');
const integration = require('./integration');

function mulberry32(graine) {
  return function () {
    graine |= 0; graine = (graine + 0x6D2B79F5) | 0;
    let t = Math.imul(graine ^ (graine >>> 15), 1 | graine);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const alea = mulberry32(20260713);
const entier = (min, max) => min + Math.floor(alea() * (max - min + 1));
const parmi = t => t[Math.floor(alea() * t.length)];
const dansNJours = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

async function seedOms() {
  console.log('Vérification des liaisons…');
  const [wms, tms] = await Promise.all([
    suite.etatLiaison(suite.config.wmsUrl), suite.etatLiaison(suite.config.tmsUrl),
  ]);
  if (!wms.joignable) {
    console.error(`ERREUR : le LM-WMS ne répond pas sur ${wms.url}. Démarrez-le d'abord.`);
    process.exit(1);
  }
  if (!tms.joignable) console.warn(`ATTENTION : TMS injoignable (${tms.url}) — transporteurs non affectés.`);

  console.log('Réinitialisation de la base OMS…');
  store.reinitialiser();

  console.log('1. Synchronisation des clients depuis le WMS…');
  const sync = await integration.synchroniserClients();
  console.log(`   ${sync.total} clients (${sync.nouveaux} créés)`);

  console.log('2. Canaux de vente…');
  oms.canalCreer({ code: 'SITE-WEB', nom: 'Boutique en ligne', regleTransporteur: 'MOINS_CHER', prioriteDefaut: 5 });
  oms.canalCreer({ code: 'MARKETPLACE', nom: 'Marketplace (Amazon…)', regleTransporteur: 'PLUS_RAPIDE', prioriteDefaut: 3 });
  oms.canalCreer({ code: 'B2B', nom: 'Grossistes B2B', regleTransporteur: 'TRP-SCHENK', prioriteDefaut: 4 });
  oms.canalCreer({ code: 'TELEPHONE', nom: 'Prises de commande téléphone', regleTransporteur: 'MOINS_CHER', prioriteDefaut: 2 });

  console.log('3. Commandes multi-canaux sur les articles réels du WMS…');
  const articles = await suite.listerArticles();
  const clients = store.getDb().clients;
  const canaux = ['SITE-WEB', 'SITE-WEB', 'SITE-WEB', 'MARKETPLACE', 'MARKETPLACE', 'B2B', 'TELEPHONE'];

  const creees = [];
  for (let i = 0; i < 18; i++) {
    const nbLignes = entier(1, 4);
    const selection = [];
    while (selection.length < nbLignes) {
      const article = parmi(articles);
      if (!selection.find(l => l.article === article.code)) {
        selection.push({ article: article.code, qte: article.pcb * entier(1, 2) });
      }
    }
    creees.push(oms.commandeCreer({
      canal: parmi(canaux),
      client: parmi(clients).code,
      dateLivraisonSouhaitee: dansNJours(entier(1, 4)),
      lignes: selection,
    }));
  }
  /* une commande volontairement invendable : quantité énorme */
  const enorme = oms.commandeCreer({
    canal: 'B2B', client: parmi(clients).code, dateLivraisonSouhaitee: dansNJours(2),
    lignes: [{ article: parmi(articles).code, qte: 99999 }],
  });
  creees.push(enorme);
  console.log(`   ${creees.length} commandes reçues`);

  console.log('4. Validation (stock WMS réel + simulation TMS réelle)…');
  let validees = 0, ruptures = 0;
  for (const commande of creees.slice(0, 14)) {   // 5 restent RECUE (file d'attente du matin)
    const resultat = await integration.validerCommande(commande.id);
    if (resultat.statut === 'VALIDEE') validees++; else ruptures++;
  }
  await integration.validerCommande(enorme.id);   // -> EN_RUPTURE garanti
  ruptures++;
  console.log(`   ${validees} validées, ${ruptures} en rupture`);

  console.log('5. Transmission au WMS d\'une partie des validées…');
  const aTransmettre = store.getDb().commandes.filter(c => c.statut === 'VALIDEE').slice(0, 8);
  for (const commande of aTransmettre) {
    await integration.transmettreCommande(commande.id);
  }
  console.log(`   ${aTransmettre.length} commandes transmises (visibles dans le WMS)`);

  await integration.rafraichirSuivi();

  const db = store.getDb();
  const parStatut = {};
  for (const c of db.commandes) parStatut[c.statut] = (parStatut[c.statut] || 0) + 1;
  console.log('\n================ BASE OMS GÉNÉRÉE ================');
  console.log(`  Base       : ${store.DATA_FILE}`);
  console.log(`  Canaux     : ${db.canaux.length}`);
  console.log(`  Clients    : ${db.clients.length}`);
  console.log(`  Commandes  : ${db.commandes.length}  ${JSON.stringify(parStatut)}`);
  console.log('==================================================');
}

if (require.main === module) {
  (async () => {
    await store.preparer();
    await seedOms();
    await store.valider();
  })().catch(e => { console.error(e); process.exit(1); });
}
module.exports = { seedOms };
