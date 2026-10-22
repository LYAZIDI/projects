'use strict';
/* ============================================================
 *  Jeu de données de démonstration - entrepôt e-commerce fictif.
 *  Lancement : node lib/seed.js  (réinitialise data/wms.json)
 * ============================================================ */

const store = require('./store');
const d = require('./domaine');

function seed() {
  store.reinitialiser();

  /* ---------- Emplacements ---------- */
  d.emplacementCreer({ code: 'REC-01', zone: 'RECEPTION', type: 'QUAI', capacite: 5000 });
  d.emplacementCreer({ code: 'REC-02', zone: 'RECEPTION', type: 'QUAI', capacite: 5000 });
  d.emplacementCreer({ code: 'EXP-01', zone: 'EXPEDITION', type: 'QUAI', capacite: 5000 });
  /* réserve palettier : allées R1/R2, 3 travées, 2 niveaux */
  for (const allee of ['R1', 'R2']) {
    for (let travee = 1; travee <= 3; travee++) {
      for (let niveau = 1; niveau <= 2; niveau++) {
        d.emplacementCreer({
          code: `${allee}-${String(travee).padStart(2, '0')}-${niveau}`,
          zone: 'RESERVE', allee, type: 'PALETTE', capacite: 300,
        });
      }
    }
  }
  /* picking étagères : allées P1/P2, 5 casiers */
  for (const allee of ['P1', 'P2']) {
    for (let casier = 1; casier <= 5; casier++) {
      d.emplacementCreer({
        code: `${allee}-${String(casier).padStart(2, '0')}`,
        zone: 'PICKING', allee, type: 'ETAGERE', capacite: 80,
      });
    }
  }

  /* ---------- Articles ---------- */
  d.articleCreer({ code: 'ART-TSHIRT-M', designation: 'T-shirt coton blanc taille M', ean: '3760012340017',
    pcb: 10, classeRotation: 'A', emplacementPicking: 'P1-01', stockMiniPicking: 20, poidsUnitaire: 0.2 });
  d.articleCreer({ code: 'ART-TSHIRT-L', designation: 'T-shirt coton blanc taille L', ean: '3760012340024',
    pcb: 10, classeRotation: 'A', emplacementPicking: 'P1-02', stockMiniPicking: 20, poidsUnitaire: 0.22 });
  d.articleCreer({ code: 'ART-JEAN-40', designation: 'Jean brut coupe droite T40', ean: '3760012340031',
    pcb: 5, classeRotation: 'B', emplacementPicking: 'P1-03', stockMiniPicking: 10, poidsUnitaire: 0.7 });
  d.articleCreer({ code: 'ART-CHOCO-N', designation: 'Tablette chocolat noir 70% 100g', ean: '3760012340048',
    pcb: 24, gereLot: true, gereDLC: true, classeRotation: 'A',
    emplacementPicking: 'P2-01', stockMiniPicking: 48, poidsUnitaire: 0.11 });
  d.articleCreer({ code: 'ART-CAFE-MLU', designation: 'Café moulu arabica 250g', ean: '3760012340055',
    pcb: 12, gereLot: true, gereDLC: true, classeRotation: 'A',
    emplacementPicking: 'P2-02', stockMiniPicking: 24, poidsUnitaire: 0.27 });
  d.articleCreer({ code: 'ART-MUG-BLC', designation: 'Mug céramique blanc 30cl', ean: '3760012340062',
    pcb: 6, classeRotation: 'C', emplacementPicking: 'P2-03', stockMiniPicking: 12, poidsUnitaire: 0.35 });
  d.articleCreer({ code: 'ART-CASQ-BT', designation: 'Casque audio Bluetooth pliable', ean: '3760012340079',
    pcb: 4, gereLot: true, classeRotation: 'B', emplacementPicking: 'P2-04', stockMiniPicking: 8, poidsUnitaire: 0.45 });
  d.articleCreer({ code: 'ART-LESSIVE', designation: 'Lessive liquide écolabel 3L', ean: '3760012340086',
    pcb: 4, classeRotation: 'B', emplacementPicking: 'P2-05', stockMiniPicking: 8, poidsUnitaire: 3.2 });

  /* ---------- Tiers & transporteurs ---------- */
  d.tiersCreer({ code: 'FRN-TEXTIL', nom: 'Textile Import SAS', type: 'FOURNISSEUR', ville: 'Roubaix' });
  d.tiersCreer({ code: 'FRN-EPICER', nom: 'Épicerie Fine Distribution', type: 'FOURNISSEUR', ville: 'Lyon' });
  d.tiersCreer({ code: 'FRN-ELECTR', nom: 'ElectroGros SARL', type: 'FOURNISSEUR', ville: 'Cergy' });
  d.tiersCreer({ code: 'CLI-BOUTIK', nom: 'La Boutique du Coin', type: 'CLIENT', adresse: '12 rue des Halles', ville: 'Dijon' });
  d.tiersCreer({ code: 'CLI-WEBSHOP', nom: 'WebShop.fr', type: 'CLIENT', adresse: 'ZA des Tulipes', ville: 'Orléans' });
  d.tiersCreer({ code: 'CLI-GRDSUD', nom: 'Grand Sud Distribution', type: 'CLIENT', adresse: '4 av. de la Mer', ville: 'Montpellier' });
  d.transporteurCreer({ code: 'TRP-COLIS', nom: 'Colissimo' });
  d.transporteurCreer({ code: 'TRP-CHRONO', nom: 'Chronopost' });
  d.transporteurCreer({ code: 'TRP-AFFRT', nom: 'Affrètement palette' });

  /* ---------- Stock initial (entrées historisées) ---------- */
  const dansNJours = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const stockInitial = [
    /* picking garni */
    { article: 'ART-TSHIRT-M', emplacement: 'P1-01', qte: 60 },
    { article: 'ART-TSHIRT-L', emplacement: 'P1-02', qte: 45 },
    { article: 'ART-JEAN-40',  emplacement: 'P1-03', qte: 25 },
    { article: 'ART-CHOCO-N',  emplacement: 'P2-01', qte: 72, lot: 'LOT2606A', dlc: dansNJours(90) },
    { article: 'ART-CAFE-MLU', emplacement: 'P2-02', qte: 36, lot: 'LOTCAF12', dlc: dansNJours(180) },
    { article: 'ART-MUG-BLC',  emplacement: 'P2-03', qte: 30 },
    { article: 'ART-CASQ-BT',  emplacement: 'P2-04', qte: 12, lot: 'SN-B2406' },
    { article: 'ART-LESSIVE',  emplacement: 'P2-05', qte: 16 },
    /* réserve */
    { article: 'ART-TSHIRT-M', emplacement: 'R1-01-1', qte: 200 },
    { article: 'ART-TSHIRT-L', emplacement: 'R1-01-2', qte: 150 },
    { article: 'ART-JEAN-40',  emplacement: 'R1-02-1', qte: 80 },
    { article: 'ART-CHOCO-N',  emplacement: 'R2-01-1', qte: 240, lot: 'LOT2606A', dlc: dansNJours(90) },
    { article: 'ART-CHOCO-N',  emplacement: 'R2-01-2', qte: 240, lot: 'LOT2607B', dlc: dansNJours(150) },
    { article: 'ART-CAFE-MLU', emplacement: 'R2-02-1', qte: 144, lot: 'LOTCAF12', dlc: dansNJours(180) },
    { article: 'ART-MUG-BLC',  emplacement: 'R1-03-1', qte: 90 },
    { article: 'ART-LESSIVE',  emplacement: 'R2-03-1', qte: 60 },
  ];
  store.mutate(db => {
    for (const s of stockInitial) {
      db.stock.push({ id: db.sequences.stock++, article: s.article, emplacement: s.emplacement,
        lot: s.lot || '', dlc: s.dlc || '', qte: s.qte, qteReservee: 0,
        dateEntree: new Date(Date.now() - 5 * 86400000).toISOString(), statut: 'DISPO' });
      db.mouvements.push({ id: db.sequences.mouvement++,
        date: new Date(Date.now() - 5 * 86400000).toISOString(),
        type: 'RECEPTION', article: s.article, lot: s.lot || '', qte: s.qte,
        source: 'REPRISE', dest: s.emplacement, operateur: 'SYSTEME', reference: 'Stock initial' });
    }
  });

  /* ---------- Attendus de réception ouverts ---------- */
  d.attenduCreer({ fournisseur: 'FRN-TEXTIL', datePrevue: dansNJours(0), lignes: [
    { article: 'ART-TSHIRT-M', qtePrevue: 100 },
    { article: 'ART-TSHIRT-L', qtePrevue: 100 },
    { article: 'ART-JEAN-40', qtePrevue: 40 },
  ]});
  d.attenduCreer({ fournisseur: 'FRN-EPICER', datePrevue: dansNJours(1), lignes: [
    { article: 'ART-CHOCO-N', qtePrevue: 240 },
    { article: 'ART-CAFE-MLU', qtePrevue: 120 },
  ]});
  d.attenduCreer({ fournisseur: 'FRN-ELECTR', datePrevue: dansNJours(2), lignes: [
    { article: 'ART-CASQ-BT', qtePrevue: 24 },
  ]});

  /* ---------- Commandes clients en attente ---------- */
  d.commandeCreer({ client: 'CLI-BOUTIK', priorite: 2, dateLivraison: dansNJours(1),
    transporteur: 'TRP-CHRONO', lignes: [
      { article: 'ART-TSHIRT-M', qte: 12 },
      { article: 'ART-CHOCO-N', qte: 24 },
      { article: 'ART-MUG-BLC', qte: 6 },
  ]});
  d.commandeCreer({ client: 'CLI-WEBSHOP', priorite: 5, dateLivraison: dansNJours(2),
    transporteur: 'TRP-COLIS', lignes: [
      { article: 'ART-TSHIRT-L', qte: 8 },
      { article: 'ART-CAFE-MLU', qte: 12 },
      { article: 'ART-CASQ-BT', qte: 2 },
  ]});
  d.commandeCreer({ client: 'CLI-GRDSUD', priorite: 3, dateLivraison: dansNJours(1),
    transporteur: 'TRP-AFFRT', lignes: [
      { article: 'ART-JEAN-40', qte: 20 },
      { article: 'ART-LESSIVE', qte: 12 },
      { article: 'ART-CHOCO-N', qte: 48 },
  ]});
  d.commandeCreer({ client: 'CLI-WEBSHOP', priorite: 7, dateLivraison: dansNJours(3),
    transporteur: 'TRP-COLIS', lignes: [
      { article: 'ART-MUG-BLC', qte: 4 },
      { article: 'ART-TSHIRT-M', qte: 3 },
  ]});

  console.log('Jeu de démonstration créé dans', store.DATA_FILE);
}

if (require.main === module) seed();
module.exports = { seed };
