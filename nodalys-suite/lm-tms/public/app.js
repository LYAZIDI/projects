'use strict';
/* ============================================================
 *  LM-TMS - IHM transport (application autonome de la suite LM).
 *  Connexion déléguée au LM-WMS : mêmes comptes partout.
 *  Textes traduits via tr() (i18n.js, chargé avant ce fichier).
 * ============================================================ */

const contenu = document.getElementById('contenu');

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

/* ---------- Utilitaires ---------- */
function ech(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function dateCourte(iso) { return iso ? iso.slice(0, 16).replace('T', ' ') : ''; }

const COULEURS_STATUT = {
  ENLEVEE: 'bleu', EN_TRANSIT: 'orange', LIVREE: 'vert', INCIDENT: 'rouge',
  A_VALIDER: 'orange', VALIDEE: 'vert', LITIGE: 'rouge',
  ACTIF: 'vert', INACTIF: 'rouge', COLIS: 'bleu', EXPRESS: 'violet', PALETTE: 'orange',
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
  setTimeout(() => n.remove(), 4500);
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
function coche(id) { return !!document.getElementById(id)?.checked; }

/* ---------- Connexion (déléguée au WMS) ---------- */
function afficherConnexion() {
  if (document.getElementById('ecran-connexion')) return;
  const voile = document.createElement('div');
  voile.className = 'voile';
  voile.id = 'ecran-connexion';
  voile.innerHTML = `
    <div class="modale" style="max-width:360px;margin-top:10vh">
      <h2>${tr('Connexion à LM-TMS')}</h2>
      <p style="font-size:12.5px;color:var(--texte-doux)">${tr('Comptes de la suite LM (validés auprès du LM-WMS).')}</p>
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
      — <a class="lien" id="btn-deconnexion" style="color:#9fd8b9">${tr('quitter')}</a><br>`;
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

/* ---------- Expéditions & suivi ---------- */
async function vueExpeditions() {
  const [kpi, expeditions, transporteurs] = await Promise.all(
    [GET('/api/kpi'), GET('/api/expeditions'), GET('/api/transporteurs')]);
  const nomDe = code => (transporteurs.find(t => t.code === code) || { nom: code }).nom;

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Expéditions & suivi')}</h1></div>
    <div class="grille-kpi">
      <div class="kpi"><div class="valeur">${kpi.totalExpeditions}</div><div class="libelle">${tr('Expéditions')}</div></div>
      <div class="kpi orange"><div class="valeur">${kpi.enCours}</div><div class="libelle">${tr('En cours de livraison')}</div></div>
      <div class="kpi ${kpi.incidents ? 'rouge' : ''}"><div class="valeur">${kpi.incidents}</div><div class="libelle">${tr('Incidents ouverts')}</div></div>
      <div class="kpi"><div class="valeur">${kpi.coutTotal.toLocaleString('fr-FR')} €</div><div class="libelle">${tr('Coût transport cumulé')}</div></div>
      <div class="kpi"><div class="valeur">${kpi.coutMoyen} €</div><div class="libelle">${tr('Coût moyen / expédition')}</div></div>
      <div class="kpi ${kpi.tauxPonctualite < 90 ? 'orange' : 'vert'}"><div class="valeur">${kpi.tauxPonctualite}%</div><div class="libelle">${tr('Ponctualité livraisons')}</div></div>
    </div>
    <div class="filtres">
      <select id="f-statut"><option value="">${tr('Tous statuts')}</option>
        <option value="ENLEVEE">${tr('ENLEVEE')}</option>
        <option value="EN_TRANSIT">${tr('EN_TRANSIT')}</option>
        <option value="LIVREE">${tr('LIVREE')}</option>
        <option value="INCIDENT">${tr('INCIDENT')}</option></select>
      <select id="f-transporteur"><option value="">${tr('Tous transporteurs')}</option>
        ${transporteurs.map(t => `<option value="${ech(t.code)}">${ech(t.nom)}</option>`).join('')}</select>
    </div>
    <table><thead><tr><th>${tr('N°')}</th><th>${tr('Chargement WMS')}</th><th>${tr('Transporteur')}</th><th class="num">${tr('Colis')}</th>
      <th class="num">${tr('Poids')}</th><th class="num">${tr('Coût')}</th><th>${tr('Départ')}</th><th>${tr('Prévu le')}</th><th>${tr('Statut')}</th><th></th></tr></thead>
    <tbody id="corps-expeditions"></tbody></table>`;

  const rendre = () => {
    const fs2 = valeur('f-statut'), ft = valeur('f-transporteur');
    const lignes = expeditions.filter(e =>
      (!fs2 || e.statut === fs2) && (!ft || e.transporteur === ft));
    document.getElementById('corps-expeditions').innerHTML = lignes.slice(0, 150).map(e => `<tr>
      <td class="mono">${ech(e.numero)}</td><td class="mono">${ech(e.chargementNumero)}</td>
      <td>${ech(nomDe(e.transporteur))}</td>
      <td class="num">${e.nbColis}</td><td class="num">${e.poids} kg</td>
      <td class="num">${e.coutEstime.toFixed(2)} €</td>
      <td>${dateCourte(e.dateDepart)}</td><td>${ech(e.dateLivraisonPrevue)}</td>
      <td>${badge(e.statut)}</td>
      <td><button class="petit secondaire" data-suivi="${e.id}">${tr('Suivi')}</button></td>
    </tr>`).join('') || `<tr><td colspan="10" class="vide">${tr('Aucune expédition — elles arrivent du WMS (webhook) ou via Liaison WMS &gt; Importer.')}</td></tr>`;

    document.querySelectorAll('[data-suivi]').forEach(b => b.onclick = () => {
      const e = expeditions.find(x => x.id === Number(b.dataset.suivi));
      ouvrirModale(`
        <h2>${ech(e.numero)} — ${ech(nomDe(e.transporteur))} ${badge(e.statut)}</h2>
        <p style="font-size:12.5px;color:var(--texte-doux)">${tr('Chargement WMS {chargement} · commandes {commandes} · {colis} colis · {poids} kg · {cout} € · prévu le {date}', {
          chargement: ech(e.chargementNumero),
          commandes: e.commandes.map(ech).join(', ') || '—',
          colis: e.nbColis, poids: e.poids,
          cout: e.coutEstime.toFixed(2),
          date: ech(e.dateLivraisonPrevue),
        })}</p>
        <table class="sous-table"><thead><tr><th>${tr('Date')}</th><th>${tr('Statut')}</th><th>${tr('Lieu')}</th><th>${tr('Commentaire')}</th></tr></thead>
        <tbody>${e.evenements.map(ev => `<tr><td>${dateCourte(ev.date)}</td><td>${badge(ev.statut)}</td>
          <td>${ech(ev.lieu)}</td><td>${ech(ev.commentaire)}</td></tr>`).join('')}</tbody></table>
        ${e.statut !== 'LIVREE' ? `
        <h3 style="font-size:14px;margin:14px 0 8px">${tr('Nouvel événement')}</h3>
        <div class="champs-ligne">
          <div class="champ"><label>${tr('Statut')}</label><select id="m-statut">
            <option value="EN_TRANSIT">${tr('EN_TRANSIT')}</option>
            <option value="LIVREE">${tr('LIVREE')}</option>
            <option value="INCIDENT">${tr('INCIDENT')}</option></select></div>
          <div class="champ"><label>${tr('Lieu')}</label><input id="m-lieu"></div>
          <div class="champ" style="flex:2"><label>${tr('Commentaire')}</label><input id="m-commentaire"></div>
        </div>` : ''}
        <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Fermer')}</button>
          ${e.statut !== 'LIVREE' ? `<button id="m-valider">${tr('Enregistrer')}</button>` : ''}</div>`);
      const btn = document.getElementById('m-valider');
      if (btn) btn.onclick = () => executer(async () => {
        await api('POST', `/api/expeditions/${e.id}/evenement`, {
          statut: valeur('m-statut'), lieu: valeur('m-lieu'), commentaire: valeur('m-commentaire'),
        });
        fermerModale();
      }, tr('Événement enregistré'));
    });
  };
  rendre();
  ['f-statut', 'f-transporteur'].forEach(id => document.getElementById(id).oninput = rendre);
}

/* ---------- Simulateur ---------- */
async function vueSimulateur() {
  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Simulateur de coût')}</h1></div>
    <div class="carte"><h2>${tr('Comparer les transporteurs pour un envoi')}</h2>
      <div class="champs-ligne" style="max-width:520px">
        <div class="champ"><label>${tr('Poids total (kg)')}</label>
          <input type="number" id="s-poids" min="0.1" step="0.1" value="12"></div>
        <div class="champ"><label>${tr('Service')}</label><select id="s-service">
          <option value="">${tr('Tous services')}</option>
          <option value="COLIS">${tr('COLIS')}</option>
          <option value="EXPRESS">${tr('EXPRESS')}</option>
          <option value="PALETTE">${tr('PALETTE')}</option></select></div>
        <div class="champ" style="display:flex;align-items:flex-end">
          <button id="s-lancer">${tr('Comparer')}</button></div>
      </div>
      <div id="s-resultats"></div>
    </div>`;

  const lancer = async () => {
    let resultats;
    try {
      resultats = await api('POST', '/api/simuler', {
        poids: Number(valeur('s-poids')), service: valeur('s-service') || undefined,
      });
    } catch (e) { notifier(tr(e.message), 'erreur'); return; }
    document.getElementById('s-resultats').innerHTML = resultats.length === 0
      ? `<p class="vide">${tr('Aucune grille tarifaire ne correspond.')}</p>`
      : `<table style="margin-top:8px"><thead><tr><th></th><th>${tr('Transporteur')}</th><th>${tr('Service')}</th>
          <th class="num">${tr('Délai')}</th><th class="num">${tr('Coût estimé')}</th></tr></thead>
        <tbody>${resultats.map((r, i) => `<tr ${i === 0 ? 'class="selectionnee"' : ''}>
          <td>${i === 0 ? badge('LIVREE', tr('MEILLEUR PRIX')) : (i + 1) + 'ᵉ'}</td>
          <td>${ech(r.nom)}</td><td>${badge(r.service)}</td>
          <td class="num">${r.delaiJours} j</td>
          <td class="num"><b>${r.cout.toFixed(2)} €</b></td></tr>`).join('')}</tbody></table>
        <p class="vide" style="padding:8px 2px">${tr('Surcharge carburant incluse.')}</p>`;
  };
  document.getElementById('s-lancer').onclick = lancer;
  document.getElementById('s-poids').addEventListener('keydown', e => { if (e.key === 'Enter') lancer(); });
  lancer();
}

/* ---------- Transporteurs & grilles ---------- */
async function vueTransporteurs() {
  const [transporteurs, grilles] = await Promise.all(
    [GET('/api/transporteurs'), GET('/api/grilles')]);
  const estSuperviseur = roleAuMoins('SUPERVISEUR');

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Transporteurs & grilles tarifaires')}</h1>
      <div class="outils">
        ${estSuperviseur ? `<button class="secondaire" id="btn-sync">${tr('Synchroniser depuis le WMS')}</button>
        <button id="btn-grille">${tr('Nouvelle grille')}</button>` : ''}</div></div>
    <div class="carte"><h2>${tr('Fiches transporteurs (référentiel synchronisé du WMS, enrichi ici)')}</h2>
      <table><thead><tr><th>${tr('Code')}</th><th>${tr('Nom')}</th><th class="num">${tr('Délai')}</th><th>${tr('Contact')}</th>
        <th>${tr('État')}</th><th></th></tr></thead>
      <tbody>${transporteurs.map(t => `<tr>
        <td class="mono">${ech(t.code)}</td><td>${ech(t.nom)}</td>
        <td class="num">${t.delaiJours ? t.delaiJours + ' j' : '—'}</td>
        <td>${ech(t.contact || '')} ${t.telephone ? '· ' + ech(t.telephone) : ''}</td>
        <td>${badge(t.actif === false ? 'INACTIF' : 'ACTIF')}</td>
        <td>${estSuperviseur ? `<button class="petit secondaire" data-fiche="${ech(t.code)}">${tr('Modifier')}</button>` : ''}</td>
      </tr>`).join('') || `<tr><td colspan="6" class="vide">${tr('Aucun transporteur : synchronisez depuis le WMS.')}</td></tr>`}</tbody></table></div>
    <div class="carte"><h2>${tr('Grilles tarifaires ({n})', { n: grilles.length })}</h2>
      <table><thead><tr><th>${tr('Transporteur')}</th><th>${tr('Service')}</th><th>${tr('Tranches (jusqu\'à … kg → €)')}</th>
        <th class="num">${tr('€/kg au-delà')}</th><th class="num">${tr('Carburant')}</th><th></th></tr></thead>
      <tbody>${grilles.map(g => `<tr>
        <td class="mono">${ech(g.transporteur)}</td><td>${badge(g.service)}</td>
        <td class="mono" style="font-size:12px">${g.tranches.map(t => `${t.poidsMax}→${t.prix}€`).join(' · ')}</td>
        <td class="num">${g.prixKgSup} €</td><td class="num">+${g.supplementCarburant} %</td>
        <td>${estSuperviseur ? `<button class="petit secondaire" data-grille="${g.id}">${tr('Modifier')}</button>
              <button class="petit danger" data-supprimer="${g.id}">${tr('Suppr.')}</button>` : ''}</td>
      </tr>`).join('') || `<tr><td colspan="6" class="vide">${tr('Aucune grille : créez-en pour activer le calcul de coût.')}</td></tr>`}</tbody></table></div>`;

  const btnSync = document.getElementById('btn-sync');
  if (btnSync) btnSync.onclick = () => executer(async () => {
    const r = await api('POST', '/api/transporteurs/synchroniser');
    notifier(tr('{total} transporteurs WMS synchronisés ({nouveaux} nouveaux)', { total: r.total, nouveaux: r.nouveaux }), 'succes');
  });

  document.querySelectorAll('[data-fiche]').forEach(b => b.onclick = () => {
    const t = transporteurs.find(x => x.code === b.dataset.fiche);
    ouvrirModale(`
      <h2>${tr('Fiche {nom}', { nom: ech(t.nom) })}</h2>
      <div class="champs-ligne">
        <div class="champ"><label>${tr('Nom')}</label><input id="m-nom" value="${ech(t.nom)}"></div>
        <div class="champ" style="max-width:110px"><label>${tr('Délai (jours)')}</label>
          <input type="number" id="m-delai" min="0" value="${t.delaiJours || 0}"></div>
      </div>
      <div class="champs-ligne">
        <div class="champ"><label>${tr('Contact')}</label><input id="m-contact" value="${ech(t.contact || '')}"></div>
        <div class="champ"><label>${tr('Téléphone')}</label><input id="m-telephone" value="${ech(t.telephone || '')}"></div>
      </div>
      <div class="champs-ligne">
        <div class="champ"><label>${tr('E-mail')}</label><input id="m-email" value="${ech(t.email || '')}"></div>
        <div class="champ"><label><input type="checkbox" id="m-actif" ${t.actif !== false ? 'checked' : ''} style="width:auto"> ${tr('Actif')}</label></div>
      </div>
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        <button id="m-valider">${tr('Enregistrer')}</button></div>`);
    document.getElementById('m-valider').onclick = () => executer(async () => {
      await api('PUT', `/api/transporteurs/${t.code}`, {
        nom: valeur('m-nom'), delaiJours: Number(valeur('m-delai')),
        contact: valeur('m-contact'), telephone: valeur('m-telephone'),
        email: valeur('m-email'), actif: coche('m-actif'),
      });
      fermerModale();
    }, tr('Fiche mise à jour'));
  });

  const modaleGrille = (grille) => {
    const tranches = grille ? grille.tranches : [{ poidsMax: 1, prix: 6 }, { poidsMax: 5, prix: 10 }];
    ouvrirModale(`
      <h2>${grille ? tr('Modifier la grille') : tr('Nouvelle grille tarifaire')}</h2>
      <div class="champs-ligne">
        <div class="champ"><label>${tr('Transporteur')}</label><select id="m-transporteur" ${grille ? 'disabled' : ''}>
          ${transporteurs.map(t => `<option value="${ech(t.code)}"
            ${grille && grille.transporteur === t.code ? 'selected' : ''}>${ech(t.nom)}</option>`).join('')}</select></div>
        <div class="champ"><label>${tr('Service')}</label><select id="m-service" ${grille ? 'disabled' : ''}>
          ${['COLIS', 'EXPRESS', 'PALETTE'].map(s => `<option value="${s}" ${grille && grille.service === s ? 'selected' : ''}>${tr(s)}</option>`).join('')}</select></div>
      </div>
      <label>${tr('Tranches de poids (jusqu\'à X kg → prix €)')}</label>
      <div id="m-tranches">${tranches.map(t => `
        <div class="champs-ligne m-tranche">
          <div class="champ" style="max-width:140px"><input type="number" class="m-poids" step="0.5" min="0.1" value="${t.poidsMax}"></div>
          <div class="champ" style="max-width:140px"><input type="number" class="m-prix" step="0.1" min="0" value="${t.prix}"></div>
        </div>`).join('')}</div>
      <button class="secondaire petit" id="m-ajouter">${tr('+ Ajouter une tranche')}</button>
      <div class="champs-ligne" style="margin-top:12px">
        <div class="champ"><label>${tr('€/kg au-delà')}</label>
          <input type="number" id="m-kgsup" step="0.05" min="0" value="${grille ? grille.prixKgSup : 0.8}"></div>
        <div class="champ"><label>${tr('Surcharge carburant (%)')}</label>
          <input type="number" id="m-carburant" step="0.5" min="0" value="${grille ? grille.supplementCarburant : 6}"></div>
      </div>
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        <button id="m-valider">${grille ? tr('Enregistrer') : tr('Créer la grille')}</button></div>`);
    document.getElementById('m-ajouter').onclick = () => {
      const div = document.createElement('div');
      div.className = 'champs-ligne m-tranche';
      div.innerHTML = `<div class="champ" style="max-width:140px"><input type="number" class="m-poids" step="0.5" min="0.1"></div>
        <div class="champ" style="max-width:140px"><input type="number" class="m-prix" step="0.1" min="0"></div>`;
      document.getElementById('m-tranches').appendChild(div);
    };
    document.getElementById('m-valider').onclick = () => executer(async () => {
      const lignesTranches = [...document.querySelectorAll('.m-tranche')].map(div => ({
        poidsMax: Number(div.querySelector('.m-poids').value),
        prix: Number(div.querySelector('.m-prix').value),
      })).filter(t => t.poidsMax > 0);
      const corps = { tranches: lignesTranches,
        prixKgSup: Number(valeur('m-kgsup')), supplementCarburant: Number(valeur('m-carburant')) };
      if (grille) await api('PUT', `/api/grilles/${grille.id}`, corps);
      else await api('POST', '/api/grilles', { ...corps,
        transporteur: valeur('m-transporteur'), service: valeur('m-service') });
      fermerModale();
    }, grille ? tr('Grille mise à jour') : tr('Grille créée'));
  };

  const btnGrille = document.getElementById('btn-grille');
  if (btnGrille) btnGrille.onclick = () => modaleGrille(null);
  document.querySelectorAll('[data-grille]').forEach(b => b.onclick = () =>
    modaleGrille(grilles.find(g => g.id === Number(b.dataset.grille))));
  document.querySelectorAll('[data-supprimer]').forEach(b => b.onclick = () =>
    executer(() => api('POST', `/api/grilles/${b.dataset.supprimer}/supprimer`), tr('Grille supprimée')));
}

/* ---------- Pré-facturation ---------- */
async function vueFactures() {
  const [factures, expeditions, transporteurs] = await Promise.all(
    [GET('/api/factures'), GET('/api/expeditions'), GET('/api/transporteurs')]);
  const estSuperviseur = roleAuMoins('SUPERVISEUR');
  const dejaFacturees = new Set(factures.flatMap(f => f.lignes.map(l => l.expedition)));

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Pré-facturation transport')}</h1>
      <div class="outils">${estSuperviseur ? `<button id="btn-facture">${tr('Saisir une facture')}</button>` : ''}</div></div>
    <p class="vide" style="padding:0 0 10px">${tr('Chaque ligne est contrôlée contre le coût théorique de la grille : au-delà de ±5 % d\'écart, la facture passe automatiquement en litige.')}</p>
    <table><thead><tr><th>${tr('N° facture')}</th><th>${tr('Transporteur')}</th><th>${tr('Date')}</th>
      <th class="num">${tr('Montant')}</th><th class="num">${tr('Écart vs théorique')}</th><th>${tr('Statut')}</th><th></th></tr></thead>
    <tbody>${factures.map(f => {
      const ecart = f.lignes.reduce((somme, l) => somme + l.ecart, 0);
      return `<tr>
        <td class="mono">${ech(f.numero)}</td><td>${ech(f.transporteur)}</td><td>${ech(f.dateFacture)}</td>
        <td class="num">${f.montant.toFixed(2)} €</td>
        <td class="num" style="color:${Math.abs(ecart) > 0.01 ? 'var(--erreur)' : 'var(--ok)'}">
          ${ecart >= 0 ? '+' : ''}${ecart.toFixed(2)} €</td>
        <td>${badge(f.statut)}</td>
        <td><button class="petit secondaire" data-detail="${f.id}">${tr('Détail')}</button></td>
      </tr>`;
    }).join('') || `<tr><td colspan="7" class="vide">${tr('Aucune facture saisie.')}</td></tr>`}</tbody></table>`;

  document.querySelectorAll('[data-detail]').forEach(b => b.onclick = () => {
    const f = factures.find(x => x.id === Number(b.dataset.detail));
    ouvrirModale(`
      <h2>${tr('Facture {numero} — {transporteur}', { numero: ech(f.numero), transporteur: ech(f.transporteur) })} ${badge(f.statut)}</h2>
      <table class="sous-table"><thead><tr><th>${tr('Expédition')}</th><th class="num">${tr('Théorique')}</th>
        <th class="num">${tr('Facturé')}</th><th class="num">${tr('Écart')}</th></tr></thead>
      <tbody>${f.lignes.map(l => `<tr><td class="mono">${ech(l.expedition)}</td>
        <td class="num">${l.coutEstime.toFixed(2)} €</td><td class="num">${l.montant.toFixed(2)} €</td>
        <td class="num" style="color:${Math.abs(l.ecartPourcent) > 5 ? 'var(--erreur)' : 'var(--ok)'}">
          ${l.ecart >= 0 ? '+' : ''}${l.ecart.toFixed(2)} € (${l.ecartPourcent}%)</td></tr>`).join('')}</tbody></table>
      <div class="actions">
        <button class="secondaire" onclick="fermerModale()">${tr('Fermer')}</button>
        ${estSuperviseur && f.statut !== 'VALIDEE' ? `<button id="m-valider-facture">${tr('Valider malgré tout')}</button>` : ''}
        ${estSuperviseur && f.statut !== 'LITIGE' ? `<button class="danger" id="m-litige">${tr('Passer en litige')}</button>` : ''}
      </div>`);
    const btnV = document.getElementById('m-valider-facture');
    if (btnV) btnV.onclick = () => executer(async () => {
      await api('POST', `/api/factures/${f.id}/statuer`, { statut: 'VALIDEE' }); fermerModale();
    }, tr('Facture validée'));
    const btnL = document.getElementById('m-litige');
    if (btnL) btnL.onclick = () => executer(async () => {
      await api('POST', `/api/factures/${f.id}/statuer`, { statut: 'LITIGE' }); fermerModale();
    }, tr('Facture passée en litige'));
  });

  const btnFacture = document.getElementById('btn-facture');
  if (btnFacture) btnFacture.onclick = () => {
    ouvrirModale(`
      <h2>${tr('Saisir une facture transporteur')}</h2>
      <div class="champs-ligne">
        <div class="champ"><label>${tr('Transporteur')}</label><select id="m-transporteur">
          ${transporteurs.map(t => `<option value="${ech(t.code)}">${ech(t.nom)}</option>`).join('')}</select></div>
        <div class="champ"><label>${tr('N° de facture')}</label><input id="m-numero" placeholder="FAC-2026-…"></div>
        <div class="champ"><label>${tr('Date')}</label><input type="date" id="m-date"
          value="${new Date().toISOString().slice(0, 10)}"></div>
      </div>
      <div id="m-lignes-facture"></div>
      <div class="actions"><button class="secondaire" onclick="fermerModale()">${tr('Annuler')}</button>
        <button id="m-valider">${tr('Contrôler et enregistrer')}</button></div>`);

    const rendreLignes = () => {
      const code = valeur('m-transporteur');
      const disponibles = expeditions.filter(e =>
        e.transporteur === code && !dejaFacturees.has(e.numero));
      document.getElementById('m-lignes-facture').innerHTML = disponibles.length === 0
        ? `<p class="vide">${tr('Aucune expédition non facturée pour ce transporteur.')}</p>`
        : `<table class="sous-table"><thead><tr><th></th><th>${tr('Expédition')}</th>
            <th class="num">${tr('Théorique')}</th><th style="width:130px">${tr('Montant facturé')}</th></tr></thead>
          <tbody>${disponibles.slice(0, 25).map(e => `<tr>
            <td><input type="checkbox" class="mf-coche" data-exp="${e.id}" checked style="width:auto"></td>
            <td class="mono">${ech(e.numero)}</td>
            <td class="num">${e.coutEstime.toFixed(2)} €</td>
            <td><input type="number" step="0.01" class="mf-montant" data-exp="${e.id}"
                 value="${e.coutEstime.toFixed(2)}" style="width:100px"></td></tr>`).join('')}</tbody></table>`;
    };
    document.getElementById('m-transporteur').oninput = rendreLignes;
    rendreLignes();

    document.getElementById('m-valider').onclick = () => executer(async () => {
      const lignes = [...document.querySelectorAll('.mf-coche')]
        .filter(c => c.checked)
        .map(c => ({
          expedition: Number(c.dataset.exp),
          montant: Number(document.querySelector(`.mf-montant[data-exp="${c.dataset.exp}"]`).value),
        }));
      const facture = await api('POST', '/api/factures', {
        transporteur: valeur('m-transporteur'), numero: valeur('m-numero'),
        dateFacture: valeur('m-date'), lignes,
      });
      fermerModale();
      notifier(facture.statut === 'LITIGE'
        ? tr('Facture enregistrée : écart > 5 % détecté, passée en LITIGE')
        : tr('Facture contrôlée : conforme, à valider'), facture.statut === 'LITIGE' ? 'erreur' : 'succes');
    });
  };
}

/* ---------- Liaison WMS ---------- */
async function vueSynchronisation() {
  const etat = await GET('/api/etat');
  const estSuperviseur = roleAuMoins('SUPERVISEUR');

  contenu.innerHTML = `
    <div class="entete-page"><h1>${tr('Liaison avec le LM-WMS')}</h1></div>
    <div class="grille-kpi">
      <div class="kpi ${etat.wms.joignable ? 'vert' : 'rouge'}">
        <div class="valeur">${etat.wms.joignable ? tr('EN LIGNE') : tr('COUPÉE')}</div>
        <div class="libelle">${ech(etat.wms.url)}</div></div>
      <div class="kpi"><div class="valeur">${etat.transporteurs}</div><div class="libelle">${tr('Transporteurs synchronisés')}</div></div>
      <div class="kpi"><div class="valeur">${etat.grilles}</div><div class="libelle">${tr('Grilles tarifaires locales')}</div></div>
      <div class="kpi"><div class="valeur">${etat.expeditions}</div><div class="libelle">${tr('Expéditions enregistrées')}</div></div>
    </div>
    <div class="carte"><h2>${tr('Fonctionnement de l\'intégration')}</h2>
      <ul style="font-size:13.5px">
        <li>${tr('<b>Temps réel :</b> à chaque départ de chargement, le WMS notifie le TMS (webhook signé par la clé d\'intégration) — l\'expédition apparaît ici avec son coût.')}</li>
        <li>${tr('<b>Référentiel :</b> la liste des transporteurs vient du WMS ; le TMS l\'enrichit (délais, contacts, grilles) sans jamais la modifier côté WMS.')}</li>
        <li>${tr('<b>Rattrapage :</b> si le TMS était éteint, l\'import ci-dessous récupère les chargements expédiés manquants via l\'API du WMS.')}</li>
        <li>${tr('<b>Comptes :</b> la connexion est validée auprès du WMS — un seul référentiel d\'utilisateurs pour toute la suite.')}</li>
      </ul>
      ${estSuperviseur ? `<div class="champs-ligne" style="margin-top:8px">
        <button class="secondaire" id="btn-sync">${tr('Synchroniser les transporteurs')}</button>
        <button id="btn-importer">${tr('Importer les chargements manquants')}</button>
      </div>` : ''}
    </div>`;

  if (estSuperviseur) {
    document.getElementById('btn-sync').onclick = () => executer(async () => {
      const r = await api('POST', '/api/transporteurs/synchroniser');
      notifier(tr('{n} transporteurs synchronisés ({nouveaux} nouveaux)', { n: r.total, nouveaux: r.nouveaux }), 'succes');
    });
    document.getElementById('btn-importer').onclick = () => executer(async () => {
      const r = await api('POST', '/api/chargements/importer');
      notifier(r.importees ? tr('{n} expédition(s) importée(s) du WMS', { n: r.importees })
                           : tr('Rien à rattraper : tout est déjà synchronisé'), 'succes');
    });
  }
}

/* ============================================================
 *  Routage
 * ============================================================ */
const VUES = {
  expeditions: vueExpeditions, simulateur: vueSimulateur,
  transporteurs: vueTransporteurs, factures: vueFactures,
  synchronisation: vueSynchronisation,
};

async function afficherVue() {
  if (!UTILISATEUR || UTILISATEUR.anonyme) return;
  const nom = (location.hash || '#/expeditions').replace('#/', '') || 'expeditions';
  const vue = VUES[nom] || vueExpeditions;
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
