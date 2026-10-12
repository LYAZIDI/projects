/**
 * BVC API Client — calls the official casablanca-bourse.com JSON endpoints.
 *
 * The BVC frontend is a Drupal SPA that fetches data via XHR to /api/live-market/*.
 * These endpoints require a valid Drupal session cookie obtained from the main page.
 * We maintain one shared session and refresh it when it expires (or on 403/401).
 */
import https from 'node:https';

const HOST = 'www.casablanca-bourse.com';
const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

// ── Session management ─────────────────────────────────────────────────────────

interface Session {
  cookie:  string;   // raw Set-Cookie header value(s) joined
  expires: number;   // epoch ms
}

let session: Session | null = null;
const SESSION_TTL = 25 * 60 * 1000;   // 25 min (Drupal default session is 30 min)

// Browser headers for the initial page request (looks like a real browser navigation)
const PAGE_HEADERS: Record<string, string> = {
  'User-Agent':                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept':                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language':           'fr-FR,fr;q=0.9,en;q=0.8',
  'Cache-Control':             'max-age=0',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Site':            'none',
  'Sec-Fetch-Mode':            'navigate',
  'Sec-Fetch-User':            '?1',
  'Sec-Fetch-Dest':            'document',
  'Connection':                'keep-alive',
};

// XHR/fetch headers for JSON API calls (looks like an in-page AJAX call)
function apiHeaders(cookie: string, refPath: string): Record<string, string> {
  return {
    'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept':          'application/json, text/plain, */*',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    'Cookie':          cookie,
    'Referer':         `https://${HOST}${refPath}`,
    'Origin':          `https://${HOST}`,
    'Sec-Fetch-Site':  'same-origin',
    'Sec-Fetch-Mode':  'cors',
    'Sec-Fetch-Dest':  'empty',
    'X-Requested-With': 'XMLHttpRequest',
    'Connection':      'keep-alive',
  };
}

function request(path: string, headers: Record<string, string>): Promise<{ status: number; headers: Record<string, string | string[]>; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: HOST, path, method: 'GET', headers, agent, timeout: 20_000 },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data',  (c: Buffer) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on('end',   () => resolve({ status: res.statusCode ?? 0, headers: res.headers as Record<string, string | string[]>, body: Buffer.concat(chunks).toString('utf-8') }));
        res.on('error', reject);
      },
    );
    req.on('error',   reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`BVC timeout: ${path}`)); });
    req.end();
  });
}

async function refreshSession(): Promise<Session> {
  const res = await request('/live-market/overview', PAGE_HEADERS);
  // Collect all Set-Cookie headers
  const setCookie = res.headers['set-cookie'];
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  // Keep only the name=value part of each cookie (strip path/domain/etc.)
  const cookie = cookies.map(c => c.split(';')[0]).join('; ');
  return { cookie, expires: Date.now() + SESSION_TTL };
}

async function getSession(): Promise<Session> {
  if (!session || Date.now() > session.expires) {
    session = await refreshSession();
  }
  return session;
}

// ── Public API ─────────────────────────────────────────────────────────────────

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

function isJson(body: string): boolean {
  const t = body.trimStart();
  return t.startsWith('[') || t.startsWith('{');
}

function parseDrupalJson(html: string, path: string): JsonValue {
  const start = html.indexOf('data-drupal-selector="drupal-settings-json">');
  if (start === -1) throw new Error(`Drupal JSON not found on ${path}`);
  const jsonStart = html.indexOf('{', start);
  const jsonEnd   = html.indexOf('</script>', jsonStart);
  if (jsonStart === -1 || jsonEnd === -1) throw new Error(`JSON bounds not found on ${path}`);
  const parsed = JSON.parse(html.slice(jsonStart, jsonEnd)) as { live_market?: JsonValue };
  return (parsed.live_market ?? parsed) as JsonValue;
}

export async function bvcGet(apiPath: string, refPath: string): Promise<JsonValue> {
  // 1. Try JSON API with session cookie
  const sess = await getSession();
  const res  = await request(apiPath, apiHeaders(sess.cookie, refPath));

  if (isJson(res.body)) return JSON.parse(res.body) as JsonValue;

  // 2. Refresh session and retry once on auth failure
  if (res.status === 403 || res.status === 401) {
    session = await refreshSession();
    const retry = await request(apiPath, apiHeaders(session.cookie, refPath));
    if (isJson(retry.body)) return JSON.parse(retry.body) as JsonValue;
  }

  // 3. JSON API is WAF-blocked from this server — fall back to HTML page scraping.
  //    The page embeds the same data as Drupal JSON; routes already handle both shapes.
  console.warn(`[BVC] JSON API blocked (${apiPath} → HTTP ${res.status}), falling back to HTML scraping of ${refPath}`);
  const page = await request(refPath, PAGE_HEADERS);
  return parseDrupalJson(page.body, refPath);
}

// Fetch the raw HTML of a BVC page (no JSON parsing, no session cookie needed)
export async function bvcHtml(path: string): Promise<string> {
  const res = await request(path, PAGE_HEADERS);
  return res.body;
}

// Convenience typed getters — return the raw JSON arrays/objects from BVC endpoints
export type BvcRec = Record<string, JsonValue>;

export const bvcApi = {
  // GET /api/live-market/actions → array of action objects
  actions:    () => bvcGet('/api/live-market/actions',         '/live-market/actions')          as Promise<BvcRec[]>,
  // GET /api/live-market/obligations → array of bond objects
  obligations:() => bvcGet('/api/live-market/obligations',     '/live-market/obligations')      as Promise<BvcRec[]>,
  // GET /api/live-market/produits-derives → array of futures objects
  derives:    () => bvcGet('/api/live-market/produits-derives', '/live-market/produits-derives') as Promise<BvcRec[]>,
  // GET /api/live-market/droits → array of rights objects
  droits:     () => bvcGet('/api/live-market/droits',          '/live-market/droits')           as Promise<BvcRec[]>,
  // GET /api/live-market/overview → overview object (ticker, movers, session, transactions, futures)
  overview:   () => bvcGet('/api/live-market/overview',        '/live-market/overview')         as Promise<BvcRec>,
  // GET /api/live-market/indices → indices object
  indices:    () => bvcGet('/api/live-market/indices',         '/live-market/indices')          as Promise<BvcRec>,
  // GET /api/live-market/transactions → transactions object
  transactions:() => bvcGet('/api/live-market/transactions',   '/live-market/transactions')     as Promise<BvcRec>,
};
