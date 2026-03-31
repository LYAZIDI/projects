/**
 * FileDB — persistance JSON sans dépendance native.
 * Chaque collection est un fichier JSON dans /data.
 */
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

function filePath(collection: string) {
  return path.join(DATA_DIR, `${collection}.json`)
}

function read<T>(collection: string): T[] {
  const fp = filePath(collection)
  if (!fs.existsSync(fp)) return []
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')) } catch { return [] }
}

function write<T>(collection: string, data: T[]): void {
  fs.writeFileSync(filePath(collection), JSON.stringify(data, null, 2), 'utf-8')
}

// ─── Generic CRUD ─────────────────────────────────────────────────────────────

export function dbGetAll<T extends { id: string }>(col: string): T[] {
  return read<T>(col)
}

export function dbGetById<T extends { id: string }>(col: string, id: string): T | null {
  return read<T>(col).find(r => r.id === id) ?? null
}

export function dbInsert<T extends { id: string }>(col: string, item: T): T {
  const items = read<T>(col)
  const existing = items.findIndex(r => r.id === item.id)
  if (existing !== -1) {
    items[existing] = item  // upsert
  } else {
    items.push(item)
  }
  write(col, items)
  return item
}

export function dbInsertMany<T extends { id: string }>(col: string, newItems: T[]): number {
  const items = read<T>(col)
  const existingIds = new Set(items.map(r => r.id))
  let added = 0
  for (const item of newItems) {
    if (!existingIds.has(item.id)) {
      items.push(item)
      existingIds.add(item.id)
      added++
    }
  }
  write(col, items)
  return added
}

export function dbUpdate<T extends { id: string }>(col: string, id: string, patch: Partial<T>): boolean {
  const items = read<T>(col)
  const idx = items.findIndex(r => r.id === id)
  if (idx === -1) return false
  items[idx] = { ...items[idx], ...patch }
  write(col, items)
  return true
}

export function dbDelete(col: string, id: string): boolean {
  const items = read<{ id: string }>(col)
  const next = items.filter(r => r.id !== id)
  if (next.length === items.length) return false
  write(col, next)
  return true
}

export function dbCount(col: string): number {
  return read(col).length
}
