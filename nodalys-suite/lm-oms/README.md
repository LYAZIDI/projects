# LM-OMS — Order Management System (suite LM)

Tour de contrôle des commandes de la suite LM : troisième application
autonome aux côtés du **LM-WMS** (entrepôt, 8747) et du **LM-TMS**
(transport, 8748). L'OMS reçoit les commandes de tous les canaux de
vente, les contrôle, choisit le transporteur et les pilote jusqu'à la
livraison.

## Lancement

```bash
npm install          # une fois (better-sqlite3)
node lib/seed.js     # base de démo : intégration RÉELLE (WMS et TMS doivent tourner)
node server.js       # démarre l'OMS
```

| Poste | URL |
|---|---|
| IHM tour de contrôle | http://localhost:8749/ |

`..\demarrer-suite.bat` lance les trois applications d'un coup.
Tests métier : `node test-flux.js` (15 contrôles, sans réseau).

## Cycle de vie d'une commande

```
RECUE → VALIDEE ─────────→ TRANSMISE → EN_PREPARATION → PREPAREE → EXPEDIEE → LIVREE
   │        (stock WMS +       (envoyée      (statuts projetés du WMS)         (statut
   └→ EN_RUPTURE  choix TMS)    au WMS)                                       projeté du TMS)
      (revalidable)                                          ANNULEE possible avant transmission
```

## Ce que l'OMS orchestre

- **Canaux de vente** paramétrables : chaque canal impose sa règle de choix
  du transporteur — `MOINS_CHER` (simulation TMS), `PLUS_RAPIDE` (délai le
  plus court) ou un transporteur imposé (ex. B2B → affrètement palette).
- **Validation** : contrôle du stock réellement disponible dans le WMS
  (stock − réservations) ; rupture détectée ligne par ligne, revalidable
  après réapprovisionnement.
- **Choix transporteur motivé** : le motif est conservé (« le moins cher :
  21,09 € contre 27,20 € pour Colissimo ») — auditables en vue 360°.
- **Transmission au WMS** avec référence croisée (`referenceExterne` = n° OMS).
- **Suivi automatique** (toutes les 60 s) : statuts WMS (préparation) et TMS
  (livraison) projetés sur la commande OMS jusqu'à LIVREE.
- **Vue 360°** : une commande = son parcours complet OMS → WMS → TMS avec le
  suivi transporteur détaillé.

## Intégration

- Connexion **déléguée au WMS** : comptes uniques de la suite
  (ADMIN/admin123, CHEF/chef123…).
- Clients synchronisés depuis les tiers du WMS.
- Clé d'intégration partagée (`config.json`) pour les appels de service
  vers le WMS et le TMS.

## Architecture

```
lm-oms/
├── server.js            # HTTP + API REST (port 8749)
├── config.json          # port, URLs WMS/TMS, clé d'intégration
├── lib/
│   ├── store.js         # SQLite data/oms.db
│   ├── oms.js           # métier PUR (les données WMS/TMS sont injectées)
│   ├── suite-client.js  # appels API vers WMS et TMS
│   ├── integration.js   # orchestration (validation, transmission, suivi)
│   └── seed.js          # démo par intégration réelle
├── public/              # IHM (dominante prune ; WMS = bleu, TMS = vert)
└── test-flux.js         # 15 tests métier
```
