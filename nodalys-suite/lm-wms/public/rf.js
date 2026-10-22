'use strict';
/* ============================================================
 *  LM-WMS - Terminal RF opérateur, émulation écran caractère
 *  (esprit LM7 : écrans successifs, validation par scan + ENT,
 *  ESC pour revenir, F1 pour le menu).
 *  Textes traduits via tr() (i18n.js, chargé avant ce fichier).
 * ============================================================ */

const affichage = document.getElementById('affichage');
const champSaisie = document.getElementById('saisie');
const LARGEUR = 44;

async function api(methode, chemin, corps) {
  const options = { method: methode, headers: { 'Content-Type': 'application/json' } };
  if (corps !== undefined) options.body = JSON.stringify(corps);
  const reponse = await fetch(chemin, options);
  const donnees = await reponse.json();
  if (reponse.status === 401) {
    etat.operateur = ''; etat.ecran = 'LOGIN'; etat.phase = '';
    throw new Error(tr('SESSION EXPIREE - RECONNECTEZ-VOUS'));
  }
  if (!reponse.ok) throw new Error(donnees.erreur || tr('ERREUR SERVEUR'));
  return donnees;
}
const GET = chemin => api('GET', chemin);

/* ---------- État global du terminal ---------- */
const etat = {
  ecran: 'LOGIN',
  operateur: '',
  message: '',
  /* contexte selon l'écran */
  mission: null,        // mission en cours (rangement / picking / réappro)
  phase: '',            // sous-étape dans un écran (SCAN_EMPL, QTE, ...)
  emplacementSaisi: '',
  vague: null, missionsVague: [], indexMission: 0,
  inventaire: null, indexComptage: 0, comptages: [],
  lignesConsultation: [],
};

/* ---------- Aides d'affichage ---------- */
function centre(texte) {
  const marge = Math.max(0, Math.floor((LARGEUR - texte.length) / 2));
  return ' '.repeat(marge) + texte;
}
function entete(titre) {
  const gauche = ' LM-WMS ' + titre;
  const droite = (etat.operateur ? 'OP:' + etat.operateur : '') + ' ';
  const espace = Math.max(1, LARGEUR - gauche.length - droite.length);
  return `<span class="inverse">${gauche}${' '.repeat(espace)}${droite}</span>`;
}
function rendre(lignes, invite = '>') {
  document.getElementById('invite').textContent = invite;
  const corps = lignes.join('\n');
  const message = etat.message ? '\n\n  ** ' + etat.message + ' **' : '';
  affichage.innerHTML = corps + message;
  champSaisie.value = '';
  champSaisie.focus();
}

/* ============================================================
 *  Écrans
 * ============================================================ */
const ECRANS = {

  /* ---------- Identification (code + PIN, session serveur) ---------- */
  LOGIN: {
    afficher() {
      const phasePin = etat.phase === 'PIN';
      rendre([
        entete(tr('IDENTIFICATION')),
        '',
        '',
        centre('*** LM-WMS TERMINAL RF ***'),
        '',
        '',
        phasePin ? '  ' + tr('OPERATEUR : {code}', { code: etat.codeSaisi }) : '  ' + tr('CODE OPERATEUR ?'),
        phasePin ? '  ' + tr('CODE PIN ?') : '',
        '',
        '',
        '  ' + tr('[ENT] VALIDER   [ESC] RETOUR'),
      ], phasePin ? 'PIN>' : 'OP>');
    },
    async traiter(saisie) {
      if (!saisie) return;
      if (etat.phase !== 'PIN') {
        etat.codeSaisi = saisie.toUpperCase().slice(0, 10);
        etat.phase = 'PIN';
        return;
      }
      const utilisateur = await api('POST', '/api/connexion', { code: etat.codeSaisi, mdp: saisie });
      etat.operateur = utilisateur.code;
      etat.phase = '';
      etat.ecran = 'MENU';
    },
  },

  /* ---------- Menu principal ---------- */
  MENU: {
    afficher() {
      rendre([
        entete('MENU'),
        '',
        '  ' + tr('1. RANGEMENT'),
        '  ' + tr('2. PICKING (VAGUES)'),
        '  ' + tr('3. REAPPRO PICKING'),
        '  ' + tr('4. INVENTAIRE'),
        '  ' + tr('5. CONSULTATION STOCK'),
        '  ' + tr('6. DEPLACEMENT SUPPORT'),
        '',
        '  ' + tr('9. FIN DE SESSION'),
        '',
        '  ' + tr('CHOIX + [ENT]'),
      ]);
    },
    async traiter(saisie) {
      const choix = { 1: 'RANGEMENT', 2: 'CHOIX_VAGUE', 3: 'REAPPRO', 4: 'INVENTAIRE',
                      5: 'CONSULTATION', 6: 'DEPLACEMENT' }[saisie];
      if (saisie === '9') {
        try { await api('POST', '/api/deconnexion'); } catch { /* déjà déconnecté */ }
        etat.operateur = ''; etat.ecran = 'LOGIN'; etat.phase = '';
        return;
      }
      if (!choix) { etat.message = tr('CHOIX INVALIDE'); return; }
      etat.ecran = choix;
      etat.mission = null; etat.phase = '';
    },
  },

  /* ---------- Rangement / réappro (même mécanique) ---------- */
  RANGEMENT: {
    async afficher() { await afficherMissionSimple('RANGEMENT', tr('RANGEMENT')); },
    async traiter(saisie) { await traiterMissionSimple(saisie, 'RANGEMENT'); },
  },
  REAPPRO: {
    async afficher() { await afficherMissionSimple('REAPPRO', tr('REAPPRO')); },
    async traiter(saisie) { await traiterMissionSimple(saisie, 'REAPPRO'); },
  },

  /* ---------- Choix de la vague ---------- */
  CHOIX_VAGUE: {
    async afficher() {
      const [vagues, missions] = await Promise.all([GET('/api/vagues'), GET('/api/missions?type=PICKING&statut=EN_ATTENTE')]);
      etat.vaguesOuvertes = vagues.filter(v => v.statut === 'LANCEE'
        && missions.some(m => m.vague === v.id));
      const lignes = [entete(tr('PICKING - VAGUES')), ''];
      if (etat.vaguesOuvertes.length === 0) {
        lignes.push('  ' + tr('AUCUNE VAGUE A PREPARER'), '', '  ' + tr('(LANCEZ UNE VAGUE DEPUIS LE'), '   ' + tr('POSTE SUPERVISEUR)'), '', '  [ESC] MENU');
      } else {
        lignes.push('  ' + tr('VAGUES EN COURS :'), '');
        etat.vaguesOuvertes.slice(0, 6).forEach((v, i) => {
          const restantes = missions.filter(m => m.vague === v.id).length;
          lignes.push(`  ${i + 1}. ${v.numero}  ` + tr('({n} MISSIONS)', { n: restantes }));
        });
        lignes.push('', '  ' + tr('N° + [ENT]'));
      }
      rendre(lignes);
    },
    async traiter(saisie) {
      const v = etat.vaguesOuvertes[Number(saisie) - 1];
      if (!v) { etat.message = tr('CHOIX INVALIDE'); return; }
      etat.vague = v;
      const missions = await GET('/api/missions?type=PICKING&statut=EN_ATTENTE');
      etat.missionsVague = missions.filter(m => m.vague === v.id).sort((a, b) => a.ordre - b.ordre);
      etat.indexMission = 0;
      etat.phase = 'SCAN_EMPL';
      etat.ecran = 'PICKING';
    },
  },

  /* ---------- Picking guidé ---------- */
  PICKING: {
    afficher() {
      const m = etat.missionsVague[etat.indexMission];
      if (!m) {
        rendre([entete('PICKING'), '', '', centre(tr('*** VAGUE TERMINEE ***')), '',
                centre(etat.vague.numero), '', '', '  [ENT] MENU']);
        return;
      }
      const restantes = etat.missionsVague.length - etat.indexMission;
      rendre([
        entete('PICKING ' + etat.vague.numero),
        '  ' + tr('MISSION {o}  (RESTE {n})', { o: m.ordre, n: restantes }),
        '',
        '  ' + tr('ALLEZ A : {e}', { e: m.source }),
        '',
        '  ' + tr('ARTICLE : {a}', { a: m.article }),
        m.lot ? '  ' + tr('LOT     : {l}', { l: m.lot }) : '',
        '  ' + tr('QTE     : {q}', { q: m.qte }),
        '  ' + tr('CDE     : {c}', { c: m.reference }),
        '',
        etat.phase === 'SCAN_EMPL'
          ? '  ' + tr('SCANNEZ L\'EMPLACEMENT')
          : '  ' + tr('QTE PRELEVEE ? [ENT]={q}  [F4] ECART', { q: m.qte }),
      ], etat.phase === 'SCAN_EMPL' ? 'EMP>' : 'QTE>');
    },
    async traiter(saisie) {
      const m = etat.missionsVague[etat.indexMission];
      if (!m) { etat.ecran = 'MENU'; return; }
      if (etat.phase === 'SCAN_EMPL') {
        if (saisie !== '' && saisie.toUpperCase() !== m.source) {
          etat.message = tr('MAUVAIS EMPLACEMENT'); return;
        }
        etat.phase = 'QTE';
        return;
      }
      /* phase QTE */
      const qte = saisie === '' ? m.qte : Number(saisie);
      if (!(qte >= 0) || qte > m.qte) { etat.message = tr('QTE INVALIDE (MAX {m})', { m: m.qte }); return; }
      await api('POST', `/api/missions/${m.id}/valider`, { qte, operateur: etat.operateur });
      if (qte < m.qte) etat.message = tr('ECART DECLARE : -{n}', { n: m.qte - qte });
      etat.indexMission++;
      etat.phase = 'SCAN_EMPL';
    },
  },

  /* ---------- Inventaire ---------- */
  INVENTAIRE: {
    afficher() {
      if (!etat.inventaire) {
        rendre([entete(tr('INVENTAIRE')), '', '', '  ' + tr('SCANNEZ L\'EMPLACEMENT'), '  ' + tr('A COMPTER'), '', '', '  [ESC] MENU'], 'EMP>');
        return;
      }
      const l = etat.inventaire.lignes[etat.indexComptage];
      if (!l) {
        const ecarts = etat.comptages.filter((c, i) => c !== etat.inventaire.lignes[i].qteTheorique).length;
        rendre([entete(tr('INVENTAIRE')), '', centre(tr('*** COMPTAGE TERMINE ***')), '',
                '  ' + tr('EMPLACEMENT : {e}', { e: etat.inventaire.emplacement }),
                '  ' + tr('LIGNES      : {n}', { n: etat.inventaire.lignes.length }),
                '  ' + tr('ECARTS      : {n}', { n: ecarts }),
                '', '  ' + tr('[ENT] VALIDER  [ESC] ABANDON')]);
        return;
      }
      rendre([
        entete(tr('INVENTAIRE') + ' ' + etat.inventaire.emplacement),
        '  ' + tr('LIGNE {i}/{n}', { i: etat.indexComptage + 1, n: etat.inventaire.lignes.length }),
        '',
        '  ' + tr('ARTICLE : {a}', { a: l.article }),
        l.lot ? '  ' + tr('LOT     : {l}', { l: l.lot }) : '',
        '',
        '  ' + tr('QTE COMPTEE ?'),
        '',
        '  ' + tr('(COMPTAGE EN AVEUGLE :'),
        '   ' + tr('LE THEORIQUE N\'EST PAS AFFICHE)'),
      ], 'QTE>');
    },
    async traiter(saisie) {
      if (!etat.inventaire) {
        if (!saisie) return;
        const inv = await api('POST', '/api/inventaires', { emplacement: saisie.toUpperCase() });
        if (inv.lignes.length === 0) {
          etat.message = tr('EMPLACEMENT VIDE (THEORIQUE)');
        }
        etat.inventaire = inv; etat.indexComptage = 0; etat.comptages = [];
        return;
      }
      const l = etat.inventaire.lignes[etat.indexComptage];
      if (!l) {   /* fin de comptage : validation */
        await api('POST', `/api/inventaires/${etat.inventaire.id}/compter`, {
          comptages: etat.inventaire.lignes.map((ligne, i) => ({
            article: ligne.article, lot: ligne.lot, qteComptee: etat.comptages[i],
          })),
          operateur: etat.operateur,
        });
        await api('POST', `/api/inventaires/${etat.inventaire.id}/valider`, { operateur: etat.operateur });
        etat.message = tr('INVENTAIRE VALIDE');
        etat.inventaire = null;
        etat.ecran = 'MENU';
        return;
      }
      const qte = Number(saisie);
      if (saisie === '' || !(qte >= 0)) { etat.message = tr('SAISIE OBLIGATOIRE'); return; }
      etat.comptages[etat.indexComptage] = qte;
      etat.indexComptage++;
    },
  },

  /* ---------- Déplacement de support (palette SSCC) ---------- */
  DEPLACEMENT: {
    afficher() {
      if (!etat.supportScanne) {
        rendre([entete(tr('DEPLACEMENT SUPPORT')), '', '', '  ' + tr('SCANNEZ LE SSCC DU SUPPORT'), '', '', '  [ESC] MENU'], 'SSCC>');
        return;
      }
      const s = etat.supportScanne;
      const lignes = [entete(tr('DEPLACEMENT SUPPORT')), `  SSCC ...${s.sscc.slice(-8)}`, ''];
      for (const l of s.lignes.slice(0, 4)) {
        lignes.push(`  ${l.article}  x${l.qte}${l.lot ? '  ' + l.lot : ''}`.slice(0, LARGEUR));
      }
      lignes.push('', '  ' + tr('DEPUIS  : {e}', { e: s.emplacement }), '', '  ' + tr('SCANNEZ LA DESTINATION'));
      rendre(lignes, 'EMP>');
    },
    async traiter(saisie) {
      if (!saisie) return;
      if (!etat.supportScanne) {
        etat.supportScanne = await api('GET', `/api/supports/${saisie}`);
        return;
      }
      await api('POST', `/api/supports/${etat.supportScanne.sscc}/deplacer`,
        { emplacement: saisie.toUpperCase(), operateur: etat.operateur });
      etat.message = tr('SUPPORT DEPLACE');
      etat.supportScanne = null;
    },
  },

  /* ---------- Consultation stock ---------- */
  CONSULTATION: {
    afficher() {
      if (etat.lignesConsultation.length === 0) {
        rendre([entete(tr('CONSULTATION')), '', '', '  ' + tr('SCANNEZ UN EMPLACEMENT'), '  ' + tr('OU UN CODE ARTICLE'), '', '', '  [ESC] MENU'], 'SCAN>');
        return;
      }
      const lignes = [entete(tr('CONSULTATION')), ''];
      for (const s of etat.lignesConsultation.slice(0, 7)) {
        lignes.push(`  ${s.emplacement}  ${s.article}`.slice(0, LARGEUR));
        lignes.push(`    ${tr('QTE')} ${s.qte}${s.qteReservee ? ' (RSV ' + s.qteReservee + ')' : ''}${s.lot ? '  ' + tr('LOT') + ' ' + s.lot : ''}`.slice(0, LARGEUR));
      }
      if (etat.lignesConsultation.length > 7) lignes.push('  ' + tr('... +{n} LIGNES', { n: etat.lignesConsultation.length - 7 }));
      lignes.push('', '  ' + tr('[ENT] NOUVELLE RECHERCHE'));
      rendre(lignes);
    },
    async traiter(saisie) {
      if (etat.lignesConsultation.length > 0) { etat.lignesConsultation = []; return; }
      if (!saisie) return;
      const code = saisie.toUpperCase();
      const stock = await GET('/api/stock');
      etat.lignesConsultation = stock.filter(s =>
        s.emplacement === code || s.article === code || s.support === saisie);
      if (etat.lignesConsultation.length === 0) etat.message = tr('AUCUN STOCK TROUVE');
    },
  },
};

/* ---------- Rangement / réappro : mécanique commune ---------- */
async function afficherMissionSimple(type, titre) {
  if (!etat.mission) {
    const missions = await GET(`/api/missions?type=${type}&statut=EN_ATTENTE`);
    etat.mission = missions[0] || null;
    etat.phase = etat.mission ? 'SCAN_EMPL' : '';
  }
  const m = etat.mission;
  if (!m) {
    rendre([entete(titre), '', '', centre(tr('AUCUNE MISSION {t}', { t: titre })), '', '', '  [ESC] MENU', '', '  ' + tr('[ENT] ACTUALISER')]);
    return;
  }
  rendre([
    entete(titre),
    `  MISSION ${m.id}`,
    m.support ? `  SUPPORT ...${m.support.slice(-8)}` : '',
    '  ' + tr('ARTICLE : {a}', { a: m.article }),
    m.lot ? '  ' + tr('LOT     : {l}', { l: m.lot }) : '',
    '  ' + tr('QTE     : {q}', { q: m.qte + (m.support ? ' ' + tr('(PALETTE ENTIERE)') : '') }),
    '',
    '  ' + tr('PRENDRE : {e}', { e: m.source }),
    '  ' + tr('RANGER  : {e}', { e: m.dest || tr('(LIBRE CHOIX)') }),
    '',
    etat.phase === 'SCAN_EMPL'
      ? '  ' + tr('SCANNEZ DESTINATION [ENT]={d}', { d: m.dest || '?' })
      : '  ' + tr('QTE DEPOSEE ? [ENT]={q}', { q: m.qte }),
  ], etat.phase === 'SCAN_EMPL' ? 'EMP>' : 'QTE>');
}

async function traiterMissionSimple(saisie, type) {
  const m = etat.mission;
  if (!m) { etat.mission = null; return; }   /* ENT = actualiser */
  if (etat.phase === 'SCAN_EMPL') {
    const dest = saisie === '' ? m.dest : saisie.toUpperCase();
    if (!dest) { etat.message = tr('EMPLACEMENT OBLIGATOIRE'); return; }
    etat.emplacementSaisi = dest;
    etat.phase = 'QTE';
    return;
  }
  const qte = saisie === '' ? m.qte : Number(saisie);
  if (!(qte > 0) || qte > m.qte) { etat.message = tr('QTE INVALIDE (MAX {m})', { m: m.qte }); return; }
  await api('POST', `/api/missions/${m.id}/valider`, {
    qte, emplacement: etat.emplacementSaisi, operateur: etat.operateur,
  });
  etat.message = tr('MISSION {id} VALIDEE', { id: m.id });
  etat.mission = null;   /* enchaîne sur la suivante */
}

/* ============================================================
 *  Boucle du terminal
 * ============================================================ */
async function rafraichir() {
  try {
    await ECRANS[etat.ecran].afficher();
  } catch (e) {
    etat.message = tr(e.message).toUpperCase().slice(0, 38);
    rendre([entete(tr('ERREUR')), '', '', '  [ESC] MENU']);
  }
}

async function soumettre(saisie) {
  etat.message = '';
  try {
    await ECRANS[etat.ecran].traiter(saisie.trim());
  } catch (e) {
    etat.message = tr(e.message).toUpperCase().slice(0, 38);
  }
  await rafraichir();
}

function retourMenu() {
  etat.message = '';
  etat.mission = null; etat.phase = '';
  etat.inventaire = null; etat.lignesConsultation = [];
  etat.supportScanne = null;
  etat.ecran = etat.operateur ? 'MENU' : 'LOGIN';
  rafraichir();
}

champSaisie.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); soumettre(champSaisie.value); }
  if (e.key === 'Escape') { e.preventDefault(); retourMenu(); }
  if (e.key === 'F1') { e.preventDefault(); retourMenu(); }
  if (e.key === 'F4') { e.preventDefault(); champSaisie.value = '0'; }
});

document.querySelectorAll('.fonctions button').forEach(b => b.onclick = () => {
  const touche = b.dataset.touche;
  if (touche === 'ENTREE') soumettre(champSaisie.value);
  if (touche === 'ESC' || touche === 'F1') retourMenu();
  if (touche === 'F4') { champSaisie.value = '0'; champSaisie.focus(); }
});

rafraichir();
