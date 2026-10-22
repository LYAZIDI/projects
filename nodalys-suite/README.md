# Nodalys — suite logistique (WMS, TMS, OMS, portail)

Quatre applications Node.js sans framework qui se parlent en HTTP :

| App | Rôle | Port local |
|---|---|---|
| `lm-wms` | Entrepôt : stock, réception, préparation, expédition, EDI | 8747 |
| `lm-tms` | Transport : expéditions, chiffrage, transporteurs | 8748 |
| `lm-oms` | Commandes : canaux, validation contre le stock, transmission | 8749 |
| `lm-portail` | Vitrine et accès aux modules de l'abonnement | 8750 |

Comptes de démonstration (créés par le seed du WMS) : `CHEF` / `chef123`, `ADMIN` / `admin123`.
La connexion du TMS, de l'OMS et du portail est déléguée au WMS.

## En local

```bash
cd lm-wms && npm install && node lib/seed-realiste.js && node server.js
```

Sans variables Turso, les données vivent dans `data/*.json` (ou `data/*.db` si `better-sqlite3` se charge).

## Sur Vercel + Turso

Un projet Vercel par application (répertoire racine = dossier de l'app). Le front statique est servi
depuis `public/`, l'API par `api/index.js`.

| Variable | Rôle |
|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Base Turso de l'app (une base par app) |
| `LM_SECRET_SESSION` | Secret de signature des cookies de session |
| `LM_CLE_INTEGRATION` | Clé partagée entre les apps (en-tête `X-Api-Key`) |
| `LM_TMS_URL` (WMS) | Adresse du TMS à notifier au départ des chargements |

Seed de la base en ligne : `TURSO_DATABASE_URL=… TURSO_AUTH_TOKEN=… node lib/seed-realiste.js`.
