import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { exporterDonnees, importerDonnees } from '../db/client'

const BACKUP_DIR = FileSystem.documentDirectory + 'masruf_backups/'
const BACKUP_FILENAME = `masruf_backup_${new Date().toISOString().slice(0, 10)}.json`

// ─── Créer et partager un backup ─────────────────────────────────────────────

export async function creerBackup(): Promise<string> {
  // S'assurer que le dossier existe
  const dirInfo = await FileSystem.getInfoAsync(BACKUP_DIR)
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true })
  }

  const donnees = await exporterDonnees()
  const json = JSON.stringify(donnees, null, 2)

  const chemin = BACKUP_DIR + BACKUP_FILENAME
  await FileSystem.writeAsStringAsync(chemin, json, {
    encoding: FileSystem.EncodingType.UTF8,
  })

  return chemin
}

export async function partagerBackup(): Promise<void> {
  const chemin = await creerBackup()

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(chemin, {
      mimeType: 'application/json',
      dialogTitle: 'Sauvegarder les données Masruf',
    })
  }
}

// ─── Restaurer depuis un fichier JSON ────────────────────────────────────────

export async function restaurerBackup(uri: string): Promise<{ succes: boolean; message: string }> {
  try {
    const json = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    })
    const donnees = JSON.parse(json)

    // Validation basique
    if (!donnees.depenses || !Array.isArray(donnees.depenses)) {
      return { succes: false, message: 'Fichier de backup invalide.' }
    }

    await importerDonnees(donnees)
    return {
      succes: true,
      message: `${donnees.depenses.length} dépenses restaurées avec succès.`,
    }
  } catch (e) {
    return { succes: false, message: `Erreur: ${String(e)}` }
  }
}

// ─── Lister les backups disponibles ──────────────────────────────────────────

export async function listerBackups(): Promise<Array<{ nom: string; uri: string; taille: string }>> {
  const dirInfo = await FileSystem.getInfoAsync(BACKUP_DIR)
  if (!dirInfo.exists) return []

  const fichiers = await FileSystem.readDirectoryAsync(BACKUP_DIR)
  const backups = []

  for (const nom of fichiers.filter(f => f.endsWith('.json'))) {
    const uri = BACKUP_DIR + nom
    const info = await FileSystem.getInfoAsync(uri)
    const taille = info.exists && 'size' in info
      ? `${Math.round((info.size ?? 0) / 1024)} Ko`
      : '—'
    backups.push({ nom, uri, taille })
  }

  return backups.sort((a, b) => b.nom.localeCompare(a.nom))
}

// ─── Supprimer un backup ─────────────────────────────────────────────────────

export async function supprimerBackup(uri: string): Promise<void> {
  await FileSystem.deleteAsync(uri, { idempotent: true })
}
