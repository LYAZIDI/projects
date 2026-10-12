import { NextRequest, NextResponse } from 'next/server';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  isoDate: string;
  description: string;
}

let cache: { items: NewsItem[]; ts: number } | null = null;
const CACHE_TTL = 15 * 60 * 1000;

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return (m?.[1] ?? m?.[2] ?? '').trim();
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
  return xml.match(re)?.[1]?.trim() ?? '';
}

function parseRSS(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const raw = m[1];
    let title = extractTag(raw, 'title');
    const link  = extractTag(raw, 'link') || extractAttr(raw, 'link', 'href');
    const pubDate = extractTag(raw, 'pubDate');
    const source  = extractTag(raw, 'source') || extractAttr(raw, 'source', 'url');
    let description = extractTag(raw, 'description');
    // Decode HTML entities then strip tags
    description = description
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 280);

    // Google News appends " - Source" to title — strip it
    const srcFromTitle = title.match(/ - ([^-]+)$/);
    const srcName = extractTag(raw, 'source') || srcFromTitle?.[1] || source;
    if (srcFromTitle) title = title.slice(0, title.lastIndexOf(' - '));

    let isoDate = '';
    try { isoDate = pubDate ? new Date(pubDate).toISOString() : ''; } catch {}

    if (title && link) items.push({ title, link, pubDate, source: srcName, isoDate, description });
  }
  return items;
}

async function fetchRSS(query: string): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${query}&hl=fr&gl=MA&ceid=MA:fr`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BVCBot/1.0)' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    return parseRSS(await res.text());
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')?.toUpperCase() ?? '';

  // Ticker-specific search bypasses general cache
  if (ticker) {
    const items = await fetchRSS(encodeURIComponent(`"${ticker}" bourse casablanca`));
    return NextResponse.json({ items: items.slice(0, 30) });
  }

  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ items: cache.items, cached: true });
  }

  const [bvc, ammc, masi] = await Promise.all([
    fetchRSS('bourse+de+casablanca'),
    fetchRSS('AMMC+maroc+bourse'),
    fetchRSS('MASI+maroc+marché+boursier'),
  ]);

  const seen = new Set<string>();
  const all = [...bvc, ...ammc, ...masi].filter(i => {
    if (seen.has(i.link)) return false;
    seen.add(i.link);
    return true;
  });

  all.sort((a, b) => {
    const ta = a.isoDate ? new Date(a.isoDate).getTime() : 0;
    const tb = b.isoDate ? new Date(b.isoDate).getTime() : 0;
    return tb - ta;
  });

  const items = all.slice(0, 60);
  cache = { items, ts: Date.now() };
  return NextResponse.json({ items });
}
