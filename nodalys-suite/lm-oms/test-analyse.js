'use strict';
/* Tests du pré-remplissage par Jev (lib/analyse.js), sans réseau :
 * les réponses de l'API TypeSafe sont simulées. Lancement : node test-analyse.js */

const analyse = require('./lib/analyse');

let etape = 0;
function ok(libelle, condition) {
  etape++;
  if (!condition) { console.error(`ECHEC  ${etape}. ${libelle}`); process.exit(1); }
  console.log(`OK     ${etape}. ${libelle}`);
}

const texte = `Bonjour,
Merci de nous livrer le 2026-07-20 (ou le 21/07) :
- 10 T-shirts coton taille M
- 4 cartons de TEX-013
Livraison au 20 rue des Halles, Lille. Tél 0320123456.
La Boutique du Coin`;

const candidats = analyse.quantitesCandidates(texte);
ok('quantités candidates : 10, 4 et le numéro de rue 20 ; ni dates, ni code article, ni téléphone',
   JSON.stringify(candidats.map(c => c.qte)) === '[10,4,20]');

const marque = analyse.texteMarque(texte, candidats);
ok('marqueurs insérés devant chaque quantité', marque.includes('[Q1]10 T-shirts') && marque.includes('[Q3]20 rue'));

const clients = [
  { code: 'CLI-001', nom: 'La Boutique du Coin', ville: 'Lille', adresse: '20 rue des Halles' },
  { code: 'CLI-002', nom: 'WebShop.fr', ville: 'Metz' },
];
const articles = [
  { code: 'TEX-002', designation: 'T-shirt coton T.M' },
  { code: 'TEX-013', designation: 'Sweat capuche T.L' },
];
const { state, questions } = analyse.construireRequete(texte, clients, articles);
ok('une question client + une question par quantité candidate',
   Object.keys(questions).join() === 'client,ligne_1,ligne_2,ligne_3');
ok('critères : catalogue + « aucun », clients + « aucun »',
   'aucun' in questions.ligne_1.criteria && questions.ligne_1.criteria['TEX-002'] === 'T-shirt coton T.M'
   && questions.client.criteria['CLI-001'].includes('Lille') && 'aucun' in questions.client.criteria);
ok('état : texte marqué sous `commande`', state.commande === marque);

const proposition = analyse.interpreter({
  client: { type: 'choice', choice: 'CLI-001', confidence: 0.92 },
  ligne_1: { type: 'choice', choice: 'TEX-002', confidence: 0.81 },
  ligne_2: { type: 'choice', choice: 'TEX-013', confidence: 0.3 },
  ligne_3: { type: 'choice', choice: 'aucun', confidence: 0.95 },
}, candidats);
ok('client retenu, non signalé', proposition.client === 'CLI-001' && !proposition.clientAVerifier);
ok('deux lignes ; le numéro de rue écarté',
   proposition.lignes.length === 2 && proposition.lignes[0].article === 'TEX-002' && proposition.lignes[0].qte === 10);
ok('ligne peu sûre signalée « à vérifier »', proposition.lignes[1].aVerifier && !proposition.lignes[0].aVerifier);

const doublon = analyse.interpreter({
  client: { type: 'choice', choice: 'aucun', confidence: 0.6 },
  ligne_1: { type: 'choice', choice: 'TEX-002', confidence: 0.9 },
  ligne_2: { type: 'choice', choice: 'TEX-002', confidence: 0.7 },
  ligne_3: { type: 'choice', choice: 'aucun', confidence: 0.9 },
}, candidats);
ok('même article cité deux fois : quantités additionnées', doublon.lignes.length === 1 && doublon.lignes[0].qte === 14);
ok('client « aucun » : laissé vide et signalé', doublon.client === '' && doublon.clientAVerifier);

console.log('\nPré-remplissage Jev : tous les tests passent.');
