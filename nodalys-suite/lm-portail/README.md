# LM-SUITE — Portail unique de la suite logistique

Porte d'entrée **unique** aux trois applications de la suite (WMS, TMS,
OMS) et vitrine commerciale de l'offre. Application légère **zéro
dépendance** (node:http seul).

## Lancement

```bash
node server.js       # port 8750  (le WMS doit tourner pour la connexion)
```

Ouvre http://localhost:8750/ — c'est l'écran d'accueil de toute la suite.
`..\demarrer-suite.bat` lance les 4 applications et ouvre le portail.

## Ce que fait le portail

- **Connexion unique** déléguée au WMS : un seul compte pour toute la
  plateforme (ADMIN/admin123, CHEF/chef123…).
- **Accès aux applications payées uniquement** : les modules souscrits
  affichent un bouton « Ouvrir » ; les autres sont **verrouillés** (leur
  URL n'est même pas transmise au navigateur) et présentés comme upsell
  avec leur prix.
- **Vitrine tarifaire** (stratégie marketing) :

  | Module | Rôle | Prix |
  |---|---|---|
  | LM-WMS | Gestion d'entrepôt (socle) | 49 €/mois |
  | LM-TMS | Gestion du transport | +29 €/mois |
  | LM-OMS | Tour de contrôle commandes | +39 €/mois |

  | Formule | Modules | Prix |
  |---|---|---|
  | Essentiel | WMS | 49 €/mois |
  | Logistique | WMS + TMS | 69 €/mois |
  | Suite complète | WMS + TMS + OMS | 99 €/mois |

- **Gestion d'abonnement** (rôle ADMIN) : activer/retirer un module ou
  changer de formule directement depuis la page — le prix se recalcule et
  l'accès s'ouvre aussitôt. Le WMS, socle de la suite, reste toujours actif.

## Abonnement de démonstration

`abonnement.json` fixe l'état courant. Par défaut : formule **Logistique**
(WMS + TMS actifs, OMS verrouillé) — pour illustrer à la fois l'accès
restreint aux modules payés et le mécanisme d'upsell. Modifiable à la main
ou via l'interface ADMIN.

## Configuration

`config.json` : port, URLs internes des applications (pour l'auth et le
contrôle d'état côté serveur) et, optionnellement, URLs publiques
(`wmsUrlPublic`…) utilisées pour les liens « Ouvrir » quand la suite est
exposée sur internet via des tunnels.

## Architecture

```
lm-portail/
├── server.js          # HTTP + API (port 8750), catalogue, abonnement, auth déléguée
├── config.json        # URLs internes + publiques des 3 apps
├── abonnement.json    # état de l'abonnement (modules actifs)
└── public/            # vitrine (index.html, app.js, styles.css)
```
