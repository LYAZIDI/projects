import { NextResponse } from 'next/server';
import { bvcApi, BvcRec } from '@/lib/bvc-client';

const num = (v: unknown) => typeof v === 'number' ? v : null;
const str = (v: unknown) => String(v ?? '').trim();
const lbl = (v: unknown) => ((v as BvcRec)?.fr as string ?? '').trim();

function mapDroit(d: BvcRec) {
  const label = lbl(d.label);
  return {
    symbol:     str(d.symbol),
    label,
    type:       label.startsWith('DS') ? 'DS' : label.startsWith('DA') ? 'DA' : 'Autre',
    emitter:    lbl(d.emitter),
    underlying: str(d.underlying),
    ratio:      str(d.ratio),
    status:     lbl(d.status) || str((d.status as BvcRec)?.fr) || 'NT',
    refPrice:   num(d.ref_price),
    open:       num(d.open),
    price:      num(d.price),
    quantity:   num(d.quantity),
    volume:     num(d.volume),
    changePct:  num(d.change_pct),
    high:       num(d.high),
    low:        num(d.low),
    bidPrice:   num(d.bid_price),
    bidQty:     num(d.bid_qty),
    askPrice:   num(d.ask_price),
    askQty:     num(d.ask_qty),
  };
}

export async function GET() {
  try {
    const raw = await bvcApi.droits();
    const arr: BvcRec[] = Array.isArray(raw) ? raw : ((raw as BvcRec)?.droits as BvcRec[]) ?? [];
    return NextResponse.json({ droits: arr.map(mapDroit) });
  } catch (err) {
    console.error('[BVC droits] error:', err);
    return NextResponse.json({ droits: [] });
  }
}
