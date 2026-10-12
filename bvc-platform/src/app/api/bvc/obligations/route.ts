import { NextResponse } from 'next/server';
import { bvcApi, BvcRec } from '@/lib/bvc-client';

const num = (v: unknown) => typeof v === 'number' ? v : null;
const str = (v: unknown) => String(v ?? '').trim();
const lbl = (v: unknown) => ((v as BvcRec)?.fr as string ?? '').trim();

function mapBond(b: BvcRec) {
  return {
    symbol:         str(b.symbol),
    isin:           str(b.isin),
    emetteur:       lbl(b.emetteur) || str(b.emetteur),
    secteur:        lbl(b.secteur),
    type:           lbl(b.type),
    quotationMode:  lbl(b.quotationMode),
    statut:         lbl(b.statut) || str(b.statut) || 'NT',
    ouverture:      num(b.ouverture),
    plusHaut:       num(b.plusHaut),
    plusBas:        num(b.plusBas),
    dernierCours:   num(b.dernierCours) ?? num(b.price),
    reference:      num(b.reference) ?? num(b.ref_price),
    variation:      num(b.variation) ?? num(b.change_pct),
    volume:         num(b.volume),
    quantite:       num(b.quantite) ?? num(b.quantity),
    nbTransactions: typeof b.nbTransactions === 'number' ? b.nbTransactions : 0,
    achat: { prix: num((b.achat as BvcRec)?.prix), quantite: num((b.achat as BvcRec)?.quantite) },
    vente: { prix: num((b.vente as BvcRec)?.prix), quantite: num((b.vente as BvcRec)?.quantite) },
  };
}

// In-process cache (6h TTL — bond listings change slowly during the day)
let cache: { bonds: ReturnType<typeof mapBond>[]; ts: number } | null = null;
const CACHE_TTL = 6 * 3600 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ bonds: cache.bonds, cached: true });
  }
  try {
    const raw = await bvcApi.obligations();
    const arr: BvcRec[] = Array.isArray(raw) ? raw : ((raw as BvcRec)?.obligations as BvcRec[]) ?? [];
    const bonds = arr.map(mapBond);
    if (bonds.length > 0) cache = { bonds, ts: Date.now() };
    return NextResponse.json({ bonds });
  } catch (err) {
    console.error('[BVC obligations] error:', err);
    if (cache) return NextResponse.json({ bonds: cache.bonds, cached: true, stale: true });
    return NextResponse.json({ bonds: [] });
  }
}
