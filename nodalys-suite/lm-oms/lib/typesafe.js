'use strict';
/* ============================================================
 *  Client minimal de l'API TypeSafe System One (modèle Jev) :
 *  questions typées (choice / noul / score) sur un état donné.
 *  Clé lue dans TYPESAFE_API_KEY ; sans clé, l'analyse IA est
 *  simplement indisponible (le reste de l'OMS fonctionne).
 *  Doc : https://docs.typesafe.ai/api/system-one.md
 * ============================================================ */

const URL_API = 'https://api.typesafe.ai/v1/systemone';
const MODELE = process.env.TYPESAFE_MODEL || 'jev-latest';

function configure() { return Boolean(process.env.TYPESAFE_API_KEY); }

async function systemOne(state, questions) {
  if (!configure()) {
    const e = new Error('Analyse IA non configurée (variable TYPESAFE_API_KEY absente)');
    e.metier = true; throw e;
  }
  const reponse = await fetch(URL_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + process.env.TYPESAFE_API_KEY,
    },
    body: JSON.stringify({ model: MODELE, state, questions }),
    signal: AbortSignal.timeout(20000),
  });
  const donnees = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    const detail = donnees.detail || donnees.error || donnees.message || 'HTTP ' + reponse.status;
    throw new Error('TypeSafe : ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)));
  }
  return donnees.answers;
}

module.exports = { configure, systemOne };
