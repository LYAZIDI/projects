import { NextResponse } from 'next/server';
import { bvcApi, BvcRec } from '@/lib/bvc-client';

const str = (v: unknown) => String(v ?? '').trim();
const num = (v: unknown) => typeof v === 'number' ? v : null;
const lbl = (v: unknown) => ((v as BvcRec)?.fr as string ?? '').trim();

function mapAction(a: BvcRec) {
  return {
    symbol:         str(a.symbol),
    emetteur:       lbl(a.emetteur),
    secteur:        lbl(a.secteur),
    compartiment:   lbl(a.compartiment),
    statut:         lbl(a.statut),
    ouverture:      num(a.ouverture),
    plusHaut:       num(a.plusHaut),
    plusBas:        num(a.plusBas),
    dernierCours:   num(a.dernierCours),
    reference:      num(a.reference),
    variation:      num(a.variation),
    volume:         num(a.volume),
    quantite:       num(a.quantite),
    nbTransactions: typeof a.nbTransactions === 'number' ? a.nbTransactions : 0,
    capitalisation: num(a.capitalisation),
    achat: { prix: num((a.achat as BvcRec)?.prix), quantite: num((a.achat as BvcRec)?.quantite) },
    vente: { prix: num((a.vente as BvcRec)?.prix), quantite: num((a.vente as BvcRec)?.quantite) },
  };
}

const EMPTY = { actions: [], secteurs: [], compartiments: [] };

export async function GET() {
  try {
    const raw = await bvcApi.actions();

    // The JSON API may return an array directly, or an object wrapping the data
    let actions: BvcRec[] = [];
    let secteurs: BvcRec[] = [];
    let compartiments: BvcRec[] = [];

    if (Array.isArray(raw)) {
      actions = raw;
    } else if (raw && typeof raw === 'object') {
      const lm = (raw as BvcRec);
      actions       = ((lm.actions       as BvcRec[]) ?? []);
      secteurs      = ((lm.secteurs      as BvcRec[]) ?? []);
      compartiments = ((lm.compartiments as BvcRec[]) ?? []);
    }

    return NextResponse.json({
      actions:       actions.map(mapAction),
      secteurs:      secteurs.map((s: BvcRec) => ({ id: s.id, label: lbl(s.libelle) })),
      compartiments: compartiments.map((c: BvcRec) => ({ id: c.id, label: lbl(c.libelle) })),
    });
  } catch (err) {
    console.error('[BVC actions] error:', err);
    return NextResponse.json(EMPTY);
  }
}
