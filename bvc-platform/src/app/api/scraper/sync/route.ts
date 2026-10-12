import { NextRequest, NextResponse } from 'next/server';
import { syncBVC } from '@/lib/scraper/bvcScraper';

function isAuthorized(req: NextRequest): boolean {
  // Appel manuel (POST avec secret)
  if (req.method === 'POST') {
    return req.headers.get('x-scraper-secret') === process.env.SCRAPER_SECRET;
  }
  // Cron Vercel (GET avec Authorization: Bearer <CRON_SECRET>)
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function handler(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await syncBVC();
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Scraper] sync error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET  = handler;
export const POST = handler;
