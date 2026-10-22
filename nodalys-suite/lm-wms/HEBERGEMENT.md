# Héberger LM-WMS sur internet

## Option 1 — Tunnel public depuis votre PC (actif, aucun compte requis)

Double-clic sur **`demarrer-en-ligne.bat`** : lance le serveur + un tunnel
Cloudflare gratuit. L'URL publique `https://….trycloudflare.com` s'affiche
dans la fenêtre du tunnel.

- L'accès **local** (http://localhost:8747) reste libre.
- L'accès **internet** demande le mot de passe du fichier `mdp.txt`
  (utilisateur : n'importe quoi, ex. `wms`).
- Limites : l'URL **change à chaque relance**, et votre PC doit rester
  allumé. C'est l'option "démo immédiate", pas de l'hébergement durable.

## Option 2 — Render.com (gratuit, URL stable, PC éteint possible)

Nécessite un compte GitHub et un compte render.com (gratuits) :

1. Créez un dépôt GitHub et poussez le dossier `lm-wms`
   (le `.gitignore` exclut déjà données locales, outils et mot de passe) :
   ```bash
   cd lm-wms
   git init
   git add .
   git commit -m "LM-WMS"
   git remote add origin https://github.com/<votre-compte>/lm-wms.git
   git push -u origin main
   ```
2. Sur render.com : **New → Blueprint** → sélectionnez le dépôt.
   Le fichier `render.yaml` configure tout (Docker + mot de passe).
3. URL stable du type `https://lm-wms.onrender.com`.

Limites du plan gratuit : le service s'endort après 15 min d'inactivité
(réveil ~30 s), et le disque est **éphémère** — la base de démo est
régénérée à chaque redéploiement (très bien pour tester ; pour conserver
les données, passez à l'option 3).

## Option 3 — Hébergement avec données persistantes

Pour un usage durable (les données survivent aux redémarrages) :

- **Railway.app** ou **Fly.io** : montez un volume persistant sur `/app/data`
  (la base SQLite `wms.db` y vit). Quelques euros par mois.
- **VPS** (OVH, Scaleway…) : `node server.js` derrière Caddy/Nginx en HTTPS.
  Contrôle total, à partir de ~3 €/mois.

## Mot de passe

- Local : `mdp.txt` à la racine du projet (ou variable `LMWMS_MDP`).
- Render : variable d'environnement `LMWMS_MDP` dans `render.yaml`.
- **Changez le mot de passe par défaut avant de partager l'URL.**
