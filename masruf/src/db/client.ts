// Stub web/Node.js — le vrai client est dans client.native.ts
// Metro utilise automatiquement client.native.ts sur iOS/Android

export async function initDB(): Promise<void> {}
export function getDB(): never { throw new Error('SQLite non disponible sur cette plateforme') }

export const depenseDB = {
  async getAll() { return [] },
  async getByMois(_mois: string) { return [] },
  async getRecentes(_limit?: number) { return [] },
  async insert(_d: any): Promise<any> { return null },
  async update(_d: any): Promise<void> {},
  async delete(_id: string): Promise<void> {},
  async getTotalMois(_mois: string) { return 0 },
  async getStatsByCategorie(_mois: string) { return [] },
  async getTotauxDerniersMois(_n?: number) { return [] },
}

export const budgetDB = {
  async get(_mois: string) { return null },
  async upsert(_b: any): Promise<void> {},
  async delete(_mois: string): Promise<void> {},
}

export const categorieDB = {
  async getAll() { return [] },
  async insert(_c: any): Promise<any> { return null },
  async delete(_id: string): Promise<void> {},
}

export async function exporterDonnees() {
  return { depenses: [], budgets: [], categories: [], exporte_le: '' }
}

export async function importerDonnees(_data: any): Promise<void> {}
