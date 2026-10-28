# Copilote superviseur (agent IA) — v1

Assistant conversationnel pour le **superviseur** : il répond en langage naturel
en **interrogeant la vraie donnée du WMS** (tool-use). Il ne « devine » rien —
il lit le stock, les commandes, les missions, les vagues, les mouvements via des
outils, et cite des chiffres et numéros réels.

## Ce qu'il fait (v1)
- **Lecture seule.** Aucune modification (pas de validation de mission, pas
  d'expédition, pas d'ajustement). Les actions confirmées viendront en v2.
- Outils disponibles à l'agent : `tableau_de_bord`, `commandes`, `stock`,
  `missions`, `vagues`, `mouvements`, `article`, `recherche_article`.
- Réservé au rôle **SUPERVISEUR** (et ADMIN). Chaque échange est journalisé
  (opérateur + outils appelés) côté serveur.
- Multilingue (FR/EN/ES/AR) comme le reste de l'IHM.

## Activation
Le copilote est **désactivé** tant qu'aucune clé IA n'est fournie (l'onglet
s'affiche mais indique « non configuré »).

Définir la variable d'environnement (le repreneur met **sa propre** clé) :

```
ANTHROPIC_API_KEY=sk-ant-...          # requis
ANTHROPIC_MODELE=claude-sonnet-5      # optionnel (défaut : claude-sonnet-5)
```

- **En local** : exporter la variable avant `node server.js`.
- **Sur Vercel** : l'ajouter dans les variables d'environnement du projet, puis
  redéployer.

La clé n'est lue **que côté serveur** (jamais exposée au navigateur).

## Où c'est dans le code
- `lib/copilote.js` — outils (lecture sur `store.getDb()` / `domaine`) + boucle
  tool-use vers l'API Anthropic.
- `server.js` — routes `GET /api/copilote/etat` et `POST /api/copilote`
  (rôle SUPERVISEUR).
- `public/app.js` (`vueCopilote`) + `public/index.html` (lien menu) +
  `public/styles.css` (`.cop-*`) + `public/i18n.js` (libellés).

## Exemples de questions
- « Résume-moi la journée. »
- « Quelles commandes sont en retard et pourquoi ? »
- « Quelles vagues lancer en priorité avant le cut-off ? »
- « Y a-t-il des ruptures ? Sur quels articles ? »
- « Combien reste-t-il de l'article TEX-001 et où ? »

## Pistes v2
- Actions **confirmées** (valider une mission, lancer une vague, ajuster) avec
  double confirmation + journalisation.
- Décisions rapides via **Jev/TypeSafe** (priorisation, résolution d'exception).
- Assistant **vocal** pour l'opérateur sur le terminal RF.
