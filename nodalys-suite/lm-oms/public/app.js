'use strict';
/* ============================================================
 *  LM-OMS - IHM tour de contrôle (application autonome).
 *  Connexion déléguée au LM-WMS : mêmes comptes partout.
 *  Textes traduits via tr() (i18n.js, chargé avant ce fichier).
 * ============================================================ */

const contenu = document.getElementById('contenu');

let UTILISATEUR = null;
const NIVEAUX_ROLE = { OPERATEUR: 1, SUPERVISEUR: 2, ADMIN: 3 };
function roleAuMoins(role) {
  return UTILISATEUR && NIVEAUX_ROLE[UTILISATEUR.role] >= NIVEAUX_ROLE[role];
}

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

function ech(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function dateCourte(iso) { return iso ? iso.slice(0, 16).replace('T', ' ') : ''; }

const COULEURS_STATUT = {
  RECUE: 'gris', VALIDEE: 'bleu', EN_RUPTURE: 'rouge', TRANSMISE: 'violet',
  EN_PREPARATION: 'orange', PREPAREE: 'violet', EXPEDIEE: 'bleu',
  LIVREE: 'vert', ANNULEE: 'rouge',
  ENLEVEE: 'bleu', EN_TRANSIT: 'orange', INCIDENT: 'rouge',
  ATTENTE: 'gris', ALLOUEE: 'bleu', EMBALLEE: 'violet',
};
/* Pastille de statut : couleur selon le statut interne, texte traduit
 * (ou remplacé par `texte` si fourni). */
function badge(statut, texte) {
  return `<span class="badge ${COULEURS_STATUT[statut] || 'gris'}">${ech(texte ?? tr(statut))}</span>`;
}

function notifier(message, type = '') {
  const zone = document.getElementById('notifications');
  const n = document.createElement('div');
  n.className = 'notification ' + type;
  n.textContent = message;
  zone.appendChild(n);
  setTimeout(() => n.remove(), 5000);
}

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

/* ---------- Connexion (déléguée au WMS) ---------- */
function afficherConnexion() {
  if (document.getElementById('ecran-connexion')) return;
  const voile = document.createElement('div');
  voile.className = 'voile';
  voile.id = 'ecran-connexion';
  voile.innerHTML = `
    <div class="modale" style="max-width:360px;margin-top:10vh">
      <h2>${tr('Connexion à LM-OMS')}</h2>
      <p style="font-size:12.5px;color:var(--texte-doux)">${tr('Comptes de la suite LM (validés auprès du WMS).')}</p>
      <div class="champ"><label>${tr('Code utilisateur')}</label>
        <input id="cx-code" placeholder="CHEF, ADMIN…" style="width:100%"></div>
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

function appliquerUtilisateur() {
  const pied = document.getElementById('pied-utilisateur');
  if (UTILISATEUR && !UTILISATEUR.anonyme) {
    pied.innerHTML = `<b>${ech(UTILISATEUR.nom)}</b> (${ech(tr(UTILISATEUR.role))})
      — <a class="lien" id="btn-deconnexion" style="color:#dbb8ea">${tr('quitter')}</a><br>`;
    document.getElementById('btn-deconnexion').onclick = async () => {
      await api('POST', '/api/deconnexion');
      location.reload();
    };
  } else {
    pied.innerHTML = '';
  }
}

/* ============================================================
 *  Vues
 * ============================================================ */

/* ---------- Tour de contrôle ---------- */
async function vueTour() {
  const [kpi, commandes] = await Promise.all([GET('/api/kpi'), GET('/api/commandes')]);
  const s = kpi.parStatut;

  const canauxHtml = Object.entries(kpi.parCanal).map(([canal, donnees]) => `
    <div class="jauge">
      <div class="ligne"><span>${ech(canal)}</span>
        <span>${tr('{livrees} livrées / {total}', { livrees: donnees.livrees, total: donnees.total })}</span></div>
      <div class="barre"><div style="width:${donnees.total ? Math.round(100 * donnees.livrees / donnees.total) : 0}%"></div></div>
    </div>`).join('') || `<p class="vide">${tr('Aucune commande.')}</p>`;

  const aTraiter = commandes.filter(c => ['RECUE', 'EN_RUPTURE', 'VALIDEE'].includes(c.statut)).slice(0, 10);

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Tour de contrôle')}</h1>
      <div class="outils">
        <button class="secondaire" id="btn-rafraichir-suivi">${tr('Rafraîchir le suivi WMS/TMS')}</button>
      </div></div>
    <div class="grille-kpi">
      <div class="kpi"><div class="valeur">${kpi.totalCommandes}</div><div class="libelle">${tr('Commandes reçues')}</div></div>
      <div class="kpi ${kpi.aValider ? 'orange' : ''}"><div class="valeur">${kpi.aValider}</div><div class="libelle">${tr('À valider')}</div></div>
      <div class="kpi ${kpi.enRupture ? 'rouge' : ''}"><div class="valeur">${kpi.enRupture}</div><div class="libelle">${tr('En rupture')}</div></div>
      <div class="kpi ${kpi.aTransmettre ? 'orange' : ''}"><div class="valeur">${kpi.aTransmettre}</div><div class="libelle">${tr('À transmettre au WMS')}</div></div>
      <div class="kpi"><div class="valeur">${(s.TRANSMISE || 0) + (s.EN_PREPARATION || 0) + (s.PREPAREE || 0)}</div><div class="libelle">${tr('En traitement entrepôt')}</div></div>
      <div class="kpi"><div class="valeur">${s.EXPEDIEE || 0}</div><div class="libelle">${tr('En livraison')}</div></div>
      <div class="kpi vert"><div class="valeur">${s.LIVREE || 0}</div><div class="libelle">${tr('Livrées')}</div></div>
      <div class="kpi ${kpi.enRetard ? 'rouge' : ''}"><div class="valeur">${kpi.enRetard}</div><div class="libelle">${tr('En retard')}</div></div>
      <div class="kpi"><div class="valeur">${kpi.coutTransportEstime.toLocaleString('fr-FR')} €</div><div class="libelle">${tr('Transport estimé cumulé')}</div></div>
    </div>
    <div class="deux-colonnes">
      <div class="carte"><h2>${tr('Taux de livraison par canal')}</h2>${canauxHtml}</div>
      <div class="carte"><h2>${tr('À traiter en priorité')}</h2>
        ${aTraiter.length === 0 ? `<p class="vide">${tr('Rien en attente : tout est parti.')}</p>` : `
        <table><thead><tr><th>${tr('N°')}</th><th>${tr('Canal')}</th><th>${tr('Client')}</th><th>${tr('Statut')}</th></tr></thead>
        <tbody>${aTraiter.map(c => `<tr>
          <td class="mono"><a class="lien" href="#/commandes">${ech(c.numero)}</a></td>
          <td>${ech(c.canal)}</td><td>${ech(c.client)}</td><td>${badge(c.statut)}</td>
        </tr>`).join('')}</tbody></table>`}
      </div>
    </div>`;

  document.getElementById('btn-rafraichir-suivi').onclick = () => executer(async () => {
    const r = await api('POST', '/api/suivi/rafraichir');
    notifier(r.misesAJour ? tr('{n} commande(s) mise(s) à jour', { n: r.misesAJour }) : tr('Suivi à jour, rien de nouveau'), 'succes');
  });
}

/* ---------- Commandes ---------- */
async function vueCommandes() {
  const [commandes, canaux, clients] = await Promise.all(
    [GET('/api/commandes'), GET('/api/canaux'), GET('/api/clients')]);

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Commandes omnicanales')}</h1>
      <div class="outils"><button id="btn-nouvelle">${tr('Nouvelle commande')}</button></div></div>
    <div class="filtres">
      <select id="f-statut"><option value="">${tr('Tous statuts')}</option>
        ${['RECUE', 'VALIDEE', 'EN_RUPTURE', 'TRANSMISE', 'EN_PREPARATION', 'PREPAREE', 'EXPEDIEE', 'LIVREE', 'ANNULEE']
          .map(x => `<option value="${x}">${tr(x)}</option>`).join('')}</select>
      <select id="f-canal"><option value="">${tr('Tous canaux')}</option>
        ${canaux.map(c => `<option value="${ech(c.code)}">${ech(c.nom)}</option>`).join('')}</select>
    </div>
    <table><thead><tr><th>${tr('N°')}</th><th>${tr('Canal')}</th><th>${tr('Client')}</th><th>${tr('Souhaité le')}</th>
      <th class="num">${tr('Poids')}</th><th>${tr('Transporteur')}</th><th class="num">${tr('Coût')}</th><th>${tr('Statut')}</th><th></th></tr></thead>
    <tbody id="corps-commandes"></tbody></table>`;

  const rendre = () => {
    const fs2 = valeur('f-statut'), fc = valeur('f-canal');
    const lignes = commandes.filter(c => (!fs2 || c.statut === fs2) && (!fc || c.canal === fc));
    document.getElementById('corps-commandes').innerHTML = lignes.slice(0, 150).map(c => `<tr>
      <td class="mono">${ech(c.numero)}</td><td>${ech(c.canal)}</td><td>${ech(c.client)}</td>
      <td>${ech(c.dateLivraisonSouhaitee)}</td>
      <td class="num">${c.poidsEstime ? c.poidsEstime + ' kg' : ''}</td>
      <td>${ech(c.transporteurChoisi)}</td>
      <td class="num">${c.coutTransportEstime ? c.coutTransportEstime.toFixed(2) + ' €' : ''}</td>
      <td>${badge(c.statut)}</td>
      <td>
        ${['RECUE', 'EN_RUPTURE'].includes(c.statut) ? `<button class="petit" data-valider="${c.id}">${tr('Valider')}</button>` : ''}
        ${c.statut === 'VALIDEE' ? `<button class="petit" data-transmettre="${c.id}">${tr('→ WMS')}</button>` : ''}
        <button class="petit secondaire" data-detail="${c.id}">360°</button>
      </td>
    </tr>`).join('') || `<tr><td colspan="9" class="vide">${tr('Aucune commande.')}</td></tr>`;

    document.querySelectorAll('[data-valider]').forEach(b => b.onclick = () =>
      executer(async () => {
        const c = await api('POST', `/api/commandes/${b.dataset.valider}/valider`);
        notifier(c.statut === 'EN_RUPTURE'
          ? tr('{numero} en rupture : {articles}', { numero: c.numero, articles: c.manquants.map(m => m.article).join(', ') })
          : tr('{numero} validée — {transporteur} ({motif})', { numero: c.numero, transporteur: c.transporteurChoisi, motif: c.motifTransporteur }),
          c.statut === 'EN_RUPTURE' ? 'erreur' : 'succes');
      }));
    document.querySelectorAll('[data-transmettre]').forEach(b => b.onclick = () =>
      executer(async () => {
        const c = await api('POST', `/api/commandes/${b.dataset.transmettre}/transmettre`);
        notifier(tr('{numero} transmise au WMS ({wms})', { numero: c.numero, wms: c.wmsNumero }), 'succes');
      }));
    document.querySelectorAll('[data-detail]').forEach(b => b.onclick = () => detail360(Number(b.dataset.detail)));
  };
  rendre();
  ['f-statut', 'f-canal'].forEach(id => document.getElementById(id).oninput = rendre);

  document.getElementById('btn-nouvelle').onclick = () => {
    ouvrirModale(`
      <h2>${tr('Nouvelle commande')}</h2>
      <div id="m-ia" hidden>
        <label>${tr('Coller une commande (email, message…)')}</label>
        <textarea id="m-texte" rows="4" style="width:100%"></textarea>
        <button class="secondaire petit" id="m-analyser">${tr("Pré-remplir avec l'IA")}</button>
        <p class="aide" id="m-ia-info"></p>
      </div>
      <div class="champs-ligne">
        <div class="champ"><label>${tr('Canal')}</label><select id="m-canal">
          ${canaux.filter(c => c.actif).map(c => `<option value="${ech(c.code)}">${ech(c.nom)}</option>`).join('')}</select></div>
        <div class="champ"><label>${tr('Client')}</label><select id="m-client">
          ${clients.map(c => `<option value="${ech(c.code)}">${ech(c.code)} — ${ech(c.nom)}</option>`).join('')}</select></div>
        <div class="champ"><label>${tr('Livraison souhaitée')}</label><input type="date" id="m-date"></div>
      </div>
      <label>${tr('Lignes (code article + quantité)')}</label>
      <div id="m-lignes"></div>
      <button class="secondaire petit" id="m-ajouter">${tr('+ Ajouter une ligne')}</button>
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        <button id="m-valider">${tr('Créer la commande')}</button></div>`);
    const zone = document.getElementById('m-lignes');
    const ajouterLigne = (article = '', qte = 1, aVerifier = false) => {
      const div = document.createElement('div');
      div.className = 'champs-ligne m-ligne';
      div.innerHTML = `<div class="champ"><input class="m-art" placeholder="TEX-001" style="text-transform:uppercase" value="${ech(article)}"></div>
        <div class="champ" style="flex:0 0 110px;min-width:0"><input type="number" class="m-qte" min="1" style="width:100%" value="${Number(qte) || 1}"></div>
        ${aVerifier ? `<span class="badge">${tr('à vérifier')}</span>` : ''}`;
      zone.appendChild(div);
    };
    ajouterLigne();
    document.getElementById('m-ajouter').onclick = () => ajouterLigne();

    /* Pré-remplissage par Jev (TypeSafe) : propose, l'opérateur vérifie puis crée */
    api('GET', '/api/analyse/etat').then(etat => {
      if (etat.disponible) document.getElementById('m-ia').hidden = false;
    }).catch(() => {});
    document.getElementById('m-analyser').onclick = async () => {
      const info = document.getElementById('m-ia-info');
      info.textContent = tr('Analyse en cours…');
      try {
        const p = await api('POST', '/api/commandes/analyser', { texte: valeur('m-texte') });
        if (p.client) document.getElementById('m-client').value = p.client;
        if (p.lignes.length) {
          zone.innerHTML = '';
          p.lignes.forEach(l => ajouterLigne(l.article, l.qte, l.aVerifier));
        }
        info.textContent = `${p.lignes.length} ${tr('ligne(s) proposée(s)')}`
          + (p.clientAVerifier ? ` — ${tr('client à vérifier')}` : '') + ` — ${tr('relisez avant de créer')}`;
      } catch (e) {
        info.textContent = '';
        notifier(tr(e.message), 'erreur');
      }
    };
    document.getElementById('m-valider').onclick = () => executer(async () => {
      const lignes = [...zone.querySelectorAll('.m-ligne')]
        .map(div => ({ article: div.querySelector('.m-art').value.trim(),
                       qte: Number(div.querySelector('.m-qte').value) }))
        .filter(l => l.article);
      await api('POST', '/api/commandes', {
        canal: valeur('m-canal'), client: valeur('m-client'),
        dateLivraisonSouhaitee: valeur('m-date'), lignes,
      });
      fermerModale();
    }, tr('Commande reçue — pensez à la valider'));
  };
}

/* Détail 360° : OMS + WMS + TMS en une vue */
async function detail360(id) {
  let suivi;
  try { suivi = await GET(`/api/commandes/${id}/suivi`); }
  catch (e) { notifier(tr(e.message), 'erreur'); return; }
  const c = suivi.oms;

  const etapes = [
    ['OMS', c.numero, c.statut === 'ANNULEE' ? 'ANNULEE' : 'LIVREE', true],
    ['WMS', suivi.wms ? tr('{numero} — préparation', { numero: suivi.wms.numero }) : tr('(pas encore transmis)'),
      suivi.wms ? suivi.wms.statut : '', !!suivi.wms],
    ['TMS', suivi.tms ? tr('{numero} — livraison', { numero: suivi.tms.numero }) : tr('(pas encore expédié)'),
      suivi.tms ? suivi.tms.statut : '', !!suivi.tms],
  ];

  ouvrirModale(`
    <h2>${tr('{numero} — vue 360°', { numero: ech(c.numero) })} ${badge(c.statut)}</h2>
    <p style="font-size:12.5px;color:var(--texte-doux)">
      ${tr('Canal {canal} · client {client} · reçue le {date}', { canal: ech(c.canal), client: ech(c.client), date: dateCourte(c.dateCreation) })}
      ${c.dateLivraisonSouhaitee ? tr(' · souhaitée le {date}', { date: ech(c.dateLivraisonSouhaitee) }) : ''}</p>

    <table class="sous-table"><thead><tr><th>${tr('Article')}</th><th class="num">${tr('Qté')}</th></tr></thead>
    <tbody>${c.lignes.map(l => `<tr><td>${ech(l.article)}</td><td class="num">${l.qte}</td></tr>`).join('')}</tbody></table>

    ${c.manquants && c.manquants.length ? `<div class="alerte-bloc rouge">${tr('Ruptures :')}
      ${c.manquants.map(m => `${ech(m.article)} (${ech(m.motif)})`).join(' · ')}</div>` : ''}

    ${c.transporteurChoisi || c.motifTransporteur ? `<div class="alerte-bloc">
      <b>${tr('Transporteur :')}</b> ${ech(c.transporteurChoisi || tr('non affecté'))}
      ${c.coutTransportEstime ? `— ${c.coutTransportEstime.toFixed(2)} €` : ''}<br>
      <span style="font-size:12px">${ech(c.motifTransporteur)}</span></div>` : ''}

    <h3 style="font-size:14px;margin:14px 0 8px">${tr('Parcours dans la suite')}</h3>
    <table class="sous-table"><tbody>
      ${etapes.map(([app, libelle, statut, atteint]) => `<tr>
        <td style="width:60px"><b>${app}</b></td>
        <td class="${atteint ? '' : 'vide'}">${ech(libelle)}</td>
        <td>${statut ? badge(statut) : ''}</td></tr>`).join('')}
    </tbody></table>
    ${suivi.tms && suivi.tms.evenements ? `
      <table class="sous-table"><thead><tr><th>${tr('Suivi transporteur')}</th><th>${tr('Statut')}</th><th>${tr('Lieu')}</th></tr></thead>
      <tbody>${suivi.tms.evenements.map(ev => `<tr><td>${dateCourte(ev.date)}</td>
        <td>${badge(ev.statut)}</td><td>${ech(ev.lieu)}</td></tr>`).join('')}</tbody></table>` : ''}
    <div class="actions">
      ${['RECUE', 'VALIDEE', 'EN_RUPTURE'].includes(c.statut) && roleAuMoins('SUPERVISEUR')
        ? `<button class="danger" id="m-annuler">${tr('Annuler la commande')}</button>` : ''}
      <button class="secondaire" onclick="fermerModale()">${tr('Fermer')}</button></div>`);

  const btnAnnuler = document.getElementById('m-annuler');
  if (btnAnnuler) btnAnnuler.onclick = () => executer(async () => {
    await api('POST', `/api/commandes/${c.id}/annuler`);
    fermerModale();
  }, tr('Commande annulée'));
}

/* ---------- Canaux de vente ---------- */
async function vueCanaux() {
  const [canaux, transporteurs] = await Promise.all([
    GET('/api/canaux'),
    GET('/api/etat').then(e => e.tms.joignable
      ? fetch('/api/commandes').then(() => []) : []).catch(() => []),
  ]);
  const estSuperviseur = roleAuMoins('SUPERVISEUR');
  const REGLES = [['MOINS_CHER', tr('Le transporteur le moins cher (simulation TMS)')],
                  ['PLUS_RAPIDE', tr('Le plus rapide (délai le plus court)')]];
  const estRegleStandard = r => ['MOINS_CHER', 'PLUS_RAPIDE'].includes(r);

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Canaux de vente')}</h1>
      <div class="outils">${estSuperviseur ? `<button id="btn-nouveau">${tr('Nouveau canal')}</button>` : ''}</div></div>
    <p class="vide" style="padding:0 0 10px">${tr('La règle du canal décide du transporteur à la validation : moins cher, plus rapide, ou un transporteur imposé (code TRP-…).')}</p>
    <table><thead><tr><th>${tr('Code')}</th><th>${tr('Nom')}</th><th>${tr('Règle transporteur')}</th>
      <th class="num">${tr('Priorité')}</th><th>${tr('État')}</th><th></th></tr></thead>
    <tbody>${canaux.map(c => `<tr>
      <td class="mono">${ech(c.code)}</td><td>${ech(c.nom)}</td>
      <td>${badge(estRegleStandard(c.regleTransporteur) ? 'VALIDEE' : 'TRANSMISE',
            estRegleStandard(c.regleTransporteur) ? tr(c.regleTransporteur) : c.regleTransporteur)}</td>
      <td class="num">${c.prioriteDefaut}</td>
      <td>${c.actif ? badge('LIVREE', tr('ACTIF')) : badge('ANNULEE', tr('INACTIF'))}</td>
      <td>${estSuperviseur ? `<button class="petit secondaire" data-editer="${ech(c.code)}">${tr('Modifier')}</button>` : ''}</td>
    </tr>`).join('') || `<tr><td colspan="6" class="vide">${tr('Aucun canal.')}</td></tr>`}</tbody></table>`;

  const formulaire = (c = {}) => `
    <div class="champs-ligne">
      <div class="champ"><label>${tr('Code')}</label><input id="m-code" value="${ech(c.code || '')}" ${c.code ? 'disabled' : ''} placeholder="SITE-WEB"></div>
      <div class="champ"><label>${tr('Nom')}</label><input id="m-nom" value="${ech(c.nom || '')}"></div>
    </div>
    <div class="champs-ligne">
      <div class="champ"><label>${tr('Règle transporteur')}</label>
        <select id="m-regle">
          ${REGLES.map(([code, libelle]) => `<option value="${code}"
            ${c.regleTransporteur === code ? 'selected' : ''}>${libelle}</option>`).join('')}
          <option value="${!estRegleStandard(c.regleTransporteur) && c.regleTransporteur ? ech(c.regleTransporteur) : 'TRP-'}"
            ${!estRegleStandard(c.regleTransporteur) && c.regleTransporteur ? 'selected' : ''}>
            ${tr('Transporteur imposé (saisir le code ci-dessous)')}</option>
        </select></div>
      <div class="champ"><label>${tr('Code imposé (optionnel)')}</label>
        <input id="m-impose" placeholder="TRP-CHRONO"
          value="${!estRegleStandard(c.regleTransporteur) ? ech(c.regleTransporteur || '') : ''}"></div>
      <div class="champ" style="max-width:100px"><label>${tr('Priorité')}</label>
        <input type="number" id="m-priorite" min="1" max="9" value="${c.prioriteDefaut || 5}"></div>
    </div>
    ${c.code ? `<div class="champ"><label>
      <input type="checkbox" id="m-actif" ${c.actif ? 'checked' : ''} style="width:auto"> ${tr('Canal actif')}</label></div>` : ''}`;

  const lireRegle = () => valeur('m-impose') || valeur('m-regle');

  const btnNouveau = document.getElementById('btn-nouveau');
  if (btnNouveau) btnNouveau.onclick = () => {
    ouvrirModale(`<h2>${tr('Nouveau canal')}</h2>${formulaire()}
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        <button id="m-valider">${tr('Créer')}</button></div>`);
    document.getElementById('m-valider').onclick = () => executer(async () => {
      await api('POST', '/api/canaux', { code: valeur('m-code'), nom: valeur('m-nom'),
        regleTransporteur: lireRegle(), prioriteDefaut: Number(valeur('m-priorite')) });
      fermerModale();
    }, tr('Canal créé'));
  };

  document.querySelectorAll('[data-editer]').forEach(b => b.onclick = () => {
    const c = canaux.find(x => x.code === b.dataset.editer);
    ouvrirModale(`<h2>${tr('Modifier {code}', { code: ech(c.code) })}</h2>${formulaire(c)}
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        <button id="m-valider">${tr('Enregistrer')}</button></div>`);
    document.getElementById('m-valider').onclick = () => executer(async () => {
      await api('PUT', `/api/canaux/${c.code}`, { nom: valeur('m-nom'),
        regleTransporteur: lireRegle(), prioriteDefaut: Number(valeur('m-priorite')),
        actif: document.getElementById('m-actif')?.checked });
      fermerModale();
    }, tr('Canal modifié'));
  });
}

/* ---------- Liaisons WMS / TMS ---------- */
async function vueLiaisons() {
  const etat = await GET('/api/etat');
  const estSuperviseur = roleAuMoins('SUPERVISEUR');

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Liaisons avec la suite')}</h1></div>
    <div class="grille-kpi">
      <div class="kpi ${etat.wms.joignable ? 'vert' : 'rouge'}">
        <div class="valeur">${etat.wms.joignable ? tr('EN LIGNE') : tr('COUPÉE')}</div>
        <div class="libelle">LM-WMS — ${ech(etat.wms.url)}</div></div>
      <div class="kpi ${etat.tms.joignable ? 'vert' : 'rouge'}">
        <div class="valeur">${etat.tms.joignable ? tr('EN LIGNE') : tr('COUPÉE')}</div>
        <div class="libelle">LM-TMS — ${ech(etat.tms.url)}</div></div>
      <div class="kpi"><div class="valeur">${etat.clients}</div><div class="libelle">${tr('Clients synchronisés')}</div></div>
      <div class="kpi"><div class="valeur">${etat.commandes}</div><div class="libelle">${tr('Commandes OMS')}</div></div>
    </div>
    <div class="carte"><h2>${tr('Rôle de l\'OMS dans la suite')}</h2>
      <ul style="font-size:13.5px">
        <li>${tr('<b>Validation :</b> le stock disponible est contrôlé en direct dans le WMS avant d\'accepter la commande — plus de promesses invendables.')}</li>
        <li>${tr('<b>Choix transporteur :</b> à la validation, l\'OMS interroge le simulateur du TMS et applique la règle du canal (moins cher / plus rapide / imposé).')}</li>
        <li>${tr('<b>Transmission :</b> la commande part au WMS avec la référence OMS — la traçabilité est conservée de bout en bout.')}</li>
        <li>${tr('<b>Suivi :</b> toutes les 60 s, l\'OMS projette les statuts WMS (préparation) et TMS (livraison) sur ses commandes, jusqu\'au statut LIVREE.')}</li>
      </ul>
      ${estSuperviseur ? `<div class="champs-ligne" style="margin-top:8px">
        <button class="secondaire" id="btn-sync-clients">${tr('Synchroniser les clients')}</button>
        <button id="btn-rafraichir">${tr('Rafraîchir le suivi maintenant')}</button>
      </div>` : ''}
    </div>`;

  if (estSuperviseur) {
    document.getElementById('btn-sync-clients').onclick = () => executer(async () => {
      const r = await api('POST', '/api/clients/synchroniser');
      notifier(tr('{n} clients WMS synchronisés ({nouveaux} nouveaux)', { n: r.total, nouveaux: r.nouveaux }), 'succes');
    });
    document.getElementById('btn-rafraichir').onclick = () => executer(async () => {
      const r = await api('POST', '/api/suivi/rafraichir');
      notifier(r.misesAJour ? tr('{n} commande(s) mise(s) à jour', { n: r.misesAJour }) : tr('Rien de nouveau'), 'succes');
    });
  }
}

/* ============================================================
 *  Routage
 * ============================================================ */
const VUES = { tour: vueTour, commandes: vueCommandes, canaux: vueCanaux, liaisons: vueLiaisons };

async function afficherVue() {
  if (!UTILISATEUR || UTILISATEUR.anonyme) return;
  const nom = (location.hash || '#/tour').replace('#/', '') || 'tour';
  const vue = VUES[nom] || vueTour;
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
