# LM-TMS — Transport Management System (suite LM)

Application **autonome** de gestion du transport, compagnon du LM-WMS
(dossier voisin `lm-wms`). Chaque application a son serveur, sa base de
données et son interface — elles communiquent par API, comme les modules
d'une vraie suite d'éditeur.

## Lancement

```bash
npm install          # une fois (better-sqlite3)
node lib/seed.js     # base de démo : import RÉEL depuis le WMS (qui doit tourner)
node server.js       # démarre le TMS
```

| Poste | URL |
|---|---|
| IHM transport | http://localhost:8748/ |
| WMS (entrepôt) | http://localhost:8747/ |

Double-clic possible : `demarrer.bat` (ou `..\demarrer-suite.bat` pour les deux).
Tests métier : `node test-flux.js` (14 contrôles, sans besoin du WMS).

## Intégration avec le LM-WMS

- **Comptes uniques** : la connexion est validée auprès du WMS
  (ADMIN/admin123, CHEF/chef123, opérateurs PIN 1234).
- **Transporteurs** : la liste vient du WMS (bouton « Synchroniser ») ;
  le TMS l'enrichit localement (délais, contacts, grilles) sans jamais
  modifier le référentiel du WMS.
- **Temps réel** : à chaque départ de chargement, le WMS envoie un webhook
  signé (`X-Api-Key`, clé partagée dans `config.json` /
  `lm-wms/integration.json`) → l'expédition est créée avec poids réel et
  coût calculé sur la grille.
- **Rattrapage** : si le TMS était éteint, « Liaison WMS → Importer les
  chargements manquants » resynchronise tout via l'API.
- Si le TMS est injoignable au moment du départ, le WMS n'est **pas bloqué**
  (il journalise et continue).

## Périmètre fonctionnel

- Fiches transporteurs : délais, contacts, actif/inactif.
- **Grilles tarifaires** par service (COLIS / EXPRESS / PALETTE) :
  tranches de poids, €/kg au-delà, surcharge carburant.
- **Simulateur** : compare tous les transporteurs pour un poids donné.
- **Expéditions** : suivi ENLEVEE → EN_TRANSIT → LIVREE / INCIDENT,
  historique d'événements, KPI (coût cumulé/moyen, ponctualité).
- **Pré-facturation** : contrôle des factures transporteur contre le coût
  théorique, litige automatique au-delà de ±5 % d'écart.

## Architecture

```
lm-tms/
├── server.js            # HTTP + API REST (port 8748), sessions déléguées au WMS
├── config.json          # port, URL du WMS, clé d'intégration partagée
├── lib/
│   ├── store.js         # SQLite data/tms.db (base séparée du WMS)
│   ├── tms.js           # métier : grilles, coûts, expéditions, factures, KPI
│   ├── wms-client.js    # appels API vers le WMS (clé d'intégration)
│   ├── integration.js   # synchro transporteurs + import de rattrapage
│   └── seed.js          # démo par import réel depuis le WMS
├── public/              # IHM (dominante verte = TMS, bleue = WMS)
└── test-flux.js         # 14 tests du métier
```
