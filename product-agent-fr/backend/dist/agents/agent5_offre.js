"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCreationOffre = runCreationOffre;
const llm_1 = require("./llm");
const SYSTEME = `Tu es un expert en conversion e-commerce et en psychologie de l'achat en France.
Tu crées des offres irrésistibles adaptées aux consommateurs français : paiement en plusieurs fois (Alma, Klarna),
garantie satisfait ou remboursé, livraison rapide, badges de confiance.
Tu connais les leviers qui font acheter un Français : urgence réelle, preuve sociale, service client français,
retours gratuits, label "Livraison France" plutôt que délai AliExpress.`;
async function runCreationOffre(produit, avatar, strategie) {
    const prompt = `Crée l'offre commerciale optimale pour ce produit vendu en France :

Produit : ${produit.nom}
Bénéfice : ${produit.benefice_principal}
Prix recommandé : ${produit.fourchette_prix.recommande}€
Fourchette : ${produit.fourchette_prix.min}€ – ${produit.fourchette_prix.max}€
Sensibilité prix avatar : ${avatar.sensibilite_prix}
Confiance dropshipping : ${avatar.confiance_dropshipping}
Objections : ${avatar.objections_typiques.join(' | ')}
Déclencheurs achat : ${avatar.declencheurs_achat.join(' | ')}
Positionnement : ${strategie.positionnement}
Budget recommandé : ${strategie.budget_lancement_recommande}

Retourne un objet JSON avec ce schéma exact :
{
  "nom_offre": "Nom commercial de l'offre",
  "prix_psychologique": 34.90,
  "prix_barre": 59.90,
  "paiement_plusieurs_fois": {
    "disponible": true,
    "options": ["3x sans frais", "4x Alma"],
    "mensualite": "à partir de 11,63€/mois"
  },
  "garantie": {
    "duree": "30 jours",
    "type": "Satisfait ou remboursé",
    "message": "Si vous n'êtes pas satisfait, on vous rembourse sans question"
  },
  "bonus_inclus": ["Bonus 1 offert", "Guide PDF gratuit"],
  "urgence_rarete": ["Stock limité à 50 unités", "Offre valable jusqu'à minuit"],
  "livraison": {
    "delai": "3-5 jours ouvrés",
    "gratuite_a_partir": "Livraison gratuite dès 40€",
    "message_confiance": "Expédié depuis la France"
  },
  "badge_confiance": ["Paiement sécurisé SSL", "Retours gratuits 30j", "Service client français"],
  "bundle_suggestions": [
    {
      "nom": "Pack Duo",
      "prix": 59.90,
      "economies": "Économisez 10€"
    }
  ],
  "appel_a_action_principal": "Ajouter au panier – Livraison offerte"
}`;
    return (0, llm_1.appelAgent)(SYSTEME, prompt, 2000);
}
//# sourceMappingURL=agent5_offre.js.map