import { NextRequest, NextResponse } from 'next/server';
import { getHistoriqueTitre } from '@/lib/queries/bvc';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const jours = parseInt(req.nextUrl.searchParams.get('jours') ?? '365', 10);

  try {
    const rows = await getHistoriqueTitre(ticker.toUpperCase(), jours);
    return NextResponse.json({ data: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
