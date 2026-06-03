"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lancerPipeline = lancerPipeline;
const uuid_1 = require("uuid");
const agent1_analyseProduit_1 = require("../agents/agent1_analyseProduit");
const agent2_analyseMarche_1 = require("../agents/agent2_analyseMarche");
const agent3_avatarClient_1 = require("../agents/agent3_avatarClient");
const agent4_strategie_1 = require("../agents/agent4_strategie");
const agent5_offre_1 = require("../agents/agent5_offre");
const agent6_page_1 = require("../agents/agent6_page");
const agent7_pubs_1 = require("../agents/agent7_pubs");
const agent8_contenu_1 = require("../agents/agent8_contenu");
const agent9_master_1 = require("../agents/agent9_master");
async function lancerPipeline(input, onProgres) {
    const total = 9;
    const notifier = (etape, nom, statut, donnees) => {
        onProgres({ etape, total, nom, statut, donnees });
    };
    // Agent 1 — Analyse Produit
    notifier(1, 'Analyse Produit', 'en_cours');
    const produit = await (0, agent1_analyseProduit_1.runAnalyseProduit)(input);
    notifier(1, 'Analyse Produit', 'termine', produit);
    // Agent 2 — Analyse Marché FR
    notifier(2, 'Analyse Marché FR', 'en_cours');
    const marche = await (0, agent2_analyseMarche_1.runAnalyseMarche)(produit);
    notifier(2, 'Analyse Marché FR', 'termine', marche);
    // Agent 3 — Avatar Client
    notifier(3, 'Avatar Client', 'en_cours');
    const avatar = await (0, agent3_avatarClient_1.runAvatarClient)(produit, marche);
    notifier(3, 'Avatar Client', 'termine', avatar);
    // Agent 4 — Stratégie Marketing
    notifier(4, 'Stratégie Marketing', 'en_cours');
    const strategie = await (0, agent4_strategie_1.runStrategieMarketing)(produit, marche, avatar);
    notifier(4, 'Stratégie Marketing', 'termine', strategie);
    // Agent 5 — Création Offre
    notifier(5, "Création d'Offre", 'en_cours');
    const offre = await (0, agent5_offre_1.runCreationOffre)(produit, avatar, strategie);
    notifier(5, "Création d'Offre", 'termine', offre);
    // Agent 6 — Page Produit
    notifier(6, 'Page Produit FR', 'en_cours');
    const page = await (0, agent6_page_1.runPageProduit)(produit, avatar, offre);
    notifier(6, 'Page Produit FR', 'termine', page);
    // Agent 7 — Publicités
    notifier(7, 'Campagnes Pub', 'en_cours');
    const pubs = await (0, agent7_pubs_1.runCampagnesPub)(produit, avatar, offre);
    notifier(7, 'Campagnes Pub', 'termine', pubs);
    // Agent 8 — Contenu
    notifier(8, 'Plan Contenu', 'en_cours');
    const contenu = await (0, agent8_contenu_1.runPlanContenu)(produit, avatar);
    notifier(8, 'Plan Contenu', 'termine', contenu);
    // Agent 9 — Master Score
    notifier(9, 'Scoring Master', 'en_cours');
    const score = await (0, agent9_master_1.runScoreMaster)(produit, marche, avatar, strategie, offre);
    notifier(9, 'Scoring Master', 'termine', score);
    return {
        id: (0, uuid_1.v4)(),
        input,
        cree_le: new Date().toISOString(),
        produit,
        marche,
        avatar,
        strategie,
        offre,
        page,
        pubs,
        contenu,
        score,
    };
}
//# sourceMappingURL=pipeline.js.map