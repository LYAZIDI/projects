import { NextResponse } from 'next/server';
import { bvcApi, BvcRec } from '@/lib/bvc-client';

const num = (v: unknown) => typeof v === 'number' ? v : null;
const str = (v: unknown) => String(v ?? '').trim();
const lbl = (v: unknown) => ((v as BvcRec)?.fr as string ?? '').trim();

function mapDerive(d: BvcRec) {
  return {
    symbol:          str(d.symbol),
    label:           lbl(d.label),
    underlying:      str(d.underlying),
    maturityDate:    str(d.maturityDate),
    status:          lbl(d.status),
    refPrice:        num(d.refPrice),
    lastPrice:       num(d.lastPrice),
    openPrice:       num(d.openPrice),
    high:            num(d.high),
    low:             num(d.low),
    quantityTraded:  num(d.quantityTraded),
    volume:          num(d.volume),
    changePct:       num(d.changePct),
    bestBidPrice:    num(d.bestBidPrice),
    bestBidQty:      num(d.bestBidQty),
    bestAskPrice:    num(d.bestAskPrice),
    bestAskQty:      num(d.bestAskQty),
    prixTheorique:   num(d.prixTheorique),
    positionOuverte: num(d.positionOuverte),
    nbTransactions:  typeof d.nbTransactions === 'number' ? d.nbTransactions : 0,
  };
}

export async function GET() {
  try {
    const raw = await bvcApi.derives();
    const arr: BvcRec[] = Array.isArray(raw) ? raw : ((raw as BvcRec)?.derives as BvcRec[]) ?? [];
    return NextResponse.json({ derives: arr.map(mapDerive) });
  } catch (err) {
    console.error('[BVC derives] error:', err);
    return NextResponse.json({ derives: [] });
  }
}
