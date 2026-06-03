import * as SQLite from 'expo-sqlite'
import type { Depense, Categorie, Budget } from '../types'
import { CATEGORIES_DEFAUT } from '../constants/categories'

// ─── Singleton DB ─────────────────────────────────────────────────────────────

let _db: SQLite.SQLiteDatabase | null = null

export function getDB(): SQLite.SQLiteDatabase {
  if (!_db) throw new Error('Base de données non initialisée. Appelez initDB() d\'abord.')
  return _db
}

// ─── Initialisation & migrations ─────────────────────────────────────────────

export async function initDB(): Promise<void> {
  _db = await SQLite.openDatabaseAsync('masruf.db')

  await _db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      icone TEXT NOT NULL,
      couleur TEXT NOT NULL,
      est_defaut INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS depenses (
      id TEXT PRIMARY KEY,
      montant REAL NOT NULL,
      categorie_id TEXT NOT NULL,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      compte TEXT DEFAULT 'cash',
      cree_le TEXT NOT NULL,
      FOREIGN KEY (categorie_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS budgets (
      mois TEXT PRIMARY KEY,
      montant REAL NOT NULL,
      alerte_pourcent INTEGER DEFAULT 80
    );

    CREATE INDEX IF NOT EXISTS idx_depenses_date ON depenses(date);
    CREATE INDEX IF NOT EXISTS idx_depenses_categorie ON depenses(categorie_id);
  `)

  await _seedCategories()
}

async function _seedCategories(): Promise<void> {
  const db = getDB()
  const count = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories'
  )
  if (count && count.count > 0) return

  // Insérer les catégories par défaut
  for (const cat of CATEGORIES_DEFAUT) {
    await db.runAsync(
      'INSERT OR IGNORE INTO categories (id, nom, icone, couleur, est_defaut) VALUES (?, ?, ?, ?, ?)',
      [cat.id, cat.nom, cat.icone, cat.couleur, cat.est_defaut ? 1 : 0]
    )
  }
}

// ─── Opérations Dépenses ──────────────────────────────────────────────────────

export const depenseDB = {
  async getAll(): Promise<Depense[]> {
    const rows = await getDB().getAllAsync<Depense>(
      'SELECT * FROM depenses ORDER BY date DESC, cree_le DESC'
    )
    return rows
  },

  async getByMois(mois: string): Promise<Depense[]> {
    // mois au format YYYY-MM
    const rows = await getDB().getAllAsync<Depense>(
      "SELECT * FROM depenses WHERE strftime('%Y-%m', date) = ? ORDER BY date DESC",
      [mois]
    )
    return rows
  },

  async getRecentes(limit = 10): Promise<Depense[]> {
    return getDB().getAllAsync<Depense>(
      'SELECT * FROM depenses ORDER BY date DESC, cree_le DESC LIMIT ?',
      [limit]
    )
  },

  async insert(d: Omit<Depense, 'id' | 'cree_le'>): Promise<Depense> {
    const id = `dep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const cree_le = new Date().toISOString()
    await getDB().runAsync(
      'INSERT INTO depenses (id, montant, categorie_id, date, note, compte, cree_le) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, d.montant, d.categorie_id, d.date, d.note, d.compte, cree_le]
    )
    return { ...d, id, cree_le }
  },

  async update(d: Depense): Promise<void> {
    await getDB().runAsync(
      'UPDATE depenses SET montant=?, categorie_id=?, date=?, note=?, compte=? WHERE id=?',
      [d.montant, d.categorie_id, d.date, d.note, d.compte, d.id]
    )
  },

  async delete(id: string): Promise<void> {
    await getDB().runAsync('DELETE FROM depenses WHERE id=?', [id])
  },

  async getTotalMois(mois: string): Promise<number> {
    const row = await getDB().getFirstAsync<{ total: number }>(
      "SELECT COALESCE(SUM(montant), 0) as total FROM depenses WHERE strftime('%Y-%m', date) = ?",
      [mois]
    )
    return row?.total ?? 0
  },

  async getStatsByCategorie(mois: string): Promise<Array<{ categorie_id: string; total: number; nombre: number }>> {
    return getDB().getAllAsync(
      `SELECT categorie_id, SUM(montant) as total, COUNT(*) as nombre
       FROM depenses
       WHERE strftime('%Y-%m', date) = ?
       GROUP BY categorie_id
       ORDER BY total DESC`,
      [mois]
    )
  },

  async getTotauxDerniersMois(n = 6): Promise<Array<{ mois: string; total: number }>> {
    return getDB().getAllAsync(
      `SELECT strftime('%Y-%m', date) as mois, SUM(montant) as total
       FROM depenses
       GROUP BY mois
       ORDER BY mois DESC
       LIMIT ?`,
      [n]
    )
  },
}

// ─── Opérations Budgets ───────────────────────────────────────────────────────

export const budgetDB = {
  async get(mois: string): Promise<Budget | null> {
    return getDB().getFirstAsync<Budget>(
      'SELECT * FROM budgets WHERE mois=?',
      [mois]
    )
  },

  async upsert(b: Budget): Promise<void> {
    await getDB().runAsync(
      'INSERT OR REPLACE INTO budgets (mois, montant, alerte_pourcent) VALUES (?, ?, ?)',
      [b.mois, b.montant, b.alerte_pourcent]
    )
  },

  async delete(mois: string): Promise<void> {
    await getDB().runAsync('DELETE FROM budgets WHERE mois=?', [mois])
  },
}

// ─── Opérations Catégories ────────────────────────────────────────────────────

export const categorieDB = {
  async getAll(): Promise<Categorie[]> {
    const rows = await getDB().getAllAsync<{
      id: string; nom: string; icone: string; couleur: string; est_defaut: number
    }>('SELECT * FROM categories ORDER BY nom ASC')
    return rows.map(r => ({ ...r, est_defaut: r.est_defaut === 1 }))
  },

  async insert(c: Omit<Categorie, 'id' | 'est_defaut'>): Promise<Categorie> {
    const id = `cat_${Date.now()}`
    await getDB().runAsync(
      'INSERT INTO categories (id, nom, icone, couleur, est_defaut) VALUES (?, ?, ?, ?, 0)',
      [id, c.nom, c.icone, c.couleur]
    )
    return { ...c, id, est_defaut: false }
  },

  async delete(id: string): Promise<void> {
    await getDB().runAsync('DELETE FROM categories WHERE id=? AND est_defaut=0', [id])
  },
}

// ─── Export complet (backup) ──────────────────────────────────────────────────

export async function exporterDonnees() {
  const [depenses, budgets, categories] = await Promise.all([
    depenseDB.getAll(),
    getDB().getAllAsync<Budget>('SELECT * FROM budgets'),
    categorieDB.getAll(),
  ])
  return { depenses, budgets, categories, exporte_le: new Date().toISOString() }
}

export async function importerDonnees(data: ReturnType<typeof exporterDonnees> extends Promise<infer T> ? T : never) {
  const db = getDB()
  await db.withTransactionAsync(async () => {
    for (const d of data.depenses) {
      await db.runAsync(
        'INSERT OR REPLACE INTO depenses (id, montant, categorie_id, date, note, compte, cree_le) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [d.id, d.montant, d.categorie_id, d.date, d.note, d.compte, d.cree_le]
      )
    }
    for (const b of data.budgets) {
      await db.runAsync(
        'INSERT OR REPLACE INTO budgets (mois, montant, alerte_pourcent) VALUES (?, ?, ?)',
        [b.mois, b.montant, b.alerte_pourcent]
      )
    }
  })
}
