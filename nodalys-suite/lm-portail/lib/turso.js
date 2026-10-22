'use strict';
/* ============================================================
 *  Client Turso / libSQL minimal sur l'API HTTP « pipeline »
 *  (POST /v2/pipeline). Aucune dépendance npm : uniquement fetch.
 *
 *  Variables attendues :
 *    TURSO_DATABASE_URL  libsql://<base>.turso.io (ou https://…)
 *    TURSO_AUTH_TOKEN    jeton d'accès de la base
 *  Absentes = pas de client (le store reste en mode fichier local).
 * ============================================================ */

function encoder(v) {
  if (v === null || v === undefined) return { type: 'null' };
  if (typeof v === 'boolean') return { type: 'integer', value: v ? '1' : '0' };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { type: 'integer', value: String(v) } : { type: 'float', value: v };
  }
  return { type: 'text', value: String(v) };
}

function decoder(v) {
  switch (v.type) {
    case 'null': return null;
    case 'integer': return Number(v.value);
    case 'float': return v.value;
    case 'text': return v.value;
    case 'blob': return Buffer.from(v.base64, 'base64');
    default: return null;
  }
}

function enLignes(resultat) {
  const noms = resultat.cols.map(c => c.name);
  return resultat.rows.map(ligne => {
    const objet = {};
    noms.forEach((nom, i) => { objet[nom] = decoder(ligne[i]); });
    return objet;
  });
}

const instruction = (sql, args = []) => ({ sql, args: args.map(encoder) });

class Turso {
  constructor(url, jeton) {
    this.url = url.replace(/^libsql:/, 'https:').replace(/\/+$/, '');
    this.jeton = jeton;
  }

  async pipeline(requetes) {
    const reponse = await fetch(`${this.url}/v2/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.jeton}`, 'content-type': 'application/json' },
      body: JSON.stringify({ requests: [...requetes, { type: 'close' }] }),
    });
    if (!reponse.ok) throw new Error(`Base de données indisponible (Turso ${reponse.status})`);
    return reponse.json();
  }

  /* Requêtes indépendantes en un seul aller-retour ; renvoie les lignes de chacune. */
  async executer(requetes) {
    const donnees = await this.pipeline(requetes.map(([sql, args]) =>
      ({ type: 'execute', stmt: instruction(sql, args) })));
    return donnees.results.filter(r => r.type !== 'ok' || r.response.type === 'execute').map(r => {
      if (r.type === 'error') throw new Error(`Erreur SQL : ${r.error.message}`);
      return enLignes(r.response.result);
    });
  }

  /* Transaction tout-ou-rien : chaque étape ne s'exécute que si la
   * précédente a réussi, un échec déclenche un ROLLBACK (une suite
   * BEGIN … COMMIT simple validerait les instructions déjà passées).
   * Renvoie les lignes de chaque requête, ou lève une erreur portant
   * `etape` (index de la requête en échec). */
  async transaction(requetes) {
    const etapes = [{ stmt: { sql: 'BEGIN' } }];
    requetes.forEach(([sql, args], i) => {
      etapes.push({ condition: { type: 'ok', step: i }, stmt: instruction(sql, args) });
    });
    const commit = etapes.length;
    etapes.push({ condition: { type: 'ok', step: commit - 1 }, stmt: { sql: 'COMMIT' } });
    etapes.push({ condition: { type: 'not', cond: { type: 'ok', step: commit } }, stmt: { sql: 'ROLLBACK' } });

    const donnees = await this.pipeline([{ type: 'batch', batch: { steps: etapes } }]);
    const [r] = donnees.results;
    if (r.type === 'error') throw new Error(`Erreur SQL : ${r.error.message}`);
    const { step_results: resultats, step_errors: erreurs } = r.response.result;
    const indexEchec = erreurs.slice(0, commit + 1).findIndex(e => e !== null);
    if (indexEchec >= 0) {
      const e = new Error(`Erreur SQL : ${erreurs[indexEchec].message} (transaction annulée)`);
      e.etape = indexEchec - 1;
      throw e;
    }
    return resultats.slice(1, commit).map(res => (res ? enLignes(res) : []));
  }
}

function depuisEnv() {
  const url = process.env.TURSO_DATABASE_URL;
  const jeton = process.env.TURSO_AUTH_TOKEN;
  return url && jeton ? new Turso(url, jeton) : null;
}

module.exports = { Turso, depuisEnv };
