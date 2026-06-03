import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import type { Depense, Categorie, Budget } from '../types'
import { formatMAD, formatDateAffichage, formatMoisAnnee } from './formatters'

// ─── Génération PDF des dépenses ──────────────────────────────────────────────

interface ParamsPDF {
  depenses: Depense[]
  categories: Categorie[]
  budget: Budget | null
  mois: string
  total: number
}

function getCatNom(categories: Categorie[], id: string): string {
  return categories.find(c => c.id === id)?.nom ?? id
}

export async function genererPDFDepenses(params: ParamsPDF): Promise<void> {
  const { depenses, categories, budget, mois, total } = params

  // Regrouper par date
  const parDate = new Map<string, Depense[]>()
  for (const d of depenses) {
    const group = parDate.get(d.date) ?? []
    group.push(d)
    parDate.set(d.date, group)
  }

  const lignesHTML = Array.from(parDate.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, deps]) => {
      const sousTotal = deps.reduce((s, d) => s + d.montant, 0)
      const lignes = deps.map(d => `
        <tr>
          <td></td>
          <td>${getCatNom(categories, d.categorie_id)}</td>
          <td style="color:#6C63FF">${d.note || '—'}</td>
          <td style="text-align:right;font-weight:600">${formatMAD(d.montant)}</td>
        </tr>
      `).join('')
      return `
        <tr class="date-row">
          <td colspan="3">${formatDateAffichage(date)}</td>
          <td style="text-align:right;color:#9090C0">${formatMAD(sousTotal)}</td>
        </tr>
        ${lignes}
      `
    }).join('')

  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: -apple-system, Helvetica, Arial, sans-serif; color:#1a1a2e; background:#fff; padding:32px; font-size:13px; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; border-bottom:2px solid #6C63FF; padding-bottom:16px; }
        .app-name { font-size:28px; font-weight:800; color:#6C63FF; }
        .mois { font-size:16px; color:#555; margin-top:4px; }
        .resume { display:flex; gap:20px; margin-bottom:28px; }
        .resume-card { flex:1; background:#f8f8ff; border-radius:10px; padding:16px; border-left:4px solid #6C63FF; }
        .resume-label { font-size:11px; color:#888; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px; }
        .resume-valeur { font-size:20px; font-weight:700; color:#1a1a2e; }
        .resume-valeur.depassement { color:#FF4D6A; }
        table { width:100%; border-collapse:collapse; }
        th { background:#6C63FF; color:white; padding:10px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; }
        th:last-child { text-align:right; }
        td { padding:8px 12px; border-bottom:1px solid #f0f0f8; vertical-align:top; }
        .date-row td { background:#f8f8ff; font-weight:600; color:#333; font-size:12px; padding:10px 12px; }
        tr:hover td { background:#fafafa; }
        .footer { margin-top:28px; text-align:center; color:#aaa; font-size:11px; border-top:1px solid #eee; padding-top:16px; }
        .badge { display:inline-block; background:#6C63FF; color:white; border-radius:4px; padding:2px 8px; font-size:10px; font-weight:600; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="app-name">💰 Masruf</div>
          <div class="mois">Rapport des dépenses — ${formatMoisAnnee(mois)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:#888">Généré le</div>
          <div style="font-weight:600">${formatDateAffichage(new Date().toISOString().slice(0, 10))}</div>
        </div>
      </div>

      <div class="resume">
        <div class="resume-card">
          <div class="resume-label">Total dépenses</div>
          <div class="resume-valeur">${formatMAD(total)}</div>
        </div>
        <div class="resume-card">
          <div class="resume-label">Budget mensuel</div>
          <div class="resume-valeur">${budget ? formatMAD(budget.montant) : 'Non défini'}</div>
        </div>
        ${budget ? `
        <div class="resume-card">
          <div class="resume-label">Restant</div>
          <div class="resume-valeur ${budget.montant - total < 0 ? 'depassement' : ''}">${formatMAD(Math.abs(budget.montant - total))} ${budget.montant - total < 0 ? '⚠️' : ''}</div>
        </div>` : ''}
        <div class="resume-card">
          <div class="resume-label">Nombre d'opérations</div>
          <div class="resume-valeur">${depenses.length}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Catégorie</th>
            <th>Note</th>
            <th style="text-align:right">Montant</th>
          </tr>
        </thead>
        <tbody>
          ${lignesHTML || '<tr><td colspan="4" style="text-align:center;padding:24px;color:#888">Aucune dépense ce mois-ci</td></tr>'}
        </tbody>
      </table>

      <div class="footer">
        <span class="badge">Masruf</span> — Application de gestion des dépenses personnelles · ${new Date().getFullYear()}
      </div>
    </body>
    </html>
  `

  const { uri } = await Print.printToFileAsync({ html, base64: false })

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Dépenses ${formatMoisAnnee(mois)}`,
      UTI: 'com.adobe.pdf',
    })
  }
}
