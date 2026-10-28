'use strict';
/* ============================================================
 *  LM-WMS - IHM superviseur (vanilla JS, zéro dépendance)
 *  Routage par ancre (#/vue), rendu par gabarits de chaînes.
 *  Textes traduits via tr() (i18n.js, chargé avant ce fichier).
 * ============================================================ */

const contenu = document.getElementById('contenu');

/* ---------- Utilisateur connecté ---------- */
let UTILISATEUR = null;
const NIVEAUX_ROLE = { OPERATEUR: 1, SUPERVISEUR: 2, ADMIN: 3 };
function roleAuMoins(role) {
  return UTILISATEUR && NIVEAUX_ROLE[UTILISATEUR.role] >= NIVEAUX_ROLE[role];
}

/* ---------- Appels API ---------- */
async function api(methode, chemin, corps) {
  const options = { method: methode, headers: { 'Content-Type': 'application/json' } };
  if (corps !== undefined) options.body = JSON.stringify(corps);
  const reponse = await fetch(chemin, options);
  const donnees = await reponse.json();
  if (reponse.status === 401) { afficherConnexion(); throw new Error(donnees.erreur || 'Connexion requise'); }
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur serveur');
  return donnees;
}
const GET = chemin => api('GET', chemin);

/* ---------- Écran de connexion ---------- */
function afficherConnexion() {
  if (document.getElementById('ecran-connexion')) return;
  const voile = document.createElement('div');
  voile.className = 'voile';
  voile.id = 'ecran-connexion';
  voile.innerHTML = `
    <div class="modale" style="max-width:360px;margin-top:10vh">
      <h2>${tr('Connexion à LM-WMS')}</h2>
      <div class="champ"><label>${tr('Code utilisateur')}</label>
        <input id="cx-code" placeholder="ADMIN, CHEF, NADIA…" style="width:100%"></div>
      <div class="champ"><label>${tr('Mot de passe')}</label>
        <input id="cx-mdp" type="password" style="width:100%"></div>
      <div id="cx-erreur" style="color:var(--erreur);font-size:12.5px;min-height:18px"></div>
      <div class="actions"><button id="cx-valider" style="width:100%">${tr('Se connecter')}</button></div>
    </div>`;
  document.body.appendChild(voile);
  const valider = async () => {
    try {
      UTILISATEUR = await api('POST', '/api/connexion', {
        code: document.getElementById('cx-code').value,
        mdp: document.getElementById('cx-mdp').value,
      });
      voile.remove();
      appliquerUtilisateur();
      afficherVue();
    } catch (e) {
      document.getElementById('cx-erreur').textContent = tr(e.message);
    }
  };
  document.getElementById('cx-valider').onclick = valider;
  voile.addEventListener('keydown', e => { if (e.key === 'Enter') valider(); });
  document.getElementById('cx-code').focus();
}

/* Affiche l'utilisateur dans le bandeau + masque les entrées interdites */
function appliquerUtilisateur() {
  const pied = document.getElementById('pied-utilisateur');
  if (UTILISATEUR && !UTILISATEUR.anonyme) {
    pied.innerHTML = `<b>${ech(UTILISATEUR.nom)}</b> (${ech(tr(UTILISATEUR.role))})
      — <a class="lien" id="btn-deconnexion" style="color:#9fc3e2">${tr('quitter')}</a><br>`;
    document.getElementById('btn-deconnexion').onclick = async () => {
      await api('POST', '/api/deconnexion');
      UTILISATEUR = null;
      location.reload();
    };
  } else {
    pied.innerHTML = '';
  }
  document.querySelectorAll('nav a[data-role]').forEach(a => {
    a.style.display = roleAuMoins(a.dataset.role) ? '' : 'none';
  });
}

/* ---------- Utilitaires d'affichage ---------- */
function ech(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function dateCourte(iso) { return iso ? iso.slice(0, 16).replace('T', ' ') : ''; }

const COULEURS_STATUT = {
  ATTENTE: 'gris', ALLOUEE: 'bleu', EN_PREPARATION: 'orange', PREPAREE: 'violet',
  EMBALLEE: 'violet', EXPEDIEE: 'vert',
  PREVU: 'gris', EN_COURS: 'orange', CLOTURE: 'vert',
  CREEE: 'gris', LANCEE: 'orange', TERMINEE: 'vert',
  EN_ATTENTE: 'orange', OUVERT: 'bleu', FERME: 'violet', EXPEDIE: 'vert',
  DISPO: 'vert', BLOQUE: 'rouge', VALIDE: 'vert',
  RANGEMENT: 'bleu', PICKING: 'violet', REAPPRO: 'orange',
  ENLEVEE: 'bleu', EN_TRANSIT: 'orange', LIVREE: 'vert', INCIDENT: 'rouge',
  A_VALIDER: 'orange', VALIDEE: 'vert', LITIGE: 'rouge',
};
/* Pastille de statut : la couleur suit le statut interne, le texte
 * affiché est traduit (ou remplacé par `texte` si fourni). */
function badge(statut, texte) {
  return `<span class="badge ${COULEURS_STATUT[statut] || 'gris'}">${ech(texte ?? tr(statut))}</span>`;
}

function notifier(message, type = '') {
  const zone = document.getElementById('notifications');
  const n = document.createElement('div');
  n.className = 'notification ' + type;
  n.textContent = message;
  zone.appendChild(n);
  setTimeout(() => n.remove(), 4500);
}

/* Exécute une action API avec gestion d'erreur + rafraîchissement */
async function executer(action, messageSucces) {
  try {
    const resultat = await action();
    if (messageSucces) notifier(messageSucces, 'succes');
    await afficherVue();
    return resultat;
  } catch (e) {
    notifier(tr(e.message), 'erreur');
    return null;
  }
}

/* ---------- Opérateur courant = utilisateur connecté ----------
 * (le serveur impose de toute façon l'identité de session) */
function operateur() { return UTILISATEUR ? UTILISATEUR.code : 'SUPERVISEUR'; }

/* ---------- Fenêtre modale générique ---------- */
function ouvrirModale(html) {
  fermerModale();
  const voile = document.createElement('div');
  voile.className = 'voile';
  voile.innerHTML = `<div class="modale">${html}</div>`;
  voile.addEventListener('click', e => { if (e.target === voile) fermerModale(); });
  document.body.appendChild(voile);
  return voile;
}
function fermerModale() { document.querySelector('.voile')?.remove(); }

function valeur(id) { return document.getElementById(id)?.value.trim() ?? ''; }
function coche(id) { return !!document.getElementById(id)?.checked; }

/* ============================================================
 *  VUES
 * ============================================================ */

/* ---------- Tableau de bord ---------- */
async function vueDashboard() {
  const [kpi, missions] = await Promise.all([GET('/api/dashboard'), GET('/api/missions?statut=EN_ATTENTE')]);
  const s = kpi.commandesParStatut;
  const enCours = (s.ALLOUEE || 0) + (s.EN_PREPARATION || 0);

  const jauges = Object.entries(kpi.occupation).map(([zone, o]) => `
    <div class="jauge ${o.taux >= 90 ? 'pleine' : ''}">
      <div class="ligne"><span>${zone}</span><span>${o.occupe} / ${o.capacite} u. (${o.taux}%)</span></div>
      <div class="barre"><div style="width:${Math.min(o.taux, 100)}%"></div></div>
    </div>`).join('');

  const alertes = [
    ...kpi.retards.map(r => `<div class="alerte-bloc rouge">${tr('Commande {numero} ({client}) en retard — livraison prévue le {date}',
      { numero: `<b>${ech(r.numero)}</b>`, client: ech(r.client), date: ech(r.dateLivraison) })}</div>`),
    ...kpi.ruptures.map(n => `<div class="alerte-bloc">${tr('Rupture de stock sur la commande {numero}',
      { numero: `<b>${ech(n)}</b>` })}</div>`),
  ].join('') || `<p class="vide">${tr('Aucune alerte.')}</p>`;

  const missionsHtml = missions.length === 0 ? `<p class="vide">${tr('Aucune mission en attente.')}</p>` : `
    <table><thead><tr><th>${tr('Type')}</th><th>${tr('Article')}</th><th class="num">${tr('Qté')}</th><th>${tr('De')}</th><th>${tr('Vers')}</th><th>${tr('Référence')}</th></tr></thead>
    <tbody>${missions.slice(0, 12).map(m => `<tr>
      <td>${badge(m.type)}</td><td>${ech(m.article)}</td><td class="num">${m.qte}</td>
      <td class="mono">${ech(m.source)}</td><td class="mono">${ech(m.dest)}</td><td>${ech(m.reference)}</td>
    </tr>`).join('')}</tbody></table>
    ${missions.length > 12 ? `<p class="vide">${tr('… et {n} autres (voir Missions).', { n: missions.length - 12 })}</p>` : ''}`;

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Tableau de bord')}</h1>
      <div class="outils">
        <button class="secondaire" id="btn-reappro">${tr('Détecter les réappros picking')}</button>
        <button class="secondaire" id="btn-rafraichir">${tr('Rafraîchir')}</button>
      </div>
    </div>
    <div class="grille-kpi">
      <div class="kpi"><div class="valeur">${kpi.totalCommandes}</div><div class="libelle">${tr('Commandes au portefeuille')}</div></div>
      <div class="kpi"><div class="valeur">${s.ATTENTE || 0}</div><div class="libelle">${tr('En attente de vague')}</div></div>
      <div class="kpi orange"><div class="valeur">${enCours}</div><div class="libelle">${tr('En préparation')}</div></div>
      <div class="kpi"><div class="valeur">${(s.PREPAREE || 0) + (s.EMBALLEE || 0)}</div><div class="libelle">${tr('Prêtes à expédier')}</div></div>
      <div class="kpi vert"><div class="valeur">${s.EXPEDIEE || 0}</div><div class="libelle">${tr('Expédiées')}</div></div>
      <div class="kpi ${kpi.ruptures.length ? 'rouge' : ''}"><div class="valeur">${kpi.ruptures.length}</div><div class="libelle">${tr('Commandes en rupture')}</div></div>
      <div class="kpi"><div class="valeur">${kpi.attendusOuverts}</div><div class="libelle">${tr('Attendus à réceptionner')}</div></div>
      <div class="kpi"><div class="valeur">${kpi.vaguesEnCours}</div><div class="libelle">${tr('Vagues en cours')}</div></div>
      <div class="kpi"><div class="valeur">${kpi.mouvements24h}</div><div class="libelle">${tr('Mouvements sur 24 h')}</div></div>
      <div class="kpi"><div class="valeur">${kpi.referencesEnStock}</div><div class="libelle">${tr('Références en stock')}</div></div>
    </div>
    <div class="deux-colonnes">
      <div class="carte"><h2>${tr('Occupation de l\'entrepôt')}</h2>${jauges}</div>
      <div class="carte"><h2>${tr('Alertes')}</h2>${alertes}</div>
    </div>
    <div class="carte"><h2>${tr('Missions en attente ({n})', { n: missions.length })}</h2>${missionsHtml}</div>`;

  document.getElementById('btn-rafraichir').onclick = afficherVue;
  document.getElementById('btn-reappro').onclick = () => executer(async () => {
    const creees = await api('POST', '/api/reappro/detecter');
    notifier(creees.length ? tr('{n} mission(s) de réappro générée(s)', { n: creees.length })
                           : tr('Aucun mini picking en défaut'), 'succes');
  });
}

/* ---------- Attendus / réceptions ---------- */
async function vueAttendus() {
  const [attendus, tiers, articles] = await Promise.all([GET('/api/attendus'), GET('/api/tiers'), GET('/api/articles')]);
  const fournisseurs = tiers.filter(t => t.type === 'FOURNISSEUR');

  const lignesHtml = attendus.slice().reverse().map(a => {
    const avancement = a.lignes.reduce((somme, l) => somme + Math.min(l.qteRecue, l.qtePrevue), 0);
    const total = a.lignes.reduce((somme, l) => somme + l.qtePrevue, 0);
    return `<tr>
      <td class="mono">${ech(a.numero)}</td><td>${ech(a.fournisseur)}</td>
      <td>${ech(a.datePrevue)}</td><td>${badge(a.statut)}</td>
      <td class="num">${avancement} / ${total}</td>
      <td><button class="petit" data-detail="${a.id}">${tr('Réceptionner')}</button></td>
    </tr>`;
  }).join('');

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Attendus de réception')}</h1>
      <div class="outils"><button id="btn-nouveau">${tr('Nouvel attendu')}</button></div></div>
    <table><thead><tr><th>${tr('N°')}</th><th>${tr('Fournisseur')}</th><th>${tr('Date prévue')}</th><th>${tr('Statut')}</th><th class="num">${tr('Reçu / prévu')}</th><th></th></tr></thead>
    <tbody>${lignesHtml || `<tr><td colspan="6" class="vide">${tr('Aucun attendu.')}</td></tr>`}</tbody></table>`;

  contenu.querySelectorAll('[data-detail]').forEach(b => b.onclick = () => detailAttendu(
    attendus.find(a => a.id === Number(b.dataset.detail)), articles));

  document.getElementById('btn-nouveau').onclick = () => {
    const optionsFournisseur = fournisseurs.map(f => `<option value="${ech(f.code)}">${ech(f.code)} — ${ech(f.nom)}</option>`).join('');
    const optionsArticle = articles.map(a => `<option value="${ech(a.code)}">${ech(a.code)} — ${ech(a.designation)}</option>`).join('');
    ouvrirModale(`
      <h2>${tr('Nouvel attendu de réception')}</h2>
      <div class="champs-ligne">
        <div class="champ"><label>${tr('Fournisseur')}</label><select id="m-fournisseur">${optionsFournisseur}</select></div>
        <div class="champ"><label>${tr('Date prévue')}</label><input type="date" id="m-date" value="${new Date().toISOString().slice(0, 10)}"></div>
      </div>
      <div id="m-lignes"></div>
      <button class="secondaire petit" id="m-ajouter">${tr('+ Ajouter une ligne')}</button>
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        <button id="m-valider">${tr('Créer l\'attendu')}</button></div>`);
    const zone = document.getElementById('m-lignes');
    const ajouterLigne = () => {
      const div = document.createElement('div');
      div.className = 'champs-ligne';
      div.innerHTML = `<div class="champ"><label>${tr('Article')}</label><select class="m-art">${optionsArticle}</select></div>
        <div class="champ" style="max-width:110px"><label>${tr('Qté prévue')}</label><input type="number" class="m-qte" min="1" value="10"></div>`;
      zone.appendChild(div);
    };
    ajouterLigne();
    document.getElementById('m-ajouter').onclick = ajouterLigne;
    document.getElementById('m-valider').onclick = () => executer(async () => {
      const lignes = [...zone.querySelectorAll('.champs-ligne')].map(div => ({
        article: div.querySelector('.m-art').value, qtePrevue: Number(div.querySelector('.m-qte').value),
      }));
      await api('POST', '/api/attendus', { fournisseur: valeur('m-fournisseur'), datePrevue: valeur('m-date'), lignes });
      fermerModale();
    }, tr('Attendu créé'));
  };
}

function detailAttendu(attendu, articles) {
  const lignes = attendu.lignes.map((l, i) => {
    const article = articles.find(a => a.code === l.article) || {};
    const restant = l.qtePrevue - l.qteRecue;
    return `<tr>
      <td>${ech(l.article)}<br><small>${ech(article.designation || '')}</small></td>
      <td class="num">${l.qtePrevue}</td><td class="num">${l.qteRecue}</td>
      <td>${restant > 0 && attendu.statut !== 'CLOTURE'
        ? `<div class="champs-ligne">
             <input type="number" id="r-qte-${i}" min="1" value="${restant}" style="width:75px">
             ${article.gereLot ? `<input id="r-lot-${i}" placeholder="${tr('N° lot')}" style="width:105px">` : ''}
             ${article.gereDLC ? `<input type="date" id="r-dlc-${i}" style="width:135px">` : ''}
             <label style="display:flex;align-items:center;gap:4px;margin:0">
               <input type="checkbox" id="r-support-${i}" checked style="width:auto"> ${tr('palette SSCC')}</label>
             <button class="petit" data-recevoir="${i}">${tr('Valider')}</button>
           </div>`
        : badge(l.qteRecue >= l.qtePrevue ? 'CLOTURE' : 'EN_COURS')}</td>
    </tr>`;
  }).join('');

  ouvrirModale(`
    <h2>${ech(attendu.numero)} — ${ech(attendu.fournisseur)} ${badge(attendu.statut)}</h2>
    <p style="font-size:12.5px;color:var(--texte-doux)">${tr('La réception crée le stock sur le quai et génère automatiquement une mission de rangement avec l\'adressage proposé.')}</p>
    <table class="sous-table"><thead><tr><th>${tr('Article')}</th><th class="num">${tr('Prévu')}</th><th class="num">${tr('Reçu')}</th><th>${tr('Réception')}</th></tr></thead>
    <tbody>${lignes}</tbody></table>
    <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Fermer')}</button></div>`);

  document.querySelectorAll('[data-recevoir]').forEach(b => b.onclick = () => {
    const i = b.dataset.recevoir;
    executer(async () => {
      const r = await api('POST', `/api/attendus/${attendu.id}/lignes/${i}/receptionner`, {
        qte: Number(valeur(`r-qte-${i}`)),
        lot: valeur(`r-lot-${i}`), dlc: valeur(`r-dlc-${i}`),
        support: coche(`r-support-${i}`),
        operateur: operateur(),
      });
      fermerModale();
      notifier(tr('Reçu — mission de rangement vers {dest}', { dest: r.mission.dest || tr('(à adresser)') })
        + (r.mission.support ? ' ' + tr('(support {sscc})', { sscc: r.mission.support }) : ''), 'succes');
    });
  });
}

/* ---------- Stock ---------- */
async function vueStock() {
  const [stock, emplacements] = await Promise.all([GET('/api/stock'), GET('/api/emplacements')]);
  const zoneDe = code => (emplacements.find(e => e.code === code) || {}).zone || '';

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Stock à l\'emplacement')}</h1></div>
    <div class="filtres">
      <input id="f-article" placeholder="${tr('Filtrer par article…')}">
      <input id="f-emplacement" placeholder="${tr('Filtrer par emplacement…')}">
      <select id="f-zone"><option value="">${tr('Toutes zones')}</option>
        <option>RECEPTION</option><option>RESERVE</option><option>PICKING</option><option>EXPEDITION</option></select>
    </div>
    <table><thead><tr><th>${tr('Article')}</th><th>${tr('Emplacement')}</th><th>${tr('Zone')}</th><th>${tr('Lot')}</th><th>${tr('DLC')}</th>
      <th class="num">${tr('Qté')}</th><th class="num">${tr('Réservé')}</th><th>${tr('Statut')}</th><th></th></tr></thead>
    <tbody id="corps-stock"></tbody></table>`;

  const rendre = () => {
    const fa = valeur('f-article').toUpperCase(), fe = valeur('f-emplacement').toUpperCase(), fz = valeur('f-zone');
    const lignes = stock.filter(s =>
      (!fa || s.article.includes(fa)) && (!fe || s.emplacement.includes(fe)) && (!fz || zoneDe(s.emplacement) === fz));
    document.getElementById('corps-stock').innerHTML = lignes.map(s => `<tr>
      <td>${ech(s.article)}</td><td class="mono">${ech(s.emplacement)}</td><td>${ech(zoneDe(s.emplacement))}</td>
      <td class="mono">${ech(s.lot)}</td><td>${ech(s.dlc)}</td>
      <td class="num">${s.qte}</td><td class="num">${s.qteReservee || ''}</td><td>${badge(s.statut)}</td>
      <td><button class="petit secondaire" data-ajuster="${s.id}">${tr('Ajuster')}</button>
          <button class="petit ${s.statut === 'BLOQUE' ? '' : 'danger'}" data-bloquer="${s.id}">
            ${s.statut === 'BLOQUE' ? tr('Débloquer') : tr('Bloquer')}</button></td>
    </tr>`).join('') || `<tr><td colspan="9" class="vide">${tr('Aucune ligne de stock.')}</td></tr>`;

    document.querySelectorAll('[data-ajuster]').forEach(b => b.onclick = () => {
      const s = stock.find(x => x.id === Number(b.dataset.ajuster));
      ouvrirModale(`
        <h2>${tr('Ajustement — {article} sur {emplacement}', { article: ech(s.article), emplacement: ech(s.emplacement) })}</h2>
        <div class="champs-ligne">
          <div class="champ"><label>${tr('Nouvelle quantité (actuelle : {qte})', { qte: s.qte })}</label>
            <input type="number" id="m-qte" min="0" value="${s.qte}"></div>
          <div class="champ"><label>${tr('Motif')}</label><input id="m-motif" placeholder="${tr('Casse, erreur de comptage…')}"></div>
        </div>
        <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
          <button id="m-valider">${tr('Ajuster')}</button></div>`);
      document.getElementById('m-valider').onclick = () => executer(async () => {
        await api('POST', `/api/stock/${s.id}/ajuster`, { qte: Number(valeur('m-qte')), motif: valeur('m-motif'), operateur: operateur() });
        fermerModale();
      }, tr('Stock ajusté'));
    });
    document.querySelectorAll('[data-bloquer]').forEach(b => b.onclick = () => {
      const s = stock.find(x => x.id === Number(b.dataset.bloquer));
      executer(() => api('POST', `/api/stock/${s.id}/bloquer`, { bloque: s.statut !== 'BLOQUE', operateur: operateur() }),
               s.statut === 'BLOQUE' ? tr('Ligne débloquée') : tr('Ligne bloquée (qualité)'));
    });
  };
  rendre();
  ['f-article', 'f-emplacement', 'f-zone'].forEach(id => document.getElementById(id).oninput = rendre);
}

/* ---------- Commandes ---------- */
async function vueCommandes() {
  const [commandes, tiers, articles, transporteurs] = await Promise.all(
    [GET('/api/commandes'), GET('/api/tiers'), GET('/api/articles'), GET('/api/transporteurs')]);
  const clients = tiers.filter(t => t.type === 'CLIENT');

  const lignes = commandes.slice().reverse().map(c => `<tr>
    <td><input type="checkbox" data-coche="${c.id}" ${['ATTENTE', 'ALLOUEE'].includes(c.statut) && !c.vague ? '' : 'disabled'}></td>
    <td class="mono">${ech(c.numero)}</td><td>${ech(c.client)}</td>
    <td class="num">${c.priorite}</td><td>${ech(c.dateLivraison)}</td>
    <td>${badge(c.statut)} ${c.rupture ? badge('BLOQUE', tr('RUPTURE')) : ''}</td>
    <td class="num">${c.lignes.length}</td>
    <td><button class="petit secondaire" data-detail="${c.id}">${tr('Détail')}</button></td>
  </tr>`).join('');

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Commandes clients')}</h1>
      <div class="outils">
        <button class="secondaire" id="btn-vague" disabled>${tr('Créer une vague avec la sélection')}</button>
        <button id="btn-nouvelle">${tr('Nouvelle commande')}</button>
      </div></div>
    <table><thead><tr><th></th><th>${tr('N°')}</th><th>${tr('Client')}</th><th class="num">${tr('Prio')}</th><th>${tr('Livraison')}</th>
      <th>${tr('Statut')}</th><th class="num">${tr('Lignes')}</th><th></th></tr></thead>
    <tbody>${lignes || `<tr><td colspan="8" class="vide">${tr('Aucune commande.')}</td></tr>`}</tbody></table>`;

  const btnVague = document.getElementById('btn-vague');
  const cochees = () => [...contenu.querySelectorAll('[data-coche]:checked')].map(c => Number(c.dataset.coche));
  contenu.querySelectorAll('[data-coche]').forEach(c => c.onchange = () => { btnVague.disabled = cochees().length === 0; });
  btnVague.onclick = () => executer(async () => {
    const vague = await api('POST', '/api/vagues', { commandes: cochees() });
    notifier(tr('Vague {numero} créée — lancez-la depuis l\'écran Vagues', { numero: vague.numero }), 'succes');
    location.hash = '#/vagues';
  });

  contenu.querySelectorAll('[data-detail]').forEach(b => b.onclick = () => {
    const c = commandes.find(x => x.id === Number(b.dataset.detail));
    ouvrirModale(`
      <h2>${ech(c.numero)} — ${ech(c.client)} ${badge(c.statut)}</h2>
      <p style="font-size:12.5px;color:var(--texte-doux)">${tr('Priorité {p} · livraison {d} · transporteur {t}', {
        p: c.priorite,
        d: ech(c.dateLivraison || tr('non planifiée')),
        t: ech(c.transporteur || '—'),
      })}</p>
      <table class="sous-table"><thead><tr><th>${tr('Article')}</th><th class="num">${tr('Cdée')}</th><th class="num">${tr('Allouée')}</th>
        <th class="num">${tr('Préparée')}</th><th class="num">${tr('Emballée')}</th></tr></thead>
      <tbody>${c.lignes.map(l => `<tr><td>${ech(l.article)}</td><td class="num">${l.qteCommandee}</td>
        <td class="num">${l.qteAllouee}</td><td class="num">${l.qtePreparee}</td><td class="num">${l.qteEmballee}</td></tr>`).join('')}
      </tbody></table>
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Fermer')}</button></div>`);
  });

  document.getElementById('btn-nouvelle').onclick = () => {
    const optionsClient = clients.map(c => `<option value="${ech(c.code)}">${ech(c.code)} — ${ech(c.nom)}</option>`).join('');
    const optionsArticle = articles.map(a => `<option value="${ech(a.code)}">${ech(a.code)} — ${ech(a.designation)}</option>`).join('');
    const optionsTransporteur = transporteurs.map(t => `<option value="${ech(t.code)}">${ech(t.nom)}</option>`).join('');
    ouvrirModale(`
      <h2>${tr('Nouvelle commande client')}</h2>
      <div class="champs-ligne">
        <div class="champ"><label>${tr('Client')}</label><select id="m-client">${optionsClient}</select></div>
        <div class="champ" style="max-width:90px"><label>${tr('Priorité (1-9)')}</label><input type="number" id="m-prio" min="1" max="9" value="5"></div>
      </div>
      <div class="champs-ligne">
        <div class="champ"><label>${tr('Date de livraison')}</label><input type="date" id="m-livraison"></div>
        <div class="champ"><label>${tr('Transporteur')}</label><select id="m-transporteur">${optionsTransporteur}</select></div>
      </div>
      <div id="m-lignes"></div>
      <button class="secondaire petit" id="m-ajouter">${tr('+ Ajouter une ligne')}</button>
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        <button id="m-valider">${tr('Créer la commande')}</button></div>`);
    const zone = document.getElementById('m-lignes');
    const ajouterLigne = () => {
      const div = document.createElement('div');
      div.className = 'champs-ligne';
      div.innerHTML = `<div class="champ"><label>${tr('Article')}</label><select class="m-art">${optionsArticle}</select></div>
        <div class="champ" style="max-width:110px"><label>${tr('Quantité')}</label><input type="number" class="m-qte" min="1" value="1"></div>`;
      zone.appendChild(div);
    };
    ajouterLigne();
    document.getElementById('m-ajouter').onclick = ajouterLigne;
    document.getElementById('m-valider').onclick = () => executer(async () => {
      const lignesCmd = [...zone.querySelectorAll('.champs-ligne')].map(div => ({
        article: div.querySelector('.m-art').value, qte: Number(div.querySelector('.m-qte').value),
      }));
      await api('POST', '/api/commandes', {
        client: valeur('m-client'), priorite: Number(valeur('m-prio')),
        dateLivraison: valeur('m-livraison'), transporteur: valeur('m-transporteur'), lignes: lignesCmd,
      });
      fermerModale();
    }, tr('Commande créée'));
  };
}

/* ---------- Vagues ---------- */
async function vueVagues() {
  const [vagues, commandes, missions] = await Promise.all(
    [GET('/api/vagues'), GET('/api/commandes'), GET('/api/missions')]);

  const lignes = vagues.slice().reverse().map(v => {
    const missionsVague = missions.filter(m => m.vague === v.id);
    const faites = missionsVague.filter(m => m.statut === 'TERMINEE').length;
    return `<tr>
      <td class="mono">${ech(v.numero)}</td><td>${dateCourte(v.dateCreation)}</td>
      <td>${v.commandes.map(id => ech((commandes.find(c => c.id === id) || {}).numero || id)).join(', ')}</td>
      <td>${badge(v.statut)}</td>
      <td class="num">${v.statut === 'CREEE' ? '—' : `${faites} / ${missionsVague.length}`}</td>
      <td>${v.statut === 'CREEE' ? `<button class="petit" data-lancer="${v.id}">${tr('Lancer')}</button>` : ''}
          <button class="petit secondaire" data-detail="${v.id}">${tr('Missions')}</button></td>
    </tr>`;
  }).join('');

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Vagues de préparation')}</h1>
      <div class="outils"><a class="lien" href="#/commandes">${tr('Créer une vague depuis l\'écran Commandes')}</a></div></div>
    <table><thead><tr><th>${tr('N°')}</th><th>${tr('Créée le')}</th><th>${tr('Commandes')}</th><th>${tr('Statut')}</th><th class="num">${tr('Avancement')}</th><th></th></tr></thead>
    <tbody>${lignes || `<tr><td colspan="6" class="vide">${tr('Aucune vague.')}</td></tr>`}</tbody></table>`;

  contenu.querySelectorAll('[data-lancer]').forEach(b => b.onclick = () => executer(async () => {
    const { ruptures } = await api('POST', `/api/vagues/${b.dataset.lancer}/lancer`);
    if (ruptures.length) {
      notifier(tr('Vague lancée avec {n} rupture(s) : ', { n: ruptures.length }) +
        ruptures.map(r => `${r.article} (-${r.manquant})`).join(', '), 'erreur');
    } else notifier(tr('Vague lancée — missions de picking générées'), 'succes');
  }));

  contenu.querySelectorAll('[data-detail]').forEach(b => b.onclick = () => {
    const v = vagues.find(x => x.id === Number(b.dataset.detail));
    const missionsVague = missions.filter(m => m.vague === v.id).sort((a, b2) => a.ordre - b2.ordre);
    ouvrirModale(`
      <h2>${ech(v.numero)} ${badge(v.statut)}</h2>
      <table class="sous-table"><thead><tr><th class="num">${tr('Ordre')}</th><th>${tr('Emplacement')}</th><th>${tr('Article')}</th>
        <th>${tr('Lot')}</th><th class="num">${tr('Qté')}</th><th>${tr('Commande')}</th><th>${tr('Statut')}</th></tr></thead>
      <tbody>${missionsVague.map(m => `<tr><td class="num">${m.ordre}</td><td class="mono">${ech(m.source)}</td>
        <td>${ech(m.article)}</td><td class="mono">${ech(m.lot)}</td><td class="num">${m.qte}</td>
        <td>${ech(m.reference)}</td><td>${badge(m.statut)}</td></tr>`).join('')
        || `<tr><td colspan="7" class="vide">${tr('Vague non lancée : missions générées au lancement.')}</td></tr>`}</tbody></table>
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Fermer')}</button></div>`);
  });
}

/* ---------- Missions ---------- */
async function vueMissions() {
  const missions = await GET('/api/missions');

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Missions')}</h1></div>
    <div class="filtres">
      <select id="f-type"><option value="">${tr('Tous types')}</option>
        <option value="RANGEMENT">${tr('RANGEMENT')}</option>
        <option value="PICKING">${tr('PICKING')}</option>
        <option value="REAPPRO">${tr('REAPPRO')}</option></select>
      <select id="f-statut"><option value="">${tr('Tous statuts')}</option>
        <option value="EN_ATTENTE">${tr('EN_ATTENTE')}</option>
        <option value="TERMINEE">${tr('TERMINEE')}</option></select>
    </div>
    <table><thead><tr><th class="num">${tr('N°')}</th><th>${tr('Type')}</th><th>${tr('Article')}</th><th>${tr('Lot')}</th><th class="num">${tr('Qté')}</th>
      <th>${tr('De')}</th><th>${tr('Vers')}</th><th>${tr('Référence')}</th><th>${tr('Statut')}</th><th>${tr('Opérateur')}</th><th></th></tr></thead>
    <tbody id="corps-missions"></tbody></table>`;

  const rendre = () => {
    const ft = valeur('f-type'), fs = valeur('f-statut');
    const lignes = missions.slice().reverse().filter(m => (!ft || m.type === ft) && (!fs || m.statut === fs));
    document.getElementById('corps-missions').innerHTML = lignes.map(m => `<tr>
      <td class="num">${m.id}</td><td>${badge(m.type)}</td><td>${ech(m.article)}</td>
      <td class="mono">${ech(m.lot)}</td><td class="num">${m.qte}</td>
      <td class="mono">${ech(m.source)}</td><td class="mono">${ech(m.dest)}</td>
      <td>${ech(m.reference)}</td><td>${badge(m.statut)}</td><td>${ech(m.operateur)}</td>
      <td>${m.statut === 'EN_ATTENTE' ? `<button class="petit" data-valider="${m.id}">${tr('Valider')}</button>` : ''}</td>
    </tr>`).join('') || `<tr><td colspan="11" class="vide">${tr('Aucune mission.')}</td></tr>`;

    document.querySelectorAll('[data-valider]').forEach(b => b.onclick = () => {
      const m = missions.find(x => x.id === Number(b.dataset.valider));
      ouvrirModale(`
        <h2>${tr('Valider la mission {id} ({type})', { id: m.id, type: ech(tr(m.type)) })}</h2>
        <p>${tr('{article} — {qte} u. de {source} vers {dest}', {
          article: ech(m.article), qte: m.qte,
          source: `<b class="mono">${ech(m.source)}</b>`,
          dest: `<b class="mono">${ech(m.dest || '?')}</b>`,
        })}</p>
        <div class="champs-ligne">
          <div class="champ"><label>${tr('Quantité réelle')}</label><input type="number" id="m-qte" min="0" max="${m.qte}" value="${m.qte}"></div>
          ${m.type !== 'PICKING' ? `<div class="champ"><label>${tr('Emplacement destination')}</label>
            <input id="m-empl" value="${ech(m.dest)}" placeholder="${tr('Code emplacement')}"></div>` : ''}
        </div>
        <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
          <button id="m-valider">${tr('Valider')}</button></div>`);
      document.getElementById('m-valider').onclick = () => executer(async () => {
        await api('POST', `/api/missions/${m.id}/valider`, {
          qte: Number(valeur('m-qte')), emplacement: valeur('m-empl') || undefined, operateur: operateur(),
        });
        fermerModale();
      }, tr('Mission validée'));
    });
  };
  rendre();
  ['f-type', 'f-statut'].forEach(id => document.getElementById(id).oninput = rendre);
}

/* ---------- Colisage / expéditions ---------- */
async function vueExpeditions() {
  const [colis, chargements, commandes, transporteurs, tiers] = await Promise.all(
    [GET('/api/colis'), GET('/api/chargements'), GET('/api/commandes'), GET('/api/transporteurs'), GET('/api/tiers')]);
  const commandeDe = id => commandes.find(c => c.id === id) || {};
  const aEmballer = commandes.filter(c => ['PREPAREE', 'EMBALLEE'].includes(c.statut));

  const lignesColis = colis.slice().reverse().map(c => {
    const cmd = commandeDe(c.commande);
    return `<tr>
      <td class="mono">${ech(c.sscc)}</td><td>${ech(cmd.numero)} — ${ech(cmd.client)}</td>
      <td class="num">${c.lignes.reduce((somme, l) => somme + l.qte, 0)}</td><td>${badge(c.statut)}</td>
      <td>${c.statut === 'OUVERT' ? `<button class="petit" data-remplir="${c.id}">${tr('Remplir')}</button>
             <button class="petit secondaire" data-fermer="${c.id}">${tr('Fermer')}</button>` : ''}
          <button class="petit secondaire" data-etiquette="${c.id}">${tr('Étiquette')}</button></td>
    </tr>`;
  }).join('');

  const lignesChargements = chargements.slice().reverse().map(ch => `<tr>
    <td class="mono">${ech(ch.numero)}</td><td>${ech(ch.transporteur)}</td>
    <td class="num">${ch.colis.length}</td><td>${badge(ch.statut)}</td>
    <td>${ch.statut === 'OUVERT' ? `<button class="petit secondaire" data-charger="${ch.id}">${tr('Ajouter colis')}</button>
          <button class="petit" data-expedier="${ch.id}">${tr('Départ')}</button>` : dateCourte(ch.dateDepart)}</td>
  </tr>`).join('');

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Colisage & expéditions')}</h1>
      <div class="outils">
        <button class="secondaire" id="btn-colis" ${aEmballer.length ? '' : 'disabled'}>${tr('Nouveau colis')}</button>
        <button id="btn-chargement">${tr('Nouveau chargement')}</button>
      </div></div>
    <div class="carte"><h2>${tr('Colis (SSCC)')}</h2>
      <table><thead><tr><th>SSCC</th><th>${tr('Commande')}</th><th class="num">${tr('Unités')}</th><th>${tr('Statut')}</th><th></th></tr></thead>
      <tbody>${lignesColis || `<tr><td colspan="5" class="vide">${tr('Aucun colis. Les commandes doivent être PREPAREE.')}</td></tr>`}</tbody></table></div>
    <div class="carte"><h2>${tr('Chargements transporteur')}</h2>
      <table><thead><tr><th>${tr('N°')}</th><th>${tr('Transporteur')}</th><th class="num">${tr('Colis (SSCC)')}</th><th>${tr('Statut')}</th><th></th></tr></thead>
      <tbody>${lignesChargements || `<tr><td colspan="5" class="vide">${tr('Aucun chargement.')}</td></tr>`}</tbody></table></div>`;

  document.getElementById('btn-colis').onclick = () => {
    ouvrirModale(`
      <h2>${tr('Nouveau colis')}</h2>
      <div class="champ"><label>${tr('Commande préparée')}</label>
        <select id="m-commande">${aEmballer.map(c =>
          `<option value="${c.id}">${ech(c.numero)} — ${ech(c.client)}</option>`).join('')}</select></div>
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        <button id="m-valider">${tr('Générer le SSCC')}</button></div>`);
    document.getElementById('m-valider').onclick = () => executer(async () => {
      const c = await api('POST', '/api/colis', { commande: Number(valeur('m-commande')) });
      fermerModale();
      notifier(tr('Colis créé — SSCC {sscc}', { sscc: c.sscc }), 'succes');
    });
  };

  contenu.querySelectorAll('[data-remplir]').forEach(b => b.onclick = () => {
    const c = colis.find(x => x.id === Number(b.dataset.remplir));
    const cmd = commandeDe(c.commande);
    const restantes = cmd.lignes.filter(l => l.qtePreparee - l.qteEmballee > 0);
    ouvrirModale(`
      <h2>${tr('Remplir le colis {sscc}', { sscc: `<span class="mono">${ech(c.sscc)}</span>` })}</h2>
      ${restantes.length === 0 ? `<p class="vide">${tr('Tout est déjà emballé pour cette commande.')}</p>` : `
      <table class="sous-table"><thead><tr><th>${tr('Article')}</th><th class="num">${tr('À emballer')}</th><th style="width:130px">${tr('Qté')}</th></tr></thead>
      <tbody>${restantes.map((l, i) => `<tr><td>${ech(l.article)}</td>
        <td class="num">${l.qtePreparee - l.qteEmballee}</td>
        <td><input type="number" class="m-colis-qte" data-article="${ech(l.article)}"
             min="0" max="${l.qtePreparee - l.qteEmballee}" value="${l.qtePreparee - l.qteEmballee}"
             id="cq-${i}" style="width:90px"></td></tr>`).join('')}</tbody></table>`}
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        ${restantes.length ? `<button id="m-valider">${tr('Ajouter au colis')}</button>` : ''}</div>`);
    const btn = document.getElementById('m-valider');
    if (btn) btn.onclick = () => executer(async () => {
      for (const champ of document.querySelectorAll('.m-colis-qte')) {
        const qte = Number(champ.value);
        if (qte > 0) await api('POST', `/api/colis/${c.id}/lignes`, { article: champ.dataset.article, qte });
      }
      fermerModale();
    }, tr('Colis mis à jour'));
  });

  contenu.querySelectorAll('[data-fermer]').forEach(b => b.onclick = () =>
    executer(() => api('POST', `/api/colis/${b.dataset.fermer}/fermer`), tr('Colis fermé')));

  contenu.querySelectorAll('[data-etiquette]').forEach(b => b.onclick = () => {
    const c = colis.find(x => x.id === Number(b.dataset.etiquette));
    const cmd = commandeDe(c.commande);
    const client = tiers.find(t => t.code === cmd.client) || { nom: cmd.client };
    const fenetre = window.open('', '_blank', 'width=420,height=560');
    fenetre.document.write(`<html><head><title>${tr('Étiquette {sscc}', { sscc: c.sscc })}</title><style>
      body{font-family:Arial;margin:14px} .cadre{border:3px solid #000;padding:14px}
      h1{font-size:15px;margin:0 0 8px} .sscc{font-family:monospace;font-size:19px;font-weight:bold;letter-spacing:1.5px}
      .barres{height:64px;background:repeating-linear-gradient(90deg,#000 0 2px,#fff 2px 5px);margin:10px 0}
      table{width:100%;font-size:13px} td{padding:2px 4px;vertical-align:top}</style></head><body>
      <div class="cadre"><h1>${tr('LM-WMS — Étiquette logistique')}</h1>
      <table><tr><td><b>${tr('Destinataire')}</b><br>${ech(client.nom)}<br>${ech(client.adresse || '')}<br>${ech(client.ville || '')}</td>
        <td><b>${tr('Commande')}</b><br>${ech(cmd.numero)}<br><b>${tr('Transporteur')}</b><br>${ech(cmd.transporteur || '—')}</td></tr></table>
      <div class="barres"></div>
      <div>SSCC&nbsp;: <span class="sscc">(00) ${ech(c.sscc)}</span></div>
      <table style="margin-top:10px;border-top:1px solid #000">${c.lignes.map(l =>
        `<tr><td>${ech(l.article)}</td><td style="text-align:right">${l.qte} u.</td></tr>`).join('')}</table>
      </div><script>window.print()<\/script></body></html>`);
    fenetre.document.close();
  });

  document.getElementById('btn-chargement').onclick = () => {
    ouvrirModale(`
      <h2>${tr('Nouveau chargement')}</h2>
      <div class="champ"><label>${tr('Transporteur')}</label><select id="m-transporteur">
        ${transporteurs.map(t => `<option value="${ech(t.code)}">${ech(t.nom)}</option>`).join('')}</select></div>
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        <button id="m-valider">${tr('Créer')}</button></div>`);
    document.getElementById('m-valider').onclick = () => executer(async () => {
      await api('POST', '/api/chargements', { transporteur: valeur('m-transporteur') });
      fermerModale();
    }, tr('Chargement créé'));
  };

  contenu.querySelectorAll('[data-charger]').forEach(b => b.onclick = () => {
    const disponibles = colis.filter(c => c.statut === 'FERME');
    ouvrirModale(`
      <h2>${tr('Ajouter un colis au chargement')}</h2>
      ${disponibles.length === 0 ? `<p class="vide">${tr('Aucun colis fermé disponible.')}</p>` : `
      <div class="champ"><label>${tr('Colis (SSCC)')}</label><select id="m-sscc">
        ${disponibles.map(c => `<option value="${ech(c.sscc)}">${ech(c.sscc)} — ${ech(commandeDe(c.commande).numero)}</option>`).join('')}
      </select></div>`}
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        ${disponibles.length ? `<button id="m-valider">${tr('Ajouter')}</button>` : ''}</div>`);
    const btn = document.getElementById('m-valider');
    if (btn) btn.onclick = () => executer(async () => {
      await api('POST', `/api/chargements/${b.dataset.charger}/colis`, { sscc: valeur('m-sscc') });
      fermerModale();
    }, tr('Colis chargé'));
  });

  contenu.querySelectorAll('[data-expedier]').forEach(b => b.onclick = () =>
    executer(() => api('POST', `/api/chargements/${b.dataset.expedier}/expedier`, { operateur: operateur() }),
             tr('Chargement parti — commandes expédiées')));
}

/* ---------- Inventaires ---------- */
async function vueInventaires() {
  const [inventaires, emplacements] = await Promise.all([GET('/api/inventaires'), GET('/api/emplacements')]);

  const lignes = inventaires.slice().reverse().map(i => `<tr>
    <td class="mono">${ech(i.numero)}</td><td class="mono">${ech(i.emplacement)}</td>
    <td>${dateCourte(i.dateCreation)}</td><td>${badge(i.statut)}</td>
    <td class="num">${i.lignes.filter(l => l.ecart).length || ''}</td>
    <td>${i.statut === 'EN_COURS' ? `<button class="petit" data-compter="${i.id}">${tr('Compter / valider')}</button>` : ''}</td>
  </tr>`).join('');

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Inventaires')}</h1>
      <div class="outils"><button id="btn-nouveau">${tr('Nouvel inventaire d\'emplacement')}</button></div></div>
    <table><thead><tr><th>${tr('N°')}</th><th>${tr('Emplacement')}</th><th>${tr('Créée le')}</th><th>${tr('Statut')}</th><th class="num">${tr('Écarts')}</th><th></th></tr></thead>
    <tbody>${lignes || `<tr><td colspan="6" class="vide">${tr('Aucun inventaire.')}</td></tr>`}</tbody></table>`;

  document.getElementById('btn-nouveau').onclick = () => {
    ouvrirModale(`
      <h2>${tr('Nouvel inventaire')}</h2>
      <div class="champ"><label>${tr('Emplacement à compter')}</label><select id="m-empl">
        ${emplacements.filter(e => e.zone !== 'RECEPTION').map(e =>
          `<option value="${ech(e.code)}">${ech(e.code)} (${ech(e.zone)})</option>`).join('')}</select></div>
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        <button id="m-valider">${tr('Créer')}</button></div>`);
    document.getElementById('m-valider').onclick = () => executer(async () => {
      await api('POST', '/api/inventaires', { emplacement: valeur('m-empl') });
      fermerModale();
    }, tr('Inventaire créé'));
  };

  contenu.querySelectorAll('[data-compter]').forEach(b => b.onclick = () => {
    const inv = inventaires.find(x => x.id === Number(b.dataset.compter));
    ouvrirModale(`
      <h2>${tr('{numero} — comptage {emplacement}', { numero: ech(inv.numero), emplacement: ech(inv.emplacement) })}</h2>
      ${inv.lignes.length === 0 ? `<p class="vide">${tr('Emplacement théoriquement vide : ajoutez ce que vous trouvez.')}</p>` : ''}
      <table class="sous-table"><thead><tr><th>${tr('Article')}</th><th>${tr('Lot')}</th><th class="num">${tr('Théorique')}</th><th style="width:110px">${tr('Compté')}</th></tr></thead>
      <tbody>${inv.lignes.map((l, i) => `<tr><td>${ech(l.article)}</td><td class="mono">${ech(l.lot)}</td>
        <td class="num">${l.qteTheorique}</td>
        <td><input type="number" min="0" id="i-qte-${i}" value="${l.qteComptee ?? l.qteTheorique}" style="width:85px"></td></tr>`).join('')}
      </tbody></table>
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        <button id="m-valider">${tr('Compter et valider les écarts')}</button></div>`);
    document.getElementById('m-valider').onclick = () => executer(async () => {
      const comptages = inv.lignes.map((l, i) => ({ article: l.article, lot: l.lot, qteComptee: Number(valeur(`i-qte-${i}`)) }));
      await api('POST', `/api/inventaires/${inv.id}/compter`, { comptages, operateur: operateur() });
      await api('POST', `/api/inventaires/${inv.id}/valider`, { operateur: operateur() });
      fermerModale();
    }, tr('Inventaire validé, stock ajusté'));
  });
}

/* ---------- Mouvements ---------- */
async function vueMouvements() {
  const mouvements = await GET('/api/mouvements');
  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Journal des mouvements')}</h1></div>
    <div class="filtres">
      <select id="f-type"><option value="">${tr('Tous types')}</option>
        ${['RECEPTION', 'RANGEMENT', 'PICKING', 'REAPPRO', 'AJUSTEMENT', 'INVENTAIRE', 'EXPEDITION', 'BLOCAGE']
          .map(t => `<option value="${t}">${tr(t)}</option>`).join('')}</select>
      <input id="f-article" placeholder="${tr('Filtrer par article…')}">
    </div>
    <table><thead><tr><th>${tr('Date')}</th><th>${tr('Type')}</th><th>${tr('Article')}</th><th>${tr('Lot')}</th><th class="num">${tr('Qté')}</th>
      <th>${tr('De')}</th><th>${tr('Vers')}</th><th>${tr('Opérateur')}</th><th>${tr('Référence')}</th></tr></thead>
    <tbody id="corps-mouvements"></tbody></table>`;

  const rendre = () => {
    const ft = valeur('f-type'), fa = valeur('f-article').toUpperCase();
    const lignes = mouvements.filter(m => (!ft || m.type === ft) && (!fa || m.article.includes(fa)));
    document.getElementById('corps-mouvements').innerHTML = lignes.map(m => `<tr>
      <td>${dateCourte(m.date)}</td><td>${badge(m.type)}</td><td>${ech(m.article)}</td>
      <td class="mono">${ech(m.lot)}</td><td class="num">${m.qte}</td>
      <td class="mono">${ech(m.source)}</td><td class="mono">${ech(m.dest)}</td>
      <td>${ech(m.operateur)}</td><td>${ech(m.reference)}</td>
    </tr>`).join('') || `<tr><td colspan="9" class="vide">${tr('Aucun mouvement.')}</td></tr>`;
  };
  rendre();
  ['f-type', 'f-article'].forEach(id => document.getElementById(id).oninput = rendre);
}

/* ---------- Articles ---------- */
async function vueArticles() {
  const [articles, emplacements] = await Promise.all([GET('/api/articles'), GET('/api/emplacements')]);
  const pickings = emplacements.filter(e => e.zone === 'PICKING');

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Articles')}</h1>
      <div class="outils"><button id="btn-nouveau">${tr('Nouvel article')}</button></div></div>
    <table><thead><tr><th>${tr('Code')}</th><th>${tr('Désignation')}</th><th>EAN</th><th class="num">PCB</th>
      <th>${tr('Lot')}</th><th>${tr('DLC')}</th><th>${tr('Rotation')}</th><th>${tr('PICKING')}</th><th class="num">${tr('Mini')}</th><th></th></tr></thead>
    <tbody>${articles.map(a => `<tr>
      <td class="mono">${ech(a.code)}</td><td>${ech(a.designation)}</td><td class="mono">${ech(a.ean)}</td>
      <td class="num">${a.pcb}</td><td>${a.gereLot ? tr('Oui') : '—'}</td><td>${a.gereDLC ? tr('Oui') : '—'}</td>
      <td>${ech(a.classeRotation)}</td><td class="mono">${ech(a.emplacementPicking)}</td>
      <td class="num">${a.stockMiniPicking || ''}</td>
      <td><button class="petit secondaire" data-editer="${ech(a.code)}">${tr('Modifier')}</button></td>
    </tr>`).join('') || `<tr><td colspan="10" class="vide">${tr('Aucun article.')}</td></tr>`}</tbody></table>`;

  const formulaire = (a = {}) => `
    <div class="champs-ligne">
      <div class="champ"><label>${tr('Code')}</label><input id="m-code" value="${ech(a.code || '')}" ${a.code ? 'disabled' : ''}></div>
      <div class="champ" style="flex:2"><label>${tr('Désignation')}</label><input id="m-designation" value="${ech(a.designation || '')}"></div>
    </div>
    <div class="champs-ligne">
      <div class="champ"><label>EAN</label><input id="m-ean" value="${ech(a.ean || '')}"></div>
      <div class="champ" style="max-width:90px"><label>PCB</label><input type="number" id="m-pcb" min="1" value="${a.pcb || 1}"></div>
      <div class="champ" style="max-width:110px"><label>${tr('Rotation')}</label>
        <select id="m-rotation">${['A', 'B', 'C'].map(r => `<option ${a.classeRotation === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
    </div>
    <div class="champs-ligne">
      <div class="champ"><label>${tr('Emplacement picking dédié')}</label><select id="m-picking">
        <option value="">${tr('— aucun —')}</option>
        ${pickings.map(e => `<option ${a.emplacementPicking === e.code ? 'selected' : ''}>${ech(e.code)}</option>`).join('')}</select></div>
      <div class="champ" style="max-width:120px"><label>${tr('Mini picking')}</label>
        <input type="number" id="m-mini" min="0" value="${a.stockMiniPicking || 0}"></div>
      <div class="champ" style="max-width:120px"><label>${tr('Poids unit. (kg)')}</label>
        <input type="number" step="0.01" id="m-poids" min="0" value="${a.poidsUnitaire || 0}"></div>
    </div>
    <div class="champs-ligne">
      <div class="champ"><label><input type="checkbox" id="m-lot" ${a.gereLot ? 'checked' : ''} style="width:auto"> ${tr('Géré au lot')}</label></div>
      <div class="champ"><label><input type="checkbox" id="m-dlc" ${a.gereDLC ? 'checked' : ''} style="width:auto"> ${tr('Géré en DLC (FEFO)')}</label></div>
    </div>`;

  const lireFormulaire = () => ({
    designation: valeur('m-designation'), ean: valeur('m-ean'), pcb: Number(valeur('m-pcb')),
    classeRotation: valeur('m-rotation'), emplacementPicking: valeur('m-picking'),
    stockMiniPicking: Number(valeur('m-mini')), poidsUnitaire: Number(valeur('m-poids')),
    gereLot: coche('m-lot'), gereDLC: coche('m-dlc'),
  });

  document.getElementById('btn-nouveau').onclick = () => {
    ouvrirModale(`<h2>${tr('Nouvel article')}</h2>${formulaire()}
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        <button id="m-valider">${tr('Créer')}</button></div>`);
    document.getElementById('m-valider').onclick = () => executer(async () => {
      await api('POST', '/api/articles', { code: valeur('m-code'), ...lireFormulaire() });
      fermerModale();
    }, tr('Article créé'));
  };

  contenu.querySelectorAll('[data-editer]').forEach(b => b.onclick = () => {
    const a = articles.find(x => x.code === b.dataset.editer);
    ouvrirModale(`<h2>${tr('Modifier {code}', { code: ech(a.code) })}</h2>${formulaire(a)}
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        <button id="m-valider">${tr('Enregistrer')}</button></div>`);
    document.getElementById('m-valider').onclick = () => executer(async () => {
      await api('PUT', `/api/articles/${a.code}`, lireFormulaire());
      fermerModale();
    }, tr('Article modifié'));
  });
}

/* ---------- Emplacements ---------- */
async function vueEmplacements() {
  const [emplacements, stock] = await Promise.all([GET('/api/emplacements'), GET('/api/stock')]);
  const occupe = code => stock.filter(s => s.emplacement === code).reduce((somme, s) => somme + s.qte, 0);

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Emplacements')}</h1>
      <div class="outils"><button id="btn-nouveau">${tr('Nouvel emplacement')}</button></div></div>
    <div class="filtres"><select id="f-zone"><option value="">${tr('Toutes zones')}</option>
      <option>RECEPTION</option><option>RESERVE</option><option>PICKING</option><option>EXPEDITION</option></select></div>
    <table><thead><tr><th>${tr('Code')}</th><th>${tr('Zone')}</th><th>${tr('Allée')}</th><th>${tr('Type')}</th>
      <th class="num">${tr('Occupation')}</th><th>${tr('État')}</th><th></th></tr></thead>
    <tbody id="corps-empl"></tbody></table>`;

  const rendre = () => {
    const fz = valeur('f-zone');
    document.getElementById('corps-empl').innerHTML = emplacements
      .filter(e => !fz || e.zone === fz)
      .map(e => `<tr>
        <td class="mono">${ech(e.code)}</td><td>${ech(e.zone)}</td><td>${ech(e.allee)}</td><td>${ech(e.type)}</td>
        <td class="num">${occupe(e.code)} / ${e.capacite}</td>
        <td>${e.bloque ? badge('BLOQUE') : badge('DISPO')}</td>
        <td><button class="petit ${e.bloque ? 'secondaire' : 'danger'}" data-bloquer="${ech(e.code)}">
          ${e.bloque ? tr('Débloquer') : tr('Bloquer')}</button></td>
      </tr>`).join('') || `<tr><td colspan="7" class="vide">${tr('Aucun emplacement.')}</td></tr>`;

    document.querySelectorAll('[data-bloquer]').forEach(b => b.onclick = () => {
      const e = emplacements.find(x => x.code === b.dataset.bloquer);
      executer(() => api('POST', `/api/emplacements/${e.code}/bloquer`, { bloque: !e.bloque }),
               e.bloque ? tr('Emplacement débloqué') : tr('Emplacement bloqué'));
    });
  };
  rendre();
  document.getElementById('f-zone').oninput = rendre;

  document.getElementById('btn-nouveau').onclick = () => {
    ouvrirModale(`
      <h2>${tr('Nouvel emplacement')}</h2>
      <div class="champs-ligne">
        <div class="champ"><label>${tr('Code (ex: R1-04-1)')}</label><input id="m-code"></div>
        <div class="champ"><label>${tr('Zone')}</label><select id="m-zone">
          <option>RESERVE</option><option>PICKING</option><option>RECEPTION</option><option>EXPEDITION</option></select></div>
      </div>
      <div class="champs-ligne">
        <div class="champ"><label>${tr('Type')}</label><select id="m-type">
          <option>PALETTE</option><option>ETAGERE</option><option>QUAI</option></select></div>
        <div class="champ"><label>${tr('Capacité (unités)')}</label><input type="number" id="m-capacite" min="1" value="100"></div>
      </div>
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        <button id="m-valider">${tr('Créer')}</button></div>`);
    document.getElementById('m-valider').onclick = () => executer(async () => {
      await api('POST', '/api/emplacements', { code: valeur('m-code'), zone: valeur('m-zone'),
        type: valeur('m-type'), capacite: Number(valeur('m-capacite')) });
      fermerModale();
    }, tr('Emplacement créé'));
  };
}

/* ---------- Tiers / transporteurs ---------- */
async function vueTiers() {
  const [tiers, transporteurs] = await Promise.all([GET('/api/tiers'), GET('/api/transporteurs')]);

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Tiers & transporteurs')}</h1>
      <div class="outils">
        <button class="secondaire" id="btn-transporteur">${tr('Nouveau transporteur')}</button>
        <button id="btn-tiers">${tr('Nouveau tiers')}</button>
      </div></div>
    <div class="deux-colonnes">
      <div class="carte"><h2>${tr('Fournisseurs & clients')}</h2>
        <table><thead><tr><th>${tr('Code')}</th><th>${tr('Nom')}</th><th>${tr('Type')}</th><th>${tr('Ville')}</th></tr></thead>
        <tbody>${tiers.map(t => `<tr><td class="mono">${ech(t.code)}</td><td>${ech(t.nom)}</td>
          <td>${badge(t.type === 'CLIENT' ? 'EXPEDIEE' : 'PREVU', tr(t.type))}</td>
          <td>${ech(t.ville)}</td></tr>`).join('') || `<tr><td colspan="4" class="vide">${tr('Aucun tiers.')}</td></tr>`}</tbody></table></div>
      <div class="carte"><h2>${tr('Transporteurs')}</h2>
        <table><thead><tr><th>${tr('Code')}</th><th>${tr('Nom')}</th></tr></thead>
        <tbody>${transporteurs.map(t => `<tr><td class="mono">${ech(t.code)}</td><td>${ech(t.nom)}</td></tr>`).join('')
          || `<tr><td colspan="2" class="vide">${tr('Aucun transporteur.')}</td></tr>`}</tbody></table></div>
    </div>`;

  document.getElementById('btn-tiers').onclick = () => {
    ouvrirModale(`
      <h2>${tr('Nouveau tiers')}</h2>
      <div class="champs-ligne">
        <div class="champ"><label>${tr('Code')}</label><input id="m-code" placeholder="CLI-… / FRN-…"></div>
        <div class="champ"><label>${tr('Type')}</label><select id="m-type">
          <option value="CLIENT">${tr('CLIENT')}</option><option value="FOURNISSEUR">${tr('FOURNISSEUR')}</option></select></div>
      </div>
      <div class="champ"><label>${tr('Nom')}</label><input id="m-nom"></div>
      <div class="champs-ligne">
        <div class="champ"><label>${tr('Adresse')}</label><input id="m-adresse"></div>
        <div class="champ"><label>${tr('Ville')}</label><input id="m-ville"></div>
      </div>
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        <button id="m-valider">${tr('Créer')}</button></div>`);
    document.getElementById('m-valider').onclick = () => executer(async () => {
      await api('POST', '/api/tiers', { code: valeur('m-code'), nom: valeur('m-nom'),
        type: valeur('m-type'), adresse: valeur('m-adresse'), ville: valeur('m-ville') });
      fermerModale();
    }, tr('Tiers créé'));
  };

  document.getElementById('btn-transporteur').onclick = () => {
    ouvrirModale(`
      <h2>${tr('Nouveau transporteur')}</h2>
      <div class="champs-ligne">
        <div class="champ"><label>${tr('Code')}</label><input id="m-code" placeholder="TRP-…"></div>
        <div class="champ"><label>${tr('Nom')}</label><input id="m-nom"></div>
      </div>
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        <button id="m-valider">${tr('Créer')}</button></div>`);
    document.getElementById('m-valider').onclick = () => executer(async () => {
      await api('POST', '/api/transporteurs', { code: valeur('m-code'), nom: valeur('m-nom') });
      fermerModale();
    }, tr('Transporteur créé'));
  };
}

/* ---------- Supports / palettes ---------- */
async function vueSupports() {
  const [supports, stock, emplacements] = await Promise.all(
    [GET('/api/supports'), GET('/api/stock'), GET('/api/emplacements')]);
  const contenuDe = sscc => stock.filter(s => s.support === sscc);

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Supports / palettes (SSCC)')}</h1></div>
    <div class="filtres">
      <input id="f-sscc" placeholder="${tr('Filtrer par SSCC…')}">
      <input id="f-empl" placeholder="${tr('Filtrer par emplacement…')}">
      <select id="f-statut"><option value="">${tr('Tous statuts')}</option>
        <option value="ACTIF">${tr('ACTIF')}</option><option value="VIDE">${tr('VIDE')}</option></select>
    </div>
    <table><thead><tr><th>SSCC</th><th>${tr('Type')}</th><th>${tr('Emplacement')}</th><th>${tr('Contenu')}</th>
      <th class="num">${tr('Unités')}</th><th>${tr('Statut')}</th><th></th></tr></thead>
    <tbody id="corps-supports"></tbody></table>`;

  const rendre = () => {
    const fs2 = valeur('f-sscc'), fe = valeur('f-empl').toUpperCase(), fst = valeur('f-statut');
    const lignes = supports.slice().reverse().filter(s =>
      (!fs2 || s.sscc.includes(fs2)) && (!fe || (s.emplacement || '').includes(fe))
      && (!fst || s.statut === fst));
    document.getElementById('corps-supports').innerHTML = lignes.slice(0, 200).map(s => {
      const lignesStock = contenuDe(s.sscc);
      const resume = lignesStock.map(l => `${l.article}×${l.qte}`).join(', ');
      return `<tr>
        <td class="mono">${ech(s.sscc)}</td><td>${ech(s.type)}</td>
        <td class="mono">${ech(s.emplacement)}</td>
        <td>${ech(resume) || `<span class="vide">${tr('vide')}</span>`}</td>
        <td class="num">${lignesStock.reduce((somme, l) => somme + l.qte, 0) || ''}</td>
        <td>${badge(s.statut === 'ACTIF' ? 'DISPO' : 'BLOQUE', tr(s.statut))}</td>
        <td>${s.statut === 'ACTIF' ? `<button class="petit secondaire" data-deplacer="${ech(s.sscc)}">${tr('Déplacer')}</button>` : ''}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="7" class="vide">${tr('Aucun support.')}</td></tr>`;

    document.querySelectorAll('[data-deplacer]').forEach(b => b.onclick = () => {
      const s = supports.find(x => x.sscc === b.dataset.deplacer);
      ouvrirModale(`
        <h2>${tr('Déplacer le support {sscc}', { sscc: `<span class="mono">${ech(s.sscc)}</span>` })}</h2>
        <p style="font-size:12.5px;color:var(--texte-doux)">${tr('Actuellement sur {emplacement}. Tout le contenu suit le support.',
          { emplacement: ech(s.emplacement) })}</p>
        <div class="champ"><label>${tr('Emplacement destination')}</label>
          <select id="m-dest">${emplacements.filter(e => !e.bloque && e.zone !== 'RECEPTION')
            .map(e => `<option>${ech(e.code)}</option>`).join('')}</select></div>
        <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
          <button id="m-valider">${tr('Déplacer')}</button></div>`);
      document.getElementById('m-valider').onclick = () => executer(async () => {
        await api('POST', `/api/supports/${s.sscc}/deplacer`, { emplacement: valeur('m-dest') });
        fermerModale();
      }, tr('Support déplacé'));
    });
  };
  rendre();
  ['f-sscc', 'f-empl', 'f-statut'].forEach(id => document.getElementById(id).oninput = rendre);
}

/* ---------- Interfaces EDI ---------- */
async function vueEdi() {
  const journal = await GET('/api/edi/journal');
  const estSuperviseur = roleAuMoins('SUPERVISEUR');

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Interfaces EDI')}</h1>
      <div class="outils">
        ${estSuperviseur ? `<button class="secondaire" id="btn-invrpt">${tr('Exporter le stock (INVRPT)')}</button>
        <button id="btn-scanner">${tr('Scanner le répertoire entrant')}</button>` : ''}
      </div></div>
    <div class="carte"><h2>${tr('Fonctionnement')}</h2>
      <p style="font-size:13px;margin:0">
      ${tr('Déposez des fichiers <b>commandes_*.csv</b> ou <b>attendus_*.csv</b> dans <span class="mono">lm-wms/edi/entrant/</span> (modèles dans <span class="mono">edi/exemples/</span>) : ils sont intégrés automatiquement toutes les 5 secondes puis archivés. Les <b>DESADV</b> (avis d\'expédition) et <b>RECADV</b> (confirmations de réception) sont produits dans <span class="mono">edi/sortant/</span>.')}</p></div>
    <table><thead><tr><th>${tr('Date')}</th><th>${tr('Sens')}</th><th>${tr('Type')}</th><th>${tr('Fichier')}</th>
      <th class="num">${tr('Lignes')}</th><th>${tr('Statut')}</th><th>${tr('Message')}</th></tr></thead>
    <tbody>${journal.map(e => `<tr>
      <td>${dateCourte(e.date)}</td>
      <td>${badge(e.sens === 'ENTRANT' ? 'EN_COURS' : 'EXPEDIEE', tr(e.sens))}</td>
      <td><b>${ech(e.type)}</b></td><td class="mono">${ech(e.fichier)}</td>
      <td class="num">${e.nbLignes || ''}</td>
      <td>${badge(e.statut === 'OK' ? 'CLOTURE' : e.statut === 'PARTIEL' ? 'EN_COURS' : 'BLOQUE', tr(e.statut))}</td>
      <td>${ech(e.message)}</td>
    </tr>`).join('') || `<tr><td colspan="7" class="vide">${tr('Aucun échange pour le moment.')}</td></tr>`}</tbody></table>`;

  if (estSuperviseur) {
    document.getElementById('btn-scanner').onclick = () => executer(async () => {
      const resultats = await api('POST', '/api/edi/scanner');
      notifier(resultats.length ? resultats.map(r => `${r.fichier} : ${r.statut}`).join(' · ')
                                : tr('Aucun fichier dans edi/entrant'), 'succes');
    });
    document.getElementById('btn-invrpt').onclick = () => executer(async () => {
      const r = await api('POST', '/api/edi/invrpt');
      notifier(tr('Stock exporté : edi/sortant/{fichier}', { fichier: r.fichier }), 'succes');
    });
  }
}

/* ---------- Utilisateurs (ADMIN) ---------- */
async function vueUtilisateurs() {
  const utilisateurs = await GET('/api/utilisateurs');

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Utilisateurs & rôles')}</h1>
      <div class="outils"><button id="btn-nouveau">${tr('Nouvel utilisateur')}</button></div></div>
    <table><thead><tr><th>${tr('Code')}</th><th>${tr('Nom')}</th><th>${tr('Rôle')}</th><th>${tr('État')}</th><th></th></tr></thead>
    <tbody>${utilisateurs.map(u => `<tr>
      <td class="mono">${ech(u.code)}</td><td>${ech(u.nom)}</td>
      <td>${badge(u.role === 'ADMIN' ? 'BLOQUE' : u.role === 'SUPERVISEUR' ? 'EN_COURS' : 'CLOTURE', tr(u.role))}</td>
      <td>${u.actif ? badge('DISPO') : badge('BLOQUE', tr('INACTIF'))}</td>
      <td><button class="petit secondaire" data-editer="${ech(u.code)}">${tr('Modifier')}</button></td>
    </tr>`).join('')}</tbody></table>`;

  const formulaire = (u = {}) => `
    <div class="champs-ligne">
      <div class="champ"><label>${tr('Code')}</label><input id="m-code" value="${ech(u.code || '')}" ${u.code ? 'disabled' : ''}></div>
      <div class="champ"><label>${tr('Nom')}</label><input id="m-nom" value="${ech(u.nom || '')}"></div>
    </div>
    <div class="champs-ligne">
      <div class="champ"><label>${tr('Rôle')}</label><select id="m-role">
        ${['OPERATEUR', 'SUPERVISEUR', 'ADMIN'].map(r =>
          `<option value="${r}" ${u.role === r ? 'selected' : ''}>${tr(r)}</option>`).join('')}</select></div>
      <div class="champ"><label>${tr('Mot de passe')} ${u.code ? tr('(vide = inchangé)') : ''}</label>
        <input id="m-mdp" type="password"></div>
    </div>
    ${u.code ? `<div class="champ"><label>
      <input type="checkbox" id="m-actif" ${u.actif ? 'checked' : ''} style="width:auto"> ${tr('Compte actif')}</label></div>` : ''}`;

  document.getElementById('btn-nouveau').onclick = () => {
    ouvrirModale(`<h2>${tr('Nouvel utilisateur')}</h2>${formulaire()}
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        <button id="m-valider">${tr('Créer')}</button></div>`);
    document.getElementById('m-valider').onclick = () => executer(async () => {
      await api('POST', '/api/utilisateurs', { code: valeur('m-code'), nom: valeur('m-nom'),
        role: valeur('m-role'), mdp: valeur('m-mdp') });
      fermerModale();
    }, tr('Utilisateur créé'));
  };

  contenu.querySelectorAll('[data-editer]').forEach(b => b.onclick = () => {
    const u = utilisateurs.find(x => x.code === b.dataset.editer);
    ouvrirModale(`<h2>${tr('Modifier {code}', { code: ech(u.code) })}</h2>${formulaire(u)}
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        <button id="m-valider">${tr('Enregistrer')}</button></div>`);
    document.getElementById('m-valider').onclick = () => executer(async () => {
      const donnees = { nom: valeur('m-nom'), role: valeur('m-role'), actif: coche('m-actif') };
      if (valeur('m-mdp')) donnees.mdp = valeur('m-mdp');
      await api('PUT', `/api/utilisateurs/${u.code}`, donnees);
      fermerModale();
    }, tr('Utilisateur modifié'));
  });
}

/* ---------- Connexion opérateur (appairage RF) ---------- */
async function vueConnexionRf() {
  const cible = location.origin + '/rf.html';
  const local = /localhost|127\.0\.0\.1/.test(location.hostname);

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Connexion opérateur — terminal RF')}</h1></div>
    <div class="deux-colonnes">
      <div class="carte" style="text-align:center">
        <h2>${tr('Scannez pour appairer un téléphone')}</h2>
        <div id="zone-qr" style="display:flex;justify-content:center;padding:10px 0;min-height:240px;align-items:center">
          <span class="vide">${tr('Génération du QR…')}</span>
        </div>
        <div class="mono" style="font-size:12px;word-break:break-all;color:var(--accent-fonce)">${ech(cible)}</div>
        <div style="margin-top:12px">
          <a class="bouton" href="${ech(cible)}" target="_blank" rel="noopener">${tr('Ouvrir le terminal RF')}</a>
        </div>
      </div>
      <div class="carte">
        <h2>${tr('Mettre un nouveau terminal en service')}</h2>
        <ol style="padding-left:18px;font-size:14px;line-height:1.7">
          <li>${tr('Sur le téléphone, ouvrez l\'appareil photo et <b>scannez le QR code</b> ci-contre.')}</li>
          <li>${tr('Le terminal RF s\'ouvre dans le navigateur.')}</li>
          <li>${tr('Menu du navigateur → <b>« Ajouter à l\'écran d\'accueil »</b> : une icône « LM-WMS RF » est créée, à taper chaque prise de poste (plus besoin de rescanner).')}</li>
          <li>${tr('L\'opérateur se connecte avec <b>son code</b> puis <b>son PIN</b>.')}</li>
        </ol>
        <div class="alerte-bloc" style="margin-top:8px">
          ${tr('Le QR pointe vers l\'adresse que vous utilisez en ce moment.')}
          ${local
            ? tr('Vous êtes sur une adresse <b>locale</b> (localhost) : un téléphone ne pourra pas l\'ouvrir. Affichez cet écran depuis l\'adresse publique de la suite pour un vrai appairage.')
            : tr('Cette adresse est accessible depuis l\'extérieur : un téléphone la scannera sans problème.')}
        </div>
      </div>
    </div>
    <div class="carte" id="carte-operateurs" style="display:none">
      <h2>${tr('Codes opérateurs actifs')}</h2>
      <div id="liste-operateurs"></div>
    </div>`;

  /* QR généré par le serveur à partir de l'adresse courante */
  try {
    const r = await GET('/api/rf/qr?cible=' + encodeURIComponent(cible));
    const zone = document.getElementById('zone-qr');
    zone.innerHTML = r.svg;
    const svg = zone.querySelector('svg');
    if (svg) { svg.setAttribute('width', '230'); svg.setAttribute('height', '230'); }
  } catch (e) {
    document.getElementById('zone-qr').innerHTML = `<span class="vide">${tr('QR indisponible : {message}', { message: ech(e.message) })}</span>`;
  }

  /* liste des opérateurs (si l'utilisateur est administrateur) */
  if (roleAuMoins('ADMIN')) {
    try {
      const utilisateurs = await GET('/api/utilisateurs');
      const operateurs = utilisateurs.filter(u => u.actif);
      document.getElementById('carte-operateurs').style.display = '';
      document.getElementById('liste-operateurs').innerHTML = `
        <table><thead><tr><th>${tr('Code')}</th><th>${tr('Nom')}</th><th>${tr('Rôle')}</th></tr></thead>
        <tbody>${operateurs.map(u => `<tr><td class="mono">${ech(u.code)}</td>
          <td>${ech(u.nom)}</td><td>${ech(tr(u.role))}</td></tr>`).join('')}</tbody></table>
        <p class="vide" style="padding-top:6px">${tr('Le mot de passe / PIN de chaque opérateur se gère dans l\'écran Utilisateurs.')}</p>`;
    } catch { /* pas admin : section masquée */ }
  }
}

/* ============================================================
 *  Routage
 * ============================================================ */
/* ---------- Copilote superviseur (agent IA, lecture seule) ---------- */
let COPILOTE_HISTO = [];
function copFormater(t) { return ech(t).replace(/\n/g, '<br>'); }

async function vueCopilote() {
  let etat = { actif: true };
  try { etat = await GET('/api/copilote/etat'); } catch { /* état inconnu */ }

  const suggestions = ['Résume-moi la journée', 'Quelles commandes sont en retard et pourquoi ?',
    'Quelles vagues lancer en priorité ?', 'Y a-t-il des ruptures ?'];

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Copilote superviseur')}</h1>
      <div class="outils"><button class="secondaire petit" id="cop-reset">${tr('Nouvelle conversation')}</button></div>
    </div>
    ${etat.actif ? '' : `<div class="alerte-bloc">${tr('Le copilote n\'est pas configuré (clé IA manquante).')}</div>`}
    <div class="carte cop-carte">
      <div id="cop-fil" class="cop-fil"></div>
      <div class="cop-suggestions">
        ${suggestions.map(s => `<button type="button" class="cop-chip">${ech(tr(s))}</button>`).join('')}
      </div>
      <form class="cop-saisie" id="cop-form">
        <input id="cop-input" autocomplete="off" placeholder="${tr('Posez votre question…')}" ${etat.actif ? '' : 'disabled'}>
        <button type="submit" ${etat.actif ? '' : 'disabled'}>${tr('Envoyer')}</button>
      </form>
    </div>`;

  const fil = document.getElementById('cop-fil');
  const rendreFil = () => {
    fil.innerHTML = COPILOTE_HISTO.length
      ? COPILOTE_HISTO.map(m => `<div class="cop-msg ${m.role}"><div class="cop-bulle">${m.role === 'assistant' ? copFormater(m.content) : ech(m.content)}</div></div>`).join('')
      : `<p class="vide">${tr('Posez une question sur votre entrepôt : stock, commandes, retards, vagues, missions…')}</p>`;
    fil.scrollTop = fil.scrollHeight;
  };
  rendreFil();

  let occupe = false;
  const envoyer = async (texte) => {
    texte = (texte || '').trim();
    if (!texte || occupe || !etat.actif) return;
    occupe = true;
    COPILOTE_HISTO.push({ role: 'user', content: texte });
    const histo = COPILOTE_HISTO.slice(0, -1);
    COPILOTE_HISTO.push({ role: 'assistant', content: '…', temp: true });
    rendreFil();
    const champ = document.getElementById('cop-input');
    if (champ) champ.value = '';
    try {
      const r = await api('POST', '/api/copilote', { message: texte, historique: histo });
      COPILOTE_HISTO = COPILOTE_HISTO.filter(m => !m.temp);
      COPILOTE_HISTO.push({ role: 'assistant', content: r.reponse || '(réponse vide)' });
    } catch (e) {
      COPILOTE_HISTO = COPILOTE_HISTO.filter(m => !m.temp);
      COPILOTE_HISTO.push({ role: 'assistant', content: tr('Erreur : {message}', { message: e.message }) });
    }
    occupe = false;
    rendreFil();
  };

  document.getElementById('cop-form').onsubmit = (e) => { e.preventDefault(); envoyer(document.getElementById('cop-input').value); };
  document.querySelectorAll('.cop-chip').forEach(b => b.onclick = () => envoyer(b.textContent));
  document.getElementById('cop-reset').onclick = () => { COPILOTE_HISTO = []; rendreFil(); };
}

const VUES = {
  dashboard: vueDashboard, attendus: vueAttendus, stock: vueStock,
  commandes: vueCommandes, vagues: vueVagues, missions: vueMissions,
  expeditions: vueExpeditions, inventaires: vueInventaires,
  mouvements: vueMouvements, articles: vueArticles,
  emplacements: vueEmplacements, tiers: vueTiers,
  supports: vueSupports, edi: vueEdi, utilisateurs: vueUtilisateurs,
  'connexion-rf': vueConnexionRf, copilote: vueCopilote,
};

async function afficherVue() {
  if (!UTILISATEUR || UTILISATEUR.anonyme) return;
  const nom = (location.hash || '#/dashboard').replace('#/', '') || 'dashboard';
  const vue = VUES[nom] || vueDashboard;
  document.querySelectorAll('nav a[data-vue]').forEach(a =>
    a.classList.toggle('actif', a.dataset.vue === nom));
  try {
    await vue();
  } catch (e) {
    contenu.innerHTML = `<div class="alerte-bloc rouge">${tr('Erreur : {message}', { message: ech(tr(e.message)) })}</div>`;
  }
}

async function demarrer() {
  const moi = await api('GET', '/api/moi');
  if (moi.anonyme) {
    afficherConnexion();
  } else {
    UTILISATEUR = moi;
    appliquerUtilisateur();
    afficherVue();
  }
}

window.addEventListener('hashchange', afficherVue);
window.fermerModale = fermerModale;
demarrer();
