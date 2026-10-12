import { NextResponse } from 'next/server';
import { bvcHtml } from '@/lib/bvc-client';
import pool from '@/lib/db';

// Parse a French-formatted number string: "1 200,00" → 1200, "+3,90%" → 3.90, "-" → null
function parseFr(s: string): number | null {
  const t = s.replace(/\s/g, '').replace(',', '.');
  const m = t.match(/[+-]?\d+\.?\d*/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return isNaN(n) ? null : n;
}

type TickerItem = { symbol?: unknown; label?: { fr?: unknown } };

interface BvcRow {
  name:      string;
  ticker:    string;
  prix:      number | null;
  veille:    number | null;
  variation: number | null;
  capitaux:  number | null; // VOLUME column on BVC = MAD value
  volume:    number | null; // QUANTITÉ ÉCHANGÉE = nb shares
}

/**
 * Fetches the BVC HTML page and parses the full comp-tbl:
 *  - Columns: Instrument | Cours MAD | Cours Veille | Variation | Volume | Qté échangée
 *  - Maps display names → tickers via the Drupal JSON ticker tape in the same page.
 */
async function fetchBvcRows(code: string): Promise<BvcRow[] | null> {
  try {
    const html = await bvcHtml(`/live-market/indices/cours?symbol=${code}`);

    // --- Build label → ticker from Drupal JSON ticker tape ---
    const labelToTicker: Record<string, string> = {};
    const dsIdx = html.indexOf('drupal-settings-json');
    if (dsIdx !== -1) {
      const jsonStart = html.indexOf('{', dsIdx);
      const jsonEnd   = html.indexOf('</script>', jsonStart);
      try {
        const drupal = JSON.parse(html.slice(jsonStart, jsonEnd)) as Record<string, unknown>;
        const items  = ((drupal.live_market as Record<string, unknown>)?.ticker as Record<string, unknown>)?.items as TickerItem[] ?? [];
        for (const item of items) {
          const sym   = String(item.symbol ?? '').trim();
          const label = String((item.label as { fr?: unknown })?.fr ?? '').trim().toUpperCase();
          if (sym && label) labelToTicker[label] = sym;
        }
      } catch { /* ignore */ }
    }

    // --- Parse comp-tbl rows ---
    const tableMatch = html.match(/<table class="comp-tbl"[\s\S]*?<\/table>/);
    if (!tableMatch) return null;

    const rows: BvcRow[] = [];
    const trMatches = [...tableMatch[0].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].slice(1); // skip header

    for (const tr of trMatches) {
      const cells = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
        .map(c => c[1].replace(/<[^>]+>/g, '').trim());

      if (cells.length < 4) continue;

      const name = cells[0];
      const upper = name.toUpperCase();

      // Resolve ticker: exact match first, then partial
      let ticker = labelToTicker[upper] ?? '';
      if (!ticker) {
        const found = Object.entries(labelToTicker).find(
          ([lbl]) => lbl.includes(upper) || upper.includes(lbl)
        );
        ticker = found?.[1] ?? '';
      }
      if (!ticker) {
        console.warn(`[BVC indice ${code}] no ticker for: "${name}"`);
        continue;
      }

      rows.push({
        name,
        ticker,
        prix:      parseFr(cells[1] ?? ''),
        veille:    parseFr(cells[2] ?? ''),
        variation: parseFr(cells[3] ?? ''),
        capitaux:  parseFr(cells[4] ?? ''),
        volume:    parseFr(cells[5] ?? ''),
      });
    }

    console.log(`[BVC indice ${code}] rows parsed: ${rows.length}`);
    return rows.length > 0 ? rows : null;
  } catch (e) {
    console.error('[BVC indice] HTML scrape error:', e);
    return null;
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const upper = code.toUpperCase();

  const bvcRows = await fetchBvcRows(upper);

  try {
    let composition;
    let source: string;

    if (bvcRows && bvcRows.length > 0) {
      // Fetch only secteur + market_cap from DB for these tickers
      const tickers = bvcRows.map(r => r.ticker);
      const placeholders = tickers.map((_, i) => `$${i + 1}`).join(', ');
      const { rows: meta } = await pool.query<{ ticker: string; secteur: string | null; market_cap: string | null }>(`
        SELECT t.ticker, t.secteur, f.market_cap
        FROM bvc.dim_titre t
        LEFT JOIN bvc.dim_fondamentaux f ON f.ticker = t.ticker
        WHERE t.ticker IN (${placeholders})
      `, tickers);

      const metaMap = Object.fromEntries(meta.map(m => [m.ticker, m]));

      // Sort alphabetically by BVC display name (same order as BVC website)
      const sorted = [...bvcRows].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      composition = sorted.map(r => ({
        ticker:    r.ticker,
        nom:       r.name,
        secteur:   metaMap[r.ticker]?.secteur ?? null,
        prix:      r.prix,
        veille:    r.veille,   // real previous close from BVC HTML
        variation: r.variation,
        volume:    r.volume,    // nb shares (QUANTITÉ ÉCHANGÉE)
        capitaux:  r.capitaux,  // MAD value (VOLUME)
        haut:      null,
        bas:       null,
        marketCap: metaMap[r.ticker]?.market_cap != null
          ? parseFloat(metaMap[r.ticker].market_cap!)
          : null,
      }));
      source = 'bvc_html';

    } else if (upper === 'MSI20') {
      const { rows } = await pool.query(`
        SELECT c.ticker, c.nom, t.secteur,
               c.prix, c.variation, c.volume, c.capitaux,
               c.haut, c.bas, f.market_cap
        FROM bvc.v_derniere_cotation c
        JOIN bvc.dim_titre t ON t.ticker = c.ticker
        LEFT JOIN bvc.dim_fondamentaux f ON f.ticker = c.ticker
        ORDER BY f.market_cap DESC NULLS LAST
        LIMIT 20
      `);
      composition = rows.map((r: Record<string, string | null>) => ({
        ticker:    r.ticker, nom: r.nom, secteur: r.secteur,
        prix:      r.prix      != null ? parseFloat(r.prix)      : null,
        variation: r.variation != null ? parseFloat(r.variation) : null,
        volume:    r.volume    != null ? parseInt(r.volume, 10)  : null,
        capitaux:  r.capitaux  != null ? parseFloat(r.capitaux)  : null,
        haut:      r.haut      != null ? parseFloat(r.haut)      : null,
        bas:       r.bas       != null ? parseFloat(r.bas)       : null,
        marketCap: r.market_cap != null ? parseFloat(r.market_cap) : null,
      }));
      source = 'top20_market_cap';

    } else {
      const { rows } = await pool.query(`
        SELECT c.ticker, c.nom, t.secteur,
               c.prix, c.variation, c.volume, c.capitaux,
               c.haut, c.bas, f.market_cap
        FROM bvc.v_derniere_cotation c
        JOIN bvc.dim_titre t ON t.ticker = c.ticker
        LEFT JOIN bvc.dim_fondamentaux f ON f.ticker = c.ticker
        ORDER BY f.market_cap DESC NULLS LAST
      `);
      composition = rows.map((r: Record<string, string | null>) => ({
        ticker:    r.ticker, nom: r.nom, secteur: r.secteur,
        prix:      r.prix      != null ? parseFloat(r.prix)      : null,
        variation: r.variation != null ? parseFloat(r.variation) : null,
        volume:    r.volume    != null ? parseInt(r.volume, 10)  : null,
        capitaux:  r.capitaux  != null ? parseFloat(r.capitaux)  : null,
        haut:      r.haut      != null ? parseFloat(r.haut)      : null,
        bas:       r.bas       != null ? parseFloat(r.bas)       : null,
        marketCap: r.market_cap != null ? parseFloat(r.market_cap) : null,
      }));
      source = 'all';
    }

    return NextResponse.json({ code: upper, source, composition });
  } catch (err) {
    console.error('[BVC indice composition]', err);
    return NextResponse.json({ code: upper, source: 'error', composition: [] });
  }
}
