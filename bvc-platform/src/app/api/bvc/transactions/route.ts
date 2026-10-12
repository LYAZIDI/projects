import { NextResponse } from 'next/server';
import { bvcApi, BvcRec } from '@/lib/bvc-client';

const str = (v: unknown) => String(v ?? '').trim();
const num = (v: unknown) => typeof v === 'number' ? v : null;
const lbl = (v: unknown) => ((v as BvcRec)?.fr as string ?? '');

function mapTx(tx: BvcRec) {
  return {
    symbol:   str(tx.symbol),
    price:    num(tx.price),
    quantity: num(tx.quantity),
    volume:   num(tx.volume),
    time:     str(tx.time),
    label:    lbl(tx.label),
    market:   lbl(tx.market_label),
  };
}

const EMPTY = {
  cashVolume:    null as number | null,
  futuresVolume: null as number | null,
  actions:  [] as ReturnType<typeof mapTx>[],
  rights:   [] as ReturnType<typeof mapTx>[],
  bonds:    [] as ReturnType<typeof mapTx>[],
  funds:    [] as ReturnType<typeof mapTx>[],
  futures:  [] as ReturnType<typeof mapTx>[],
};

export async function GET() {
  try {
    const raw = await bvcApi.transactions();
    // Unwrap optional live_market wrapper, then transactions_page wrapper
    const lm  = ((raw as BvcRec).live_market        ?? raw) as BvcRec;
    const tp  = (lm.transactions_page ?? lm) as BvcRec;

    return NextResponse.json({
      cashVolume:    typeof tp.cash_volume    === 'number' ? tp.cash_volume    : null,
      futuresVolume: typeof tp.futures_volume === 'number' ? tp.futures_volume : null,
      actions:  ((tp.actions  as BvcRec[]) ?? []).map(mapTx),
      rights:   ((tp.rights   as BvcRec[]) ?? []).map(mapTx),
      bonds:    ((tp.bonds    as BvcRec[]) ?? []).map(mapTx),
      funds:    ((tp.funds    as BvcRec[]) ?? []).map(mapTx),
      futures:  ((tp.futures  as BvcRec[]) ?? []).map(mapTx),
    });
  } catch (err) {
    console.error('[BVC transactions] fetch error:', err);
    return NextResponse.json(EMPTY);
  }
}
