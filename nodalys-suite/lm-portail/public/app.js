'use strict';
/* ============================================================
 *  LM-SUITE — Portail. Porte d'entrée unique + vitrine.
 *  Connexion déléguée au WMS ; l'accès aux modules suit
 *  strictement l'abonnement payé.
 * ============================================================ */

const contenu = document.getElementById('contenu');
const barreDroite = document.getElementById('barre-droite');
let UTILISATEUR = null;

async function api(methode, chemin, corps) {
  const options = { method: methode, headers: { 'Content-Type': 'application/json' } };
  if (corps !== undefined) options.body = JSON.stringify(corps);
  const reponse = await fetch(chemin, options);
  const donnees = await reponse.json();
  if (reponse.status === 401) { afficherConnexion(); throw new Error(donnees.erreur || 'Connexion requise'); }
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur serveur');
  return donnees;
}

function ech(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function notifier(message, type = '') {
  const zone = document.getElementById('notifications');
  const n = document.createElement('div');
  n.className = 'notification ' + type;
  n.textContent = message;
  zone.appendChild(n);
  setTimeout(() => n.remove(), 4500);
}

/* ---------- Connexion (déléguée au WMS) ---------- */
function afficherConnexion() {
  if (document.getElementById('voile-cx')) return;
  const voile = document.createElement('div');
  voile.className = 'voile'; voile.id = 'voile-cx';
  voile.innerHTML = `
    <div class="modale-cx">
      <div class="marque">LM<span>·</span>SUITE</div>
      <p class="intro">Un seul compte pour toute votre plateforme logistique.</p>
      <div class="champ"><label>Code utilisateur</label>
        <input id="cx-code" placeholder="CHEF, ADMIN…" autocomplete="username"></div>
      <div class="champ"><label>Mot de passe</label>
        <input id="cx-mdp" type="password" autocomplete="current-password"></div>
      <div class="erreur-cx" id="cx-erreur"></div>
      <button class="btn btn-or btn-large" id="cx-valider">Accéder à ma plateforme</button>
      <div class="aide-comptes">Démo : ADMIN / admin123 &nbsp;·&nbsp; CHEF / chef123</div>
    </div>`;
  document.body.appendChild(voile);
  const valider = async () => {
    try {
      UTILISATEUR = await api('POST', '/api/connexion', {
        code: document.getElementById('cx-code').value,
        mdp: document.getElementById('cx-mdp').value,
      });
      voile.remove();
      demarrer();
    } catch (e) { document.getElementById('cx-erreur').textContent = e.message; }
  };
  document.getElementById('cx-valider').onclick = valider;
  voile.addEventListener('keydown', e => { if (e.key === 'Enter') valider(); });
  document.getElementById('cx-code').focus();
}

/* ---------- Rendu du portail ---------- */
function pastilleModule(m) {
  return `<span class="puce-module"><span class="pastille" style="background:${m.couleur}"></span>${ech(m.nom)}</span>`;
}

function tuileModule(m, enLigne) {
  if (m.actif) {
    const service = enLigne
      ? '<span class="statut-service"><span class="point"></span>en service</span>'
      : '<span class="statut-service hors"><span class="point"></span>hors ligne</span>';
    return `
      <div class="tuile active" style="--tuile-couleur:${m.couleur}">
        <div class="haut">
          <div class="emoji">${m.emoji}</div>
          <div><h3>${ech(m.nom)}</h3><div class="sstitre">${ech(m.sousTitre)}</div></div>
          <div style="margin-left:auto" class="ruban-inclus">Inclus</div>
        </div>
        <div class="accroche">${ech(m.accroche)}</div>
        <ul>${m.atouts.map(a => `<li>${ech(a)}</li>`).join('')}</ul>
        <div class="pied">
          <a class="btn btn-ouvrir" href="${m.url}" target="_blank" rel="noopener">Ouvrir ${ech(m.nom)} ↗</a>
          ${service}
        </div>
      </div>`;
  }
  /* module verrouillé : upsell, aucun accès */
  return `
    <div class="tuile verrou" style="--tuile-couleur:${m.couleur}">
      <div class="cadenas">🔒</div>
      <div class="haut">
        <div class="emoji">${m.emoji}</div>
        <div><h3>${ech(m.nom)}</h3><div class="sstitre">${ech(m.sousTitre)}</div></div>
      </div>
      <div class="accroche">${ech(m.accroche)}</div>
      <ul>${m.atouts.map(a => `<li>${ech(a)}</li>`).join('')}</ul>
      <div class="pied">
        <span class="badge-prix"><b>+${m.prix} €</b><span>/mois</span></span>
        <div style="margin-left:auto">
          ${PORTAIL.estAdmin
            ? `<button class="btn btn-or" data-activer="${m.code}">Ajouter à mon abonnement</button>`
            : `<button class="btn btn-secondaire" data-demander="${m.code}">Demander l'activation</button>`}
        </div>
      </div>
    </div>`;
}

function grillePacks() {
  return PORTAIL.packs.map(p => {
    const estActuel = p.code === PORTAIL.plan;
    const classe = 'pack' + (p.populaire ? ' populaire' : '') + (estActuel ? ' actuel' : '');
    const ruban = estActuel
      ? '<div class="ruban gris">Votre formule</div>'
      : (p.populaire ? '<div class="ruban">Le plus choisi</div>' : '');
    const lignes = PORTAIL.modules.map(m => {
      const inclus = p.modules.includes(m.code);
      return `<li class="${inclus ? 'inclus' : 'exclus'}">${ech(m.nom)} — ${ech(m.sousTitre)}</li>`;
    }).join('');
    let bouton;
    if (estActuel) bouton = '<button class="btn btn-secondaire btn-large" disabled>Formule active</button>';
    else if (PORTAIL.estAdmin) bouton = `<button class="btn btn-or btn-large" data-pack="${p.code}">Passer à ${ech(p.nom)}</button>`;
    else bouton = `<button class="btn btn-secondaire btn-large" data-demander-pack="${p.code}">Demander un devis</button>`;
    return `
      <div class="${classe}">
        ${ruban}
        <h3>${ech(p.nom)}</h3>
        <div class="argument">${ech(p.argument)}</div>
        <div class="montant">${p.prix} €<small> HT/mois</small></div>
        <ul class="liste-mod">${lignes}</ul>
        ${bouton}
      </div>`;
  }).join('');
}

let PORTAIL = null;

async function rendre() {
  PORTAIL = await api('GET', '/api/portail');

  /* barre du haut */
  barreDroite.innerHTML = `
    <span class="qui">Connecté : <b>${ech(UTILISATEUR.nom)}</b> (${ech(UTILISATEUR.role)})</span>
    <a class="lien-quitter" id="btn-quitter">Se déconnecter</a>`;
  document.getElementById('btn-quitter').onclick = async () => {
    await api('POST', '/api/deconnexion'); location.reload();
  };

  const modulesActifs = PORTAIL.modules.filter(m => m.actif);
  const modulesVerrou = PORTAIL.modules.filter(m => !m.actif);

  contenu.innerHTML = `
    <div class="hero">
      <div class="centre">
        <h1>Votre <em>Logistics Manager</em>, en un seul écran.</h1>
        <p class="sous">Entrepôt, transport et commandes réunis dans une plateforme modulaire.
          Vous n'activez — et ne payez — que ce dont vous avez besoin.</p>
        <div class="rappel-modules">${PORTAIL.modules.map(pastilleModule).join('')}</div>
      </div>
    </div>

    <div class="centre">
      <div class="abonnement">
        <div class="bloc-plan">
          <div class="etiquette">Votre abonnement</div>
          <div class="nom-plan">${ech(PORTAIL.planNom)}</div>
        </div>
        <div class="sep-vert"></div>
        <div class="bloc-plan">
          <div class="etiquette">Facturation</div>
          <div class="prix-plan"><b>${PORTAIL.prixTotal} €</b> HT / mois</div>
        </div>
        <div class="sep-vert"></div>
        <div class="bloc-plan">
          <div class="etiquette">Modules actifs</div>
          <div class="prix-plan"><b>${modulesActifs.length}</b> / ${PORTAIL.modules.length}</div>
        </div>
        <div class="client">
          <b>${ech(PORTAIL.client)}</b>
          Client depuis le ${ech(PORTAIL.depuis)}
        </div>
      </div>
    </div>

    <section class="centre">
      <div class="titre-section">Accès direct</div>
      <div class="titre-section-2">Mes applications</div>
      ${PORTAIL.estAdmin ? `<div class="bandeau-admin"><span class="cle">🔑</span>
        <div>Vous êtes <b>administrateur du compte</b> : vous pouvez activer ou retirer des modules
        et changer de formule directement depuis cette page.</div></div>` : ''}
      <div class="grille-tuiles">
        ${modulesActifs.map(m => tuileModule(m, PORTAIL.enLigne[m.code])).join('')}
      </div>
    </section>

    ${modulesVerrou.length ? `
    <section class="centre">
      <div class="titre-section">Aller plus loin</div>
      <div class="titre-section-2">Enrichir mon abonnement</div>
      <div class="grille-tuiles">
        ${modulesVerrou.map(m => tuileModule(m, false)).join('')}
      </div>
    </section>` : ''}

    <section class="tarifs">
      <div class="centre">
        <div class="titre-section">Nos formules</div>
        <div class="titre-section-2">Un tarif simple, sans surprise</div>
        <div class="grille-packs">${grillePacks()}</div>
        <div class="admin-note">Tous les prix sont en euros HT par mois, sans engagement.
          Le module WMS est le socle de la suite et reste toujours actif.</div>
      </div>
    </section>`;

  /* actions admin : activer un module / retirer / appliquer un pack */
  contenu.querySelectorAll('[data-activer]').forEach(b => b.onclick = () =>
    changerModule(b.dataset.activer, true));
  contenu.querySelectorAll('[data-pack]').forEach(b => b.onclick = () =>
    appliquerPack(b.dataset.pack));
  contenu.querySelectorAll('[data-demander]').forEach(b => b.onclick = () =>
    notifier('Demande transmise : un administrateur du compte peut activer ce module.', 'succes'));
  contenu.querySelectorAll('[data-demander-pack]').forEach(b => b.onclick = () =>
    notifier('Demande de devis enregistrée. Nous revenons vers vous rapidement.', 'succes'));

  /* bouton "retirer" sur les modules actifs non-socle (admin) */
  if (PORTAIL.estAdmin) {
    modulesActifs.filter(m => m.code !== 'WMS').forEach(m => {
      const tuile = [...contenu.querySelectorAll('.tuile.active')]
        .find(t => t.querySelector('h3').textContent === m.nom);
      if (!tuile) return;
      const lien = document.createElement('a');
      lien.className = 'lien-quitter';
      lien.style.cssText = 'color:var(--texte-doux);font-size:12px;margin-left:auto;cursor:pointer';
      lien.textContent = 'Retirer';
      lien.onclick = () => changerModule(m.code, false);
      tuile.querySelector('.pied').appendChild(lien);
    });
  }
}

async function changerModule(code, actif) {
  try {
    const r = await api('POST', `/api/abonnement/module/${code}`, { actif });
    notifier(actif ? `${code} activé — nouvel abonnement : ${r.prixTotal} €/mois`
                   : `${code} retiré — abonnement : ${r.prixTotal} €/mois`, 'succes');
    await rendre();
  } catch (e) { notifier(e.message, 'erreur'); }
}
async function appliquerPack(code) {
  try {
    const r = await api('POST', `/api/abonnement/pack/${code}`, {});
    notifier(`Formule ${code} appliquée — ${r.prixTotal} €/mois`, 'succes');
    await rendre();
  } catch (e) { notifier(e.message, 'erreur'); }
}

/* ---------- Démarrage ---------- */
async function demarrer() {
  const moi = await api('GET', '/api/moi');
  if (moi.anonyme) { afficherConnexion(); return; }
  UTILISATEUR = moi;
  await rendre();
}

demarrer();
