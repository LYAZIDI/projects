'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  isoDate: string;
  description: string;
}

// ── Source colors ─────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  'boursenews':      '#3fb950',
  'medias24':        '#1f6feb',
  "l'economiste":    '#f0883e',
  'leconomiste':     '#f0883e',
  'challenge':       '#a371f7',
  'african markets': '#26a6a0',
  'ammc':            '#f85149',
  'casablanca-bourse': '#26a6a0',
  'tradingview':     '#1f6feb',
  'ilboursa':        '#d29922',
  'le360':           '#a371f7',
  'hespress':        '#f0883e',
  'telquel':         '#3fb950',
};

function sourceColor(src: string): string {
  const key = src.toLowerCase();
  for (const [k, v] of Object.entries(SOURCE_COLORS)) {
    if (key.includes(k)) return v;
  }
  return '#8b949e';
}


const CATEGORIES = [
  { key: '',      label: 'À la une' },
  { key: 'bvc',  label: 'BVC officiel' },
  { key: 'ammc', label: 'AMMC' },
];

function timeAgo(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'à l\'instant';
  if (m < 60) return `il y a ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${d}j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });
}

// ── Featured card (first article) ────────────────────────────────────────────

function FeaturedCard({ item }: { item: NewsItem }) {
  const color = sourceColor(item.source);
  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: '#161b22', borderRadius: 10, padding: '24px 28px',
        border: `1px solid #21262d`, marginBottom: 2,
        borderLeft: `4px solid ${color}`,
        transition: 'background 0.15s',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = '#1c2128')}
        onMouseLeave={e => (e.currentTarget.style.background = '#161b22')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>
            {item.source || 'Presse'}
          </span>
          <span style={{ fontSize: 11, color: '#8b949e' }}>{timeAgo(item.isoDate)}</span>
          <span style={{ fontSize: 10, color: '#8b949e' }}>· {formatDate(item.isoDate)}</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#8b949e', background: '#0d1117', borderRadius: 4, padding: '2px 6px', border: '1px solid #21262d' }}>À LA UNE</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#e6edf3', lineHeight: 1.45, marginBottom: 10, fontFamily: 'system-ui, sans-serif' }}>
          {item.title}
        </div>
        {item.description && (
          <div style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.6, fontFamily: 'system-ui, sans-serif', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {item.description}
          </div>
        )}
        <div style={{ marginTop: 14, fontSize: 11, color: color, fontWeight: 600 }}>Lire l&apos;article ↗</div>
      </div>
    </a>
  );
}

// ── Standard news card ────────────────────────────────────────────────────────

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const color = sourceColor(item.source);
  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: '#161b22', borderRadius: 8, padding: '14px 18px',
        border: '1px solid #21262d', marginBottom: 2,
        display: 'flex', gap: 16, alignItems: 'flex-start',
        transition: 'background 0.12s',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = '#1c2128')}
        onMouseLeave={e => (e.currentTarget.style.background = '#161b22')}
      >
        {/* Index number */}
        <div style={{ fontSize: 22, fontWeight: 800, color: '#21262d', minWidth: 28, paddingTop: 2, lineHeight: 1, fontFamily: 'system-ui, sans-serif' }}>
          {String(index + 1).padStart(2, '0')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ background: color + '18', color, border: `1px solid ${color}33`, borderRadius: 12, padding: '1px 8px', fontSize: 9, fontWeight: 700, letterSpacing: 0.4 }}>
              {item.source || 'Presse'}
            </span>
            <span style={{ fontSize: 10, color: '#8b949e' }}>{timeAgo(item.isoDate)}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3', lineHeight: 1.4, marginBottom: item.description ? 6 : 0, fontFamily: 'system-ui, sans-serif' }}>
            {item.title}
          </div>
          {item.description && (
            <div style={{ fontSize: 12, color: '#6e7681', lineHeight: 1.5, fontFamily: 'system-ui, sans-serif', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {item.description}
            </div>
          )}
        </div>
        <div style={{ fontSize: 16, color: '#30363d', flexShrink: 0, paddingTop: 2 }}>↗</div>
      </div>
    </a>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ActualitesPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticker, setTicker] = useState('');
  const [search, setSearch] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [category, setCategory] = useState('');
  const [tickers, setTickers] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/bvc/actions')
      .then(r => r.json())
      .then(d => {
        const syms: string[] = (d.actions ?? []).map((a: { symbol: string }) => a.symbol.trim()).filter(Boolean);
        syms.sort();
        setTickers(syms);
      })
      .catch(() => {});
  }, []);

  const load = useCallback((t = '') => {
    setLoading(true);
    setSearch('');
    const url = t ? `/api/news?ticker=${t}` : '/api/news';
    fetch(url)
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setLastUpdate(new Date()); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectTicker = (t: string) => {
    const next = ticker === t ? '' : t;
    setTicker(next);
    setCategory('');
    load(next);
  };

  let filtered = items;
  if (search) {
    filtered = items.filter(i =>
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.source.toLowerCase().includes(search.toLowerCase())
    );
  } else if (category === 'ammc') {
    filtered = items.filter(i => i.source.toLowerCase().includes('ammc') || i.title.toLowerCase().includes('ammc'));
  } else if (category === 'bvc') {
    filtered = items.filter(i => i.source.toLowerCase().includes('bourse') || i.title.toLowerCase().includes('casablanca'));
  }

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div style={{ background: '#0d1117', color: '#e6edf3', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <header style={{ background: '#161b22', borderBottom: '1px solid #21262d', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0, height: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 16 }}>
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <polyline points="3,28 11,14 16,7 21,14 29,28" stroke="#C49A2E" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
            <circle cx="16" cy="7" r="2.5" fill="#E4BA4A"/>
          </svg>
          <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700, fontSize: 13, color: '#e6edf3', letterSpacing: '0.12em' }}>Z<span style={{ color: '#C49A2E' }}>É</span>NITH</span>
          <span style={{ fontSize: 9, color: '#8b949e', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Actualités</span>
        </div>

        {/* Category tabs */}
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => { setCategory(c.key); setTicker(''); if (!c.key) load(''); }}
            style={{ height: 48, padding: '0 16px', background: 'none', border: 'none', borderBottom: `2px solid ${category === c.key && !ticker ? '#f0883e' : 'transparent'}`, color: category === c.key && !ticker ? '#f0883e' : '#8b949e', fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: 0.5, transition: 'color 0.15s' }}>
            {c.label}
          </button>
        ))}

        <div style={{ width: 1, height: 20, background: '#21262d', margin: '0 16px' }} />

        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
          style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 20, padding: '5px 14px', color: '#e6edf3', fontSize: 12, outline: 'none', width: 200 }} />

        <div style={{ flex: 1 }} />

        {lastUpdate && <span style={{ fontSize: 10, color: '#8b949e', marginRight: 12 }}>Mis à jour {timeAgo(lastUpdate.toISOString())}</span>}
        <button onClick={() => load(ticker)} style={{ fontSize: 11, color: '#26a6a0', background: 'none', border: '1px solid #26a6a0', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', marginRight: 12 }}>↻ Rafraîchir</button>
        <Link href="/analyse" style={{ fontSize: 11, color: '#8b949e', textDecoration: 'none', border: '1px solid #21262d', borderRadius: 6, padding: '4px 10px', marginRight: 8 }}>← Analyse</Link>
        <Link href="/live" style={{ fontSize: 11, color: '#8b949e', textDecoration: 'none', border: '1px solid #21262d', borderRadius: 6, padding: '4px 10px' }}>← Live</Link>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Left sidebar ── */}
        <div style={{ width: 180, minWidth: 180, background: '#161b22', borderRight: '1px solid #21262d', display: 'flex', flexDirection: 'column', padding: '12px 8px' }}>
          <div style={{ fontSize: 9, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, paddingLeft: 4 }}>Titres BVC</div>
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tickers.map(t => (
              <button key={t} onClick={() => selectTicker(t)}
                style={{
                  textAlign: 'left', background: ticker === t ? '#f0883e18' : 'none',
                  border: `1px solid ${ticker === t ? '#f0883e' : 'transparent'}`,
                  borderRadius: 6, padding: '6px 10px',
                  color: ticker === t ? '#f0883e' : '#8b949e',
                  fontSize: 11, fontWeight: ticker === t ? 700 : 400,
                  cursor: 'pointer', transition: 'all 0.1s',
                }}
                onMouseEnter={e => { if (ticker !== t) { e.currentTarget.style.background = '#21262d'; e.currentTarget.style.color = '#e6edf3'; } }}
                onMouseLeave={e => { if (ticker !== t) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#8b949e'; } }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ── News feed ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#0d1117' }}>

          {ticker && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f0883e' }}>Actualités {ticker}</span>
              <button onClick={() => selectTicker('')} style={{ background: 'none', border: '1px solid #30363d', borderRadius: 12, padding: '2px 10px', color: '#8b949e', fontSize: 11, cursor: 'pointer' }}>× Tout afficher</button>
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ background: '#161b22', borderRadius: 8, padding: '14px 18px', border: '1px solid #21262d', height: 80, opacity: 0.4 + i * 0.1 }} />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: '#8b949e', padding: 80, fontFamily: 'system-ui, sans-serif' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📰</div>
              <div style={{ fontSize: 14 }}>Aucune actualité trouvée</div>
            </div>
          )}

          {!loading && featured && !ticker && (
            <FeaturedCard item={featured} />
          )}

          {!loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: featured && !ticker ? 12 : 0 }}>
              {(ticker ? filtered : rest).map((item, i) => (
                <NewsCard key={i} item={item} index={ticker ? i : i + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
