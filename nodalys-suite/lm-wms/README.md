# LM-WMS — Suite logistique WMS + TMS inspirée des solutions Savoye

Évolution du mini-WMS pédagogique en C (dossier parent) vers un **produit WMS
complet**, articulé comme les solutions de l'éditeur Savoye :

- une **IHM superviseur web** (poste de pilotage graphique, esprit **LMxt**) ;
- un **terminal RF opérateur** en écran caractère vert-sur-noir (esprit **LM7**,
  type telnet 5250 sur pistolet Zebra/Honeywell) ;
- un **moteur métier** commun : allocation FEFO/FIFO, vagues, missions,
  réappro picking, SSCC, traçabilité.

**Base de données SQLite** (`data/wms.db`, tables réelles requêtables en SQL)
via better-sqlite3 — avec repli automatique sur fichiers JSON si le module
natif n'est pas installé.

## Lancement

```bash
npm install                  # une fois (better-sqlite3)
node lib/seed-realiste.js    # base réaliste : 3 semaines d'activité simulée
node server.js               # démarre le serveur
```

ou double-clic sur `demarrer.bat` (Windows).
Pour l'exposer sur internet : `demarrer-en-ligne.bat` (voir HEBERGEMENT.md).

Deux jeux de données au choix :
- `node lib/seed-realiste.js` — **recommandé** : 85 articles, 353 emplacements,
  ~220 commandes, ~1 700 mouvements générés en rejouant 3 semaines de flux
  réels (tous les scénarios présents : ruptures, retards, vagues en cours,
  colis ouverts, blocage qualité, lots multiples FEFO, inventaires).
- `node lib/seed.js` — mini jeu pédagogique (8 articles).

| Poste | URL |
|---|---|
| IHM superviseur (LMxt) | http://localhost:8747/ |
| Terminal RF (LM7) | http://localhost:8747/rf.html |

Tests de bout en bout du moteur : `node test-flux.js` (17 contrôles,
réinitialise les données de démo).

## Périmètre fonctionnel

### Flux entrant
- **Attendus de réception** (équivalent ASN) : fournisseur, date, lignes prévues.
- **Réception** par ligne avec contrôle : n° de **lot** et **DLC** obligatoires
  si l'article est paramétré ainsi.
- **Rangement dirigé** : règle d'adressage automatique
  (picking dédié de l'article → réserve avec même article → réserve libre),
  modifiable au scan par l'opérateur.

### Stock
- Stock **à l'emplacement** : article + lot + DLC + réservations.
- Zones : `RECEPTION` / `RESERVE` / `PICKING` / `EXPEDITION`, capacités,
  blocage d'emplacement, **blocage qualité** d'une ligne de stock.
- **Inventaire** par emplacement (comptage en aveugle au RF), écarts,
  ajustements tracés.
- **Journal des mouvements** : chaque geste (réception, rangement, picking,
  réappro, ajustement, inventaire, expédition) est horodaté avec opérateur.

### Flux sortant
- **Commandes clients** : priorité, date de livraison, transporteur.
- **Allocation** : **FEFO** (DLC croissante) pour les articles en DLC,
  **FIFO** sinon ; zone picking servie avant la réserve ; détection de
  **ruptures** au lancement de vague.
- **Vagues de préparation** : regroupement de commandes, missions de picking
  séquencées selon le **chemin de picking** (zone puis emplacement).
- **Réappro picking** : surveillance des minis, missions réserve → picking (FEFO).
- **Colisage** : colis **SSCC GS1** (18 chiffres, clé de contrôle calculée),
  étiquette logistique imprimable.
- **Chargements transporteur** : regroupement de colis, départ = passage
  des commandes en `EXPEDIEE`.

### Pilotage
- Tableau de bord : portefeuille par statut, occupation par zone,
  missions en attente, ruptures, retards, mouvements 24 h.
- Validation forcée de missions par le superviseur, ajustements de stock.

### Comptes & rôles
- Utilisateurs en base (mots de passe hachés scrypt), sessions par cookie.
- Rôles hiérarchisés : `OPERATEUR` (missions, réceptions, colisage) <
  `SUPERVISEUR` (référentiels, vagues, ajustements, EDI) < `ADMIN`
  (gestion des utilisateurs).
- La traçabilité utilise l'utilisateur connecté (imposé par le serveur).
- Comptes de démo : `ADMIN/admin123`, `CHEF/chef123`, opérateurs
  (`NADIA`, `KARIM`, `JULIE`…) avec PIN `1234`. **À changer avant de
  partager une URL publique** (écran Utilisateurs).

### Supports / palettes (unités logistiques)
- Réception « sur palette » : un support SSCC est créé, scannable au RF.
- Le rangement d'un support déplace la palette entière (pas de quantité
  partielle) ; déplacement manuel au RF (menu 6) ou depuis l'IHM.
- Un support réservé par une préparation ne peut pas être déplacé ;
  un support vidé par le picking passe automatiquement en `VIDE`.

### Suite LM : le TMS est une application séparée
La gestion du transport vit dans **`../lm-tms`** (port 8748), application
autonome avec sa propre base. Intégration par API :
- le WMS expose un **compte de service** (clé dans `integration.json`) que le
  TMS utilise pour synchroniser les transporteurs et rattraper les chargements ;
- à chaque départ de chargement, le WMS envoie un **webhook** au TMS
  (expédition créée avec poids réel et coût) — sans bloquer le WMS si le TMS
  est éteint ;
- la **connexion du TMS est déléguée au WMS** : mêmes comptes partout.

### Connecteur EDI (fichiers CSV à plat)
- **Entrant** (`edi/entrant/`, scruté toutes les 5 s) :
  `commandes_*.csv` (ORDERS) et `attendus_*.csv` (ASN), groupage par
  référence externe, rejet des doublons, archivage et journal en base.
- **Sortant** (`edi/sortant/`) : `DESADV` au départ d'un chargement,
  `RECADV` à la clôture d'un attendu, `INVRPT` (photo de stock) à la
  demande. Modèles dans `edi/exemples/`.

## Cycle de vie d'une commande

```
ATTENTE → ALLOUEE → EN_PREPARATION → PREPAREE → EMBALLEE → EXPEDIEE
          (vague)     (picking RF)    (colisage SSCC)  (départ chargement)
```

## Architecture

```
lm-wms/
├── server.js            # serveur HTTP + API REST (node:http, zéro dépendance)
├── lib/
│   ├── store.js         # persistance JSON (data/wms.json)
│   ├── domaine.js       # tout le métier : réception, allocation, vagues,
│   │                    #   missions, réappro, SSCC, inventaire, KPI
│   └── seed.js          # jeu de démonstration (8 articles, 25 emplacements,
│                        #   3 attendus, 4 commandes)
├── public/
│   ├── index.html/app.js/styles.css   # IHM superviseur (SPA vanilla)
│   └── rf.html/rf.js                  # émulateur terminal RF caractère
└── test-flux.js         # test de bout en bout du moteur (17 assertions)
```

Toute l'API est en JSON sous `/api/…` (voir `server.js`, table des routes) :
le front n'a aucun privilège, un ERP/TMS pourrait s'y intégrer tel quel.

## Ce qui resterait pour se rapprocher encore d'un LM7/LMxt réel

- Multi-entrepôts / multi-activités, gestion des supports (palette, carton) en
  tant qu'unités logistiques scannables.
- Modes de préparation supplémentaires : pick-and-pack, éclatement (put to
  light), préparation vocale.
- EDI (ORDERS/DESADV), étiquettes transporteur réelles (Chronopost, DPD…),
  vraie impression ZPL.
- Base SQL multi-utilisateurs avec verrouillage, habilitations par rôle.
- Ordonnancement avancé des vagues (regroupement par transporteur, cut-off).
