'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const TradingViewChart   = dynamic(() => import('@/components/TradingViewChart'),   { ssr: false });
const TradingViewHeatmap = dynamic(() => import('@/components/TradingViewHeatmap'), { ssr: false });

// ── Types ────────────────────────────────────────────────────────────────────

interface TickerItem  { symbol: string; price: number | null; change_pct: number | null; label: string; }
interface TxItem      { symbol: string; price: number | null; quantity: number | null; volume: number | null; time: string; label: string; market: string; }
interface IndexItem   { code: string; label: string; value: number | null; change_pct: number | null; change_ytd: number | null; }
interface FutureItem  { code: string; name: string; }
interface HeatmapStock { secteur: string; ticker: string; nom: string; variation: number | null; }
interface LiveData {
  session:      { status?: string; timestamp?: number };
  ticker:       TickerItem[];
  cashVolume:    number | null;
  futuresVolume: number | null;
  heatmap:      HeatmapStock[];
  movers:       { gainers: TickerItem[]; losers: TickerItem[]; futures_gainers: TickerItem[] };
  transactions: { central: TxItem[]; blocs: TxItem[]; off_book: TxItem[] };
  futures:      FutureItem[];
  indices:      IndexItem[];
}

// ── Colors ───────────────────────────────────────────────────────────────────

const C = {
  bg:     '#0d1117',
  card:   '#161b22',
  border: '#21262d',
  text:   '#e6edf3',
  muted:  '#8b949e',
  green:  '#3fb950',
  red:    '#f85149',
  blue:   '#1f6feb',
  purple: '#a371f7',
  teal:   '#26a6a0',
  amber:  '#d29922',
  orange: '#f0883e',
};

const INDEX_COLORS: Record<string, string> = {
  MASI:   C.blue,
  MSI20:  C.purple,
  ESGI:   C.teal,
  MASIMS: C.amber,
};

const INDEX_ORDER = ['MASI', 'MSI20', 'ESGI', 'MASIMS'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number | null, dec = 2) {
  if (n == null) return '—';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtPct(n: number | null) {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}
function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch { return iso; }
}
function fmtDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });
}
// ── Sub-components ────────────────────────────────────────────────────────────

function SessionBadge({ status }: { status?: string }) {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('fr-FR'));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const isOpen = status === 'open';
  const color  = isOpen ? C.green : C.muted;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#161b22', border: `1px solid ${C.border}`, borderRadius: 20, padding: '4px 14px', fontSize: 13 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: isOpen ? `0 0 6px ${C.green}` : 'none', animation: isOpen ? 'pulse 2s infinite' : 'none' }} />
      <span style={{ color: C.text }}>
        {isOpen ? 'Séance ouverte' : 'Séance clôturée'}{' • '}{fmtDate(new Date())}{' • '}{time}
      </span>
    </div>
  );
}

function IndexCard({ idx }: { idx: IndexItem }) {
  const color    = INDEX_COLORS[idx.code] ?? C.muted;
  const isPos    = (idx.change_pct ?? 0) >= 0;
  return (
    <div style={{ background: C.card, border: `1.5px solid ${color}`, borderRadius: 8, padding: '12px 14px', minHeight: 100 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
        {idx.label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: -0.5, marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>
        {fmtNum(idx.value)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: isPos ? C.green : C.red }}>
          {isPos ? '▲' : '▼'} {fmtPct(idx.change_pct)}
        </span>
        {idx.change_ytd != null && (
          <span style={{ fontSize: 10, color: C.muted }}>YTD {fmtPct(idx.change_ytd)}</span>
        )}
      </div>
    </div>
  );
}

function FutureCard({ future, price, changePct }: { future: FutureItem; price: number | null; changePct: number | null }) {
  const isPos = (changePct ?? 0) >= 0;
  return (
    <div style={{ background: C.card, border: `1.5px solid ${C.orange}`, borderRadius: 8, padding: '12px 14px', minHeight: 100 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.orange, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
        {future.name}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>
        {price != null ? fmtNum(price) : '—'}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: isPos ? C.green : C.red }}>
        {changePct != null ? `${isPos ? '▲' : '▼'} ${fmtPct(changePct)}` : '—'}
      </div>
    </div>
  );
}

// Actions → TradingView. Dérivés/droits/obligations → page BVC correspondante (TradingView ne les référence pas).
const BVC_PAGES: Record<string, string> = {
  derives:     'https://www.casablanca-bourse.com/live-market/produits-derives',
  droits:      'https://www.casablanca-bourse.com/live-market/droits',
  obligations: 'https://www.casablanca-bourse.com/live-market/obligations',
};

function MoverRow({ item, rank, market = 'comptant' }: { item: TickerItem; rank: number; market?: 'comptant' | 'terme' }) {
  const isPos = (item.change_pct ?? 0) >= 0;
  const href = market === 'terme'
    ? BVC_PAGES.derives
    : `https://fr.tradingview.com/symbols/CSEMA-${item.symbol.trim()}/`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}`, textDecoration: 'none', cursor: 'pointer' }}>
      <span style={{ fontSize: 12, color: C.muted, width: 16, textAlign: 'right', flexShrink: 0 }}>{rank}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.blue }}>{item.symbol.trim()}</div>
        <div style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(item.price)}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: isPos ? C.green : C.red }}>{fmtPct(item.change_pct)}</div>
      </div>
    </a>
  );
}

function TxRow({ tx }: { tx: TxItem }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 11, color: C.muted, flexShrink: 0, width: 58, fontVariantNumeric: 'tabular-nums' }}>{fmtTime(tx.time)}</span>
      <a href={`https://fr.tradingview.com/symbols/CSEMA-${tx.symbol.trim()}/`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 700, color: C.blue, textDecoration: 'none', flexShrink: 0, minWidth: 36 }}>
        {tx.symbol.trim()}
      </a>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(tx.price)}</span>
      <span style={{ fontSize: 11, color: C.muted, flexShrink: 0, minWidth: 80, textAlign: 'right' }}>
        Vol: {tx.volume != null ? Math.round(tx.volume).toLocaleString('fr-FR') : '—'}
      </span>
    </div>
  );
}


interface ActionItem {
  symbol: string; emetteur: string; secteur: string; compartiment: string; statut: string;
  ouverture: number | null; dernierCours: number | null; variation: number | null;
  volume: number | null; reference: number | null;
  achat: { prix: number | null; quantite: number | null };
  vente: { prix: number | null; quantite: number | null };
}

function ActionsTab() {
  const [actions,      setActions]      = useState<ActionItem[]>([]);
  const [secteurs,     setSecteurs]     = useState<{ id: unknown; label: string }[]>([]);
  const [compartiments,setCompartiments]= useState<{ id: unknown; label: string }[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [secteur,      setSecteur]      = useState('');
  const [compartiment, setCompartiment] = useState('');
  const [sortKey,      setSortKey]      = useState<'symbol' | 'emetteur' | 'dernierCours' | 'ouverture' | 'variation' | 'volume'>('symbol');
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetch('/api/bvc/actions')
      .then(r => r.json())
      .then(d => { setActions(d.actions ?? []); setSecteurs(d.secteurs ?? []); setCompartiments(d.compartiments ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = actions.filter(a => {
    if (search && !a.symbol.toLowerCase().includes(search.toLowerCase()) && !a.emetteur.toLowerCase().includes(search.toLowerCase())) return false;
    if (secteur      && a.secteur      !== secteur)      return false;
    if (compartiment && a.compartiment !== compartiment) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortKey] ?? (typeof a[sortKey] === 'number' ? -Infinity : '');
    const vb = b[sortKey] ?? (typeof b[sortKey] === 'number' ? -Infinity : '');
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ?  1 : -1;
    return 0;
  });

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function SortI({ col }: { col: typeof sortKey }) {
    if (sortKey !== col) return <span style={{ color: C.muted, marginLeft: 3, fontSize: 10 }}>↕</span>;
    return <span style={{ color: C.blue, marginLeft: 3, fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const STATUT_COLORS: Record<string, { bg: string; color: string }> = {
    T:  { bg: 'rgba(63,185,80,0.15)',  color: '#3fb950' },
    NT: { bg: 'rgba(210,153,34,0.15)', color: '#d29922' },
    S:  { bg: 'rgba(248,81,73,0.15)',  color: '#f85149' },
  };

  const selStyle: React.CSSProperties = { background: '#1c2128', border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 12px', color: C.text, fontSize: 13, outline: 'none', cursor: 'pointer', minWidth: 180 };
  const th = (align: 'left' | 'right' = 'right'): React.CSSProperties => ({ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap', borderBottom: `1px solid ${C.border}`, textAlign: align, cursor: 'pointer', userSelect: 'none' });

  return (
    <div>
      {/* Filters */}
      <div style={{ background: '#1c2128', border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 13 }}>🔍</span>
          <input placeholder="Rechercher un instrument..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...selStyle, paddingLeft: 32, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <select value={secteur} onChange={e => setSecteur(e.target.value)} style={selStyle}>
          <option value="">Tous les secteurs</option>
          {secteurs.map(s => <option key={String(s.id)} value={s.label}>{s.label}</option>)}
        </select>
        <select value={compartiment} onChange={e => setCompartiment(e.target.value)} style={selStyle}>
          <option value="">Tous les compartiments</option>
          {compartiments.map(c => <option key={String(c.id)} value={c.label}>{c.label}</option>)}
        </select>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 12, fontSize: 12 }}>
        {Object.entries(STATUT_COLORS).map(([s, col]) => (
          <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.muted }}>
            <span style={{ background: col.bg, color: col.color, border: `1px solid ${col.color}`, borderRadius: 3, padding: '1px 6px', fontWeight: 700, fontSize: 11 }}>{s}</span>
            {s === 'T' ? 'Traité' : s === 'NT' ? 'Non Traité' : 'Suspendu'}
          </span>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#1c2128' }}>
              <th onClick={() => toggleSort('symbol')} style={th('left')}>INSTRUMENT <SortI col="symbol" /></th>
              <th style={{ ...th(), cursor: 'default' }}>STATUT</th>
              {/* MEILLEURES LIMITES header */}
              <th colSpan={4} style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, color: C.amber, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center', borderBottom: `1px solid ${C.border}`, borderLeft: `2px solid ${C.amber}`, borderRight: `2px solid ${C.amber}` }}>
                MEILLEURES LIMITES
              </th>
              <th onClick={() => toggleSort('dernierCours')} style={th()}>DERNIER <SortI col="dernierCours" /></th>
              <th onClick={() => toggleSort('ouverture')}   style={th()}>OUVERTURE <SortI col="ouverture" /></th>
              <th onClick={() => toggleSort('variation')}   style={th()}>VAR % <SortI col="variation" /></th>
              <th onClick={() => toggleSort('volume')}      style={th()}>VOLUME <SortI col="volume" /></th>
            </tr>
            <tr style={{ background: '#1c2128' }}>
              <th colSpan={2} style={{ borderBottom: `1px solid ${C.border}` }} />
              <th style={{ padding: '4px 12px', fontSize: 10, fontWeight: 700, color: C.red,   textAlign: 'right', borderBottom: `1px solid ${C.border}`, borderLeft: `2px solid ${C.amber}` }}>QTÉ VENTE</th>
              <th style={{ padding: '4px 12px', fontSize: 10, fontWeight: 700, color: C.red,   textAlign: 'right', borderBottom: `1px solid ${C.border}` }}>PRIX VENTE</th>
              <th style={{ padding: '4px 12px', fontSize: 10, fontWeight: 700, color: C.green, textAlign: 'right', borderBottom: `1px solid ${C.border}` }}>PRIX ACHAT</th>
              <th style={{ padding: '4px 12px', fontSize: 10, fontWeight: 700, color: C.green, textAlign: 'right', borderBottom: `1px solid ${C.border}`, borderRight: `2px solid ${C.amber}` }}>QTÉ ACHAT</th>
              <th colSpan={4} style={{ borderBottom: `1px solid ${C.border}` }} />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: C.muted }}>Chargement...</td></tr>}
            {!loading && sorted.length === 0 && <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: C.muted }}>Aucun résultat</td></tr>}
            {!loading && sorted.map(a => {
              const statCol = STATUT_COLORS[a.statut] ?? STATUT_COLORS['NT'];
              const isPos   = (a.variation ?? 0) >= 0;
              return (
                <tr key={a.symbol} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '9px 12px' }}>
                    <a href={`https://fr.tradingview.com/symbols/CSEMA-${a.symbol.trim()}/`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: C.blue, textDecoration: 'none', fontSize: 13 }}>{a.symbol.trim()}</a>
                    <div style={{ fontSize: 11, color: C.muted }}>{a.emetteur}</div>
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                    <span style={{ background: statCol.bg, color: statCol.color, border: `1px solid ${statCol.color}`, borderRadius: 3, padding: '2px 6px', fontWeight: 700, fontSize: 11 }}>{a.statut || 'NT'}</span>
                  </td>
                  {/* VENTE */}
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums', borderLeft: `2px solid ${C.amber}` }}>
                    {a.vente.quantite != null ? a.vente.quantite.toLocaleString('fr-FR') : '—'}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: C.red, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtNum(a.vente.prix)}
                  </td>
                  {/* ACHAT */}
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: C.green, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtNum(a.achat.prix)}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums', borderRight: `2px solid ${C.amber}` }}>
                    {a.achat.quantite != null ? a.achat.quantite.toLocaleString('fr-FR') : '—'}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtNum(a.dernierCours)}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtNum(a.ouverture)}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: a.variation == null ? C.muted : isPos ? C.green : C.red }}>
                    {a.variation != null ? `${isPos ? '+' : ''}${a.variation.toFixed(2)}%` : '—%'}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                    {a.volume != null ? Math.round(a.volume).toLocaleString('fr-FR') : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!loading && sorted.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: C.muted, textAlign: 'right' }}>{sorted.length} instrument{sorted.length > 1 ? 's' : ''}</div>
      )}
    </div>
  );
}


// ── DeriveTab ─────────────────────────────────────────────────────────────────

interface DeriveItem {
  symbol: string; label: string; underlying: string; maturityDate: string; status: string;
  refPrice: number | null; lastPrice: number | null; openPrice: number | null;
  high: number | null; low: number | null; quantityTraded: number | null; volume: number | null;
  changePct: number | null; bestBidPrice: number | null; bestBidQty: number | null;
  bestAskPrice: number | null; bestAskQty: number | null; positionOuverte: number | null;
}

function DeriveTab() {
  const [derives,  setDerives]  = useState<DeriveItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [sortKey,  setSortKey]  = useState<keyof DeriveItem>('symbol');
  const [sortDir,  setSortDir]  = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetch('/api/bvc/derives')
      .then(r => r.json())
      .then(d => { setDerives(d.derives ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sorted = [...derives].sort((a, b) => {
    const va = a[sortKey] ?? (typeof a[sortKey] === 'number' ? -Infinity : '');
    const vb = b[sortKey] ?? (typeof b[sortKey] === 'number' ? -Infinity : '');
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ?  1 : -1;
    return 0;
  });

  function toggleSort(key: keyof DeriveItem) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function SortI({ col }: { col: keyof DeriveItem }) {
    if (sortKey !== col) return <span style={{ color: C.muted, marginLeft: 3, fontSize: 10 }}>↕</span>;
    return <span style={{ color: C.amber, marginLeft: 3, fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const th: React.CSSProperties = { padding: '10px 12px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', userSelect: 'none', textAlign: 'right' };

  if (loading) return <div style={{ textAlign: 'center', color: C.muted, padding: 60 }}>Chargement...</div>;

  return (
    <div>
      {/* Info banner */}
      <div style={{ background: 'rgba(31,111,235,0.08)', border: `1px solid rgba(31,111,235,0.25)`, borderRadius: 6, padding: '8px 14px', marginBottom: 24, fontSize: 12, color: C.muted }}>
        Pour les instruments dérivés, le dernier cours correspond au dernier cours traité ou, à défaut, au cours théorique.
      </div>

      {/* Cards */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 16px 0' }}>Produits dérivés</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 32 }}>
        {derives.map(d => {
          const isPos = (d.changePct ?? 0) >= 0;
          return (
            <div key={d.symbol} style={{ background: C.card, border: `1.5px solid ${C.orange}`, borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: 0.3, lineHeight: 1.3 }}>{d.label}</div>
                {d.changePct != null && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: isPos ? C.green : C.red, background: isPos ? 'rgba(63,185,80,0.15)' : 'rgba(248,81,73,0.15)', borderRadius: 20, padding: '2px 8px', flexShrink: 0, marginLeft: 8 }}>
                    {isPos ? '+' : ''}{d.changePct.toFixed(2)}%
                  </span>
                )}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.text, fontVariantNumeric: 'tabular-nums', marginBottom: 12 }}>
                {d.lastPrice != null ? fmtNum(d.lastPrice) : '—'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 12 }}>
                <span>Cours réf<br /><strong style={{ color: C.text, fontSize: 13 }}>{fmtNum(d.refPrice)}</strong></span>
                <span style={{ textAlign: 'right' }}>Volume<br /><strong style={{ color: C.text, fontSize: 13 }}>{d.volume != null ? d.volume.toLocaleString('fr-FR') : '—'}</strong></span>
              </div>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, fontSize: 12, color: C.blue, cursor: 'pointer' }}>
                › Voir plus de détails
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: '0 0 12px 0' }}>Tous les instruments</h2>
      <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#1c2128' }}>
              <th onClick={() => toggleSort('symbol')}       style={{ ...th, textAlign: 'left' }}>INSTRUMENT <SortI col="symbol" /></th>
              <th onClick={() => toggleSort('lastPrice')}    style={th}>DERNIER <SortI col="lastPrice" /></th>
              <th onClick={() => toggleSort('refPrice')}     style={th}>COURS DE RÉFÉRENCE <SortI col="refPrice" /></th>
              <th onClick={() => toggleSort('status')}       style={{ ...th, textAlign: 'center' }}>STATUT <SortI col="status" /></th>
              <th onClick={() => toggleSort('high')}         style={th}>+ HAUT JOUR <SortI col="high" /></th>
              <th onClick={() => toggleSort('low')}          style={th}>+ BAS JOUR <SortI col="low" /></th>
              <th onClick={() => toggleSort('quantityTraded')} style={th}>QTÉ ÉCHANGÉE <SortI col="quantityTraded" /></th>
              <th onClick={() => toggleSort('bestBidPrice')} style={{ ...th, color: C.green }}>MEIL. ACHAT <SortI col="bestBidPrice" /></th>
              <th onClick={() => toggleSort('bestAskPrice')} style={{ ...th, color: C.red }}>MEIL. VENTE <SortI col="bestAskPrice" /></th>
              <th onClick={() => toggleSort('changePct')}    style={th}>VARIATION % <SortI col="changePct" /></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: C.muted }}>Aucun instrument</td></tr>}
            {sorted.map(d => {
              const isPos = (d.changePct ?? 0) >= 0;
              const st = d.status || 'NT';
              const statCol = st === 'T' ? C.green : st === 'S' ? C.red : C.amber;
              return (
                <tr key={d.symbol} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{d.label || d.symbol}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>Échéance : {d.maturityDate ? new Date(d.maturityDate).toLocaleDateString('fr-FR') : '—'}</div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(d.lastPrice)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(d.refPrice)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ background: `${statCol}22`, color: statCol, border: `1px solid ${statCol}`, borderRadius: 3, padding: '2px 6px', fontWeight: 700, fontSize: 11 }}>{st}</span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(d.high)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(d.low)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                    {d.quantityTraded != null ? d.quantityTraded.toLocaleString('fr-FR') : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: C.green, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(d.bestBidPrice)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: C.red, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(d.bestAskPrice)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: d.changePct == null ? C.muted : isPos ? C.green : C.red }}>
                    {d.changePct != null ? `${isPos ? '+' : ''}${d.changePct.toFixed(2)}%` : '—%'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── DroitsTab ─────────────────────────────────────────────────────────────────

interface DroitItem {
  symbol: string; label: string; type: string; emitter: string;
  status: string; refPrice: number | null; open: number | null; price: number | null;
  quantity: number | null; volume: number | null; changePct: number | null;
  high: number | null; low: number | null; bidPrice: number | null; askPrice: number | null;
}

function DroitsTab() {
  const [droits,   setDroits]   = useState<DroitItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortKey,  setSortKey]  = useState<keyof DroitItem>('label');
  const [sortDir,  setSortDir]  = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetch('/api/bvc/droits')
      .then(r => r.json())
      .then(d => { setDroits(d.droits ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = droits.filter(d => {
    if (search && !d.label.toLowerCase().includes(search.toLowerCase()) && !d.symbol.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && d.type !== typeFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortKey] ?? (typeof a[sortKey] === 'number' ? -Infinity : '');
    const vb = b[sortKey] ?? (typeof b[sortKey] === 'number' ? -Infinity : '');
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ?  1 : -1;
    return 0;
  });

  function toggleSort(key: keyof DroitItem) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function SortI({ col }: { col: keyof DroitItem }) {
    if (sortKey !== col) return <span style={{ color: C.muted, marginLeft: 3, fontSize: 10 }}>↕</span>;
    return <span style={{ color: C.blue, marginLeft: 3, fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const STATUT_COLORS: Record<string, { bg: string; color: string }> = {
    T:  { bg: 'rgba(63,185,80,0.15)',  color: '#3fb950' },
    NT: { bg: 'rgba(210,153,34,0.15)', color: '#d29922' },
    S:  { bg: 'rgba(248,81,73,0.15)',  color: '#f85149' },
  };

  const selStyle: React.CSSProperties = { background: '#1c2128', border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 12px', color: C.text, fontSize: 13, outline: 'none', cursor: 'pointer' };
  const th: React.CSSProperties = { padding: '10px 12px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', userSelect: 'none', textAlign: 'right' };

  if (loading) return <div style={{ textAlign: 'center', color: C.muted, padding: 60 }}>Chargement...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 4px 0' }}>Droits</h1>
      <p style={{ fontSize: 13, color: C.muted, margin: '0 0 20px 0' }}>Suivi des droits de souscription et d'attribution cotés en bourse</p>

      {/* Filters */}
      <div style={{ background: '#1c2128', border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 13 }}>🔍</span>
          <input placeholder="Rechercher un droit..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...selStyle, paddingLeft: 32, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...selStyle, minWidth: 160 }}>
          <option value="">Tous les types</option>
          <option value="DS">Droits de souscription (DS)</option>
          <option value="DA">Droits d'attribution (DA)</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#1c2128' }}>
              <th onClick={() => toggleSort('label')}    style={{ ...th, textAlign: 'left' }}>INSTRUMENT <SortI col="label" /></th>
              <th onClick={() => toggleSort('status')}   style={{ ...th, textAlign: 'center' }}>STATUT <SortI col="status" /></th>
              <th onClick={() => toggleSort('refPrice')} style={{ ...th, color: C.teal }}>COURS RÉF. <SortI col="refPrice" /></th>
              <th onClick={() => toggleSort('open')}     style={th}>OUVERTURE <SortI col="open" /></th>
              <th onClick={() => toggleSort('quantity')} style={th}>QTÉ ÉCH. <SortI col="quantity" /></th>
              <th onClick={() => toggleSort('high')}     style={th}>+ HAUT <SortI col="high" /></th>
              <th onClick={() => toggleSort('low')}      style={th}>+ BAS <SortI col="low" /></th>
              <th onClick={() => toggleSort('price')}    style={th}>DERNIER <SortI col="price" /></th>
              <th onClick={() => toggleSort('changePct')} style={th}>VAR % <SortI col="changePct" /></th>
              <th onClick={() => toggleSort('volume')}   style={th}>VOLUME <SortI col="volume" /></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: C.muted }}>Aucun droit</td></tr>}
            {sorted.map(d => {
              const isPos   = (d.changePct ?? 0) >= 0;
              const st      = d.status || 'NT';
              const statCol = STATUT_COLORS[st] ?? STATUT_COLORS['NT'];
              return (
                <tr key={d.symbol} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '10px 12px' }}>
                    <a href={BVC_PAGES.derives} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: C.blue, textDecoration: 'none', fontSize: 13 }}>{d.label}</a>
                    {d.emitter && <div style={{ fontSize: 11, color: C.muted }}>{d.emitter}</div>}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ background: statCol.bg, color: statCol.color, border: `1px solid ${statCol.color}`, borderRadius: 3, padding: '2px 6px', fontWeight: 700, fontSize: 11 }}>{st}</span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.teal, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(d.refPrice)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(d.open)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                    {d.quantity != null ? d.quantity.toLocaleString('fr-FR') : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(d.high)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(d.low)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(d.price)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: d.changePct == null ? C.muted : isPos ? C.green : C.red }}>
                    {d.changePct != null ? `${isPos ? '+' : ''}${d.changePct.toFixed(2)}%` : '—%'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                    {d.volume != null ? d.volume.toLocaleString('fr-FR') : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sorted.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: C.muted, textAlign: 'right' }}>{sorted.length} droit{sorted.length > 1 ? 's' : ''}</div>
      )}
    </div>
  );
}

// ── ObligationsTab ────────────────────────────────────────────────────────────

interface BondItem {
  symbol: string; emetteur: string; secteur: string;
  type: string; quotationMode: string; statut: string;
  ouverture: number | null; plusHaut: number | null; plusBas: number | null;
  dernierCours: number | null; reference: number | null; variation: number | null;
  volume: number | null; quantite: number | null; nbTransactions: number;
  achat: { prix: number | null; quantite: number | null };
  vente: { prix: number | null; quantite: number | null };
}

type BondSortKey = 'symbol' | 'emetteur' | 'reference' | 'dernierCours' | 'variation' | 'quantite' | 'volume' | 'plusHaut' | 'plusBas' | 'ouverture' | 'nbTransactions';

function ObligationsTab() {
  const [bonds,    setBonds]    = useState<BondItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortKey,  setSortKey]  = useState<BondSortKey>('symbol');
  const [sortDir,  setSortDir]  = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetch('/api/bvc/obligations')
      .then(r => r.json())
      .then(d => { setBonds(d.bonds ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Unique types for filter tabs
  const types = Array.from(new Set(bonds.map(b => b.type).filter(Boolean)));

  const filtered = bonds.filter(b => {
    if (typeFilter && b.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!b.symbol.toLowerCase().includes(q) && !b.emetteur.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const va: number | string = (a[sortKey] as number | string | null) ?? (typeof a[sortKey] === 'number' ? -Infinity : '');
    const vb: number | string = (b[sortKey] as number | string | null) ?? (typeof b[sortKey] === 'number' ? -Infinity : '');
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ?  1 : -1;
    return 0;
  });

  function toggleSort(key: BondSortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function SortI({ col }: { col: BondSortKey }) {
    if (sortKey !== col) return <span style={{ color: C.muted, marginLeft: 3, fontSize: 10 }}>↕</span>;
    return <span style={{ color: C.blue, marginLeft: 3, fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const STATUT_COLORS: Record<string, { bg: string; color: string }> = {
    T:  { bg: 'rgba(63,185,80,0.15)',  color: '#3fb950' },
    NT: { bg: 'rgba(210,153,34,0.15)', color: '#d29922' },
    S:  { bg: 'rgba(248,81,73,0.15)',  color: '#f85149' },
  };

  const selStyle: React.CSSProperties = { background: '#1c2128', border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 12px', color: C.text, fontSize: 13, outline: 'none' };
  const th: React.CSSProperties = { padding: '10px 12px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', userSelect: 'none', textAlign: 'right' };

  if (loading) return <div style={{ textAlign: 'center', color: C.muted, padding: 60 }}>Chargement...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 4px 0' }}>Obligations</h1>
      <p style={{ fontSize: 13, color: C.muted, margin: '0 0 20px 0' }}>Cotation des emprunts obligataires sur la Bourse de Casablanca</p>

      {/* Search + type selector */}
      <div style={{ background: '#1c2128', border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 14, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 13 }}>🔍</span>
          <input placeholder="Rechercher par émetteur..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...selStyle, paddingLeft: 32, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...selStyle, minWidth: 200, cursor: 'pointer' }}>
          <option value="">Tous les types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Type pills (matches BVC tab strip) */}
      <div style={{ background: '#1c2128', border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: C.muted, marginRight: 4, fontWeight: 600 }}>TYPE D'EMPRUNT :</span>
        {(['', ...types] as string[]).map(t => {
          const count = t === '' ? bonds.length : bonds.filter(b => b.type === t).length;
          const active = typeFilter === t;
          const shortLabel = t === '' ? 'Tous'
            : t.replace('EMPRUNTS OBLIGATAIRES ', '').replace('EMPRUNTS ', '');
          return (
            <button key={t} onClick={() => setTypeFilter(t)} style={{
              padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 4, cursor: 'pointer',
              border: `1px solid ${active ? C.blue : C.border}`,
              background: active ? C.blue : 'transparent',
              color: active ? '#fff' : C.muted,
              whiteSpace: 'nowrap',
            }}>
              {shortLabel} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#1c2128' }}>
              <th onClick={() => toggleSort('symbol')}        style={{ ...th, textAlign: 'left' }}>INSTRUMENT <SortI col="symbol" /></th>
              <th onClick={() => toggleSort('emetteur')}      style={{ ...th, textAlign: 'left' }}>ÉMETTEUR <SortI col="emetteur" /></th>
              <th style={{ ...th, textAlign: 'center' }}>STATUT</th>
              <th onClick={() => toggleSort('reference')}     style={{ ...th, color: C.teal }}>C.RÉF <SortI col="reference" /></th>
              <th onClick={() => toggleSort('ouverture')}     style={th}>OUVERT. <SortI col="ouverture" /></th>
              <th onClick={() => toggleSort('dernierCours')}  style={th}>DERNIER <SortI col="dernierCours" /></th>
              <th onClick={() => toggleSort('quantite')}      style={th}>QTÉ <SortI col="quantite" /></th>
              <th onClick={() => toggleSort('volume')}        style={th}>VOLUME <SortI col="volume" /></th>
              <th onClick={() => toggleSort('variation')}     style={th}>VAR % <SortI col="variation" /></th>
              <th style={{ ...th, color: C.orange }}>MODE COT.</th>
              <th onClick={() => toggleSort('plusHaut')}      style={th}>+ HAUT <SortI col="plusHaut" /></th>
              <th onClick={() => toggleSort('plusBas')}       style={th}>+ BAS <SortI col="plusBas" /></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={12} style={{ padding: 40, textAlign: 'center', color: C.muted }}>Aucune obligation</td></tr>
            )}
            {sorted.map(b => {
              const isPos   = (b.variation ?? 0) >= 0;
              const st      = b.statut || 'NT';
              const statCol = STATUT_COLORS[st] ?? STATUT_COLORS['NT'];
              return (
                <tr key={b.symbol} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '10px 12px' }}>
                    <a href={BVC_PAGES.obligations} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: C.blue, textDecoration: 'none', fontSize: 13 }}>{b.symbol.trim()}</a>
                  </td>
                  <td style={{ padding: '10px 12px', color: C.text, fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: C.text }}>{b.emetteur}</div>
                    {b.secteur && <div style={{ fontSize: 11, color: C.muted }}>{b.secteur}</div>}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ background: statCol.bg, color: statCol.color, border: `1px solid ${statCol.color}`, borderRadius: 3, padding: '2px 6px', fontWeight: 700, fontSize: 11 }}>{st}</span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.teal, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(b.reference)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(b.ouverture) !== '—' ? fmtNum(b.ouverture) : <span style={{ color: C.muted }}>—</span>}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(b.dernierCours)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                    {b.quantite != null ? b.quantite.toLocaleString('fr-FR') : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                    {b.volume != null ? b.volume.toLocaleString('fr-FR') : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: b.variation == null ? C.muted : isPos ? C.green : C.red }}>
                    {b.variation != null ? `${isPos ? '+' : ''}${b.variation.toFixed(2)}%` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: C.orange, fontSize: 12 }}>{b.quotationMode || '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(b.plusHaut) !== '—' ? fmtNum(b.plusHaut) : <span style={{ color: C.muted }}>—</span>}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(b.plusBas) !== '—' ? fmtNum(b.plusBas) : <span style={{ color: C.muted }}>—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sorted.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: C.muted, textAlign: 'right' }}>{sorted.length} obligation{sorted.length > 1 ? 's' : ''}</div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = ["Vue d'ensemble", 'Indices', 'Actions', 'Produits dérivés', 'Droits', 'Obligations'];

export default function LivePage() {
  const [data,      setData]      = useState<LiveData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState(0);
  const [txTab,      setTxTab]      = useState<'central' | 'blocs' | 'off_book'>('central');
  const [moverTab,   setMoverTab]   = useState<'gainers' | 'losers'>('gainers');
  const [moverMarket,setMoverMarket]= useState<'comptant' | 'terme'>('comptant');
  const [chartMode, setChartMode] = useState<'indices' | 'derives'>('indices');
  const [navOpen,   setNavOpen]   = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!navOpen) return;
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [navOpen]);

  const load = useCallback(() => {
    fetch('/api/bvc/live')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const futuresPriceMap: Record<string, { price: number | null; change_pct: number | null }> = {};
  (data?.movers?.futures_gainers ?? []).forEach(f => {
    futuresPriceMap[f.symbol] = { price: f.price, change_pct: f.change_pct };
  });

  const sortedIndices = INDEX_ORDER
    .map(code => (data?.indices ?? []).find(i => i.code === code))
    .filter(Boolean) as IndexItem[];

  const txList    = txTab === 'central' ? (data?.transactions?.central  ?? [])
                 : txTab === 'blocs'   ? (data?.transactions?.blocs    ?? [])
                 :                       (data?.transactions?.off_book ?? []);
  const baseMovers = moverMarket === 'terme' ? (data?.movers?.futures_gainers ?? []) : undefined;
  const moverList  = moverTab === 'gainers'
    ? (baseMovers ?? data?.movers?.gainers ?? [])
    : moverTab === 'losers' && moverMarket === 'comptant'
      ? (data?.movers?.losers ?? [])
      : (baseMovers ?? []).slice().reverse();

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        input::placeholder { color: #8b949e; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #161b22; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
      `}</style>

      {/* ── Header ── */}
      <header style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <polyline points="3,28 11,14 16,7 21,14 29,28" stroke="#C49A2E" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
              <circle cx="16" cy="7" r="2.5" fill="#E4BA4A"/>
            </svg>
            <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: '0.1em' }}>
              Z<span style={{ color: '#C49A2E' }}>É</span>NITH
            </div>
          </div>
          <a
            href="https://asfim-reporting.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.muted, textDecoration: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 9px', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text)}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
          >
            ASFIM Reporting
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M4 2H2a1 1 0 00-1 1v5a1 1 0 001 1h5a1 1 0 001-1V6M6 1h3m0 0v3m0-3L4.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
        <SessionBadge status={data?.session?.status} />
        {/* ── Nav dropdown ── */}
        <div ref={navRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setNavOpen(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: C.orange, background: 'transparent', border: `1.5px solid ${C.orange}`, borderRadius: 8, padding: '5px 14px', cursor: 'pointer', letterSpacing: 0.3 }}
          >
            Analyse
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transition: 'transform 0.18s', transform: navOpen ? 'rotate(180deg)' : 'none' }}>
              <polyline points="2,4 6,8 10,4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {navOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#1c2128', border: `1px solid ${C.border}`, borderRadius: 10, padding: '6px', minWidth: 180, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
              {[
                { href: '/rapport',       label: 'Rapport de marché', color: C.amber },
                { href: '/screener-oblig', label: 'YTM Obligations',  color: C.purple },
                { href: '/portefeuille',   label: 'Portefeuille',      color: C.teal },
                { href: '/actualites',     label: 'Actualités',        color: '#f0883e' },
                { href: '/analyse',        label: 'Analyse technique', color: C.orange },
              ].map(({ href, label, color }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setNavOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 7, textDecoration: 'none', color: C.text, fontSize: 13, fontWeight: 500, transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── Ticker tape ── */}
      {!loading && data && data.ticker.length > 0 && (
        <div style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, height: 38, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
          <div className="ticker-tape" style={{ display: 'flex', whiteSpace: 'nowrap', alignItems: 'center', height: '100%' }}>
            {[...data.ticker, ...data.ticker].map((item, i) => {
              const isPos      = (item.change_pct ?? 0) >= 0;
              const varColor   = item.change_pct == null ? C.muted : isPos ? C.green : C.red;
              const displayName = item.label || item.symbol;
              return (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 22px', borderRight: `1px solid ${C.border}`, height: '100%' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: 0.3 }}>{displayName}</span>
                  <span style={{ fontSize: 12, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(item.price)}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: varColor }}>
                    {item.change_pct != null ? (isPos ? '▲ ' : '▼ ') : ''}{item.change_pct != null ? `${isPos ? '+' : ''}${item.change_pct.toFixed(2)}%` : '—'}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tab nav ── */}
      <nav style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '0 20px', display: 'flex', overflowX: 'auto' }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            style={{ padding: '12px 18px', fontSize: 13, fontWeight: 500, color: tab === i ? C.text : C.muted, background: 'none', border: 'none', borderBottom: tab === i ? `2px solid ${C.blue}` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: -1 }}
          >
            {t}
          </button>
        ))}
      </nav>

      {/* ── Info banner ── */}
      <div style={{ padding: '10px 20px 0' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(139,148,158,0.08)', border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 12px', fontSize: 11, color: C.muted }}>
          <span style={{ fontSize: 13 }}>ℹ️</span>
          <span>Indices diffusés en <strong style={{ color: C.text, fontWeight: 600 }}>temps réel</strong> · Cours des actions en <strong style={{ color: C.text, fontWeight: 600 }}>différé de 15 min</strong> (source BVC)</span>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: 20 }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: C.muted, fontSize: 14 }}>
            Chargement des données en direct...
          </div>
        )}

        {/* ── Vue d'ensemble ── */}
        {!loading && tab === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── ROW 1 : Indices | Futures ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              {/* Cadran Indices */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text, paddingBottom: 10, borderBottom: `1px solid ${C.border}`, margin: 0 }}>
                  Indices du marché au comptant
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {sortedIndices.map(idx => <IndexCard key={idx.code} idx={idx} />)}
                  {sortedIndices.length === 0 && [1,2,3,4].map(n => (
                    <div key={n} style={{ background: '#0d1117', border: `1px solid ${C.border}`, borderRadius: 8, minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 12 }}>—</div>
                  ))}
                </div>
                {/* Volume comptant — intégré dans le même cadran */}
                <div style={{ background: 'rgba(31,111,235,0.12)', border: `1px solid rgba(31,111,235,0.35)`, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
                    Volume Global marché au comptant
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                    {data?.cashVolume != null ? `${fmtNum(data.cashVolume, 0)} MAD` : '— MAD'}
                  </div>
                </div>
              </div>

              {/* Cadran Futures */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text, paddingBottom: 10, borderBottom: `1px solid ${C.border}`, margin: 0 }}>
                  Instruments du marché à terme
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {(data?.futures ?? []).slice(0, 4).map(f => (
                    <FutureCard
                      key={f.code}
                      future={f}
                      price={futuresPriceMap[f.code]?.price ?? null}
                      changePct={futuresPriceMap[f.code]?.change_pct ?? null}
                    />
                  ))}
                  {(data?.futures ?? []).length === 0 && [1,2,3,4].map(n => (
                    <div key={n} style={{ background: '#0d1117', border: `1px solid ${C.border}`, borderRadius: 8, minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 12 }}>—</div>
                  ))}
                </div>
                {/* Volume terme — intégré dans le même cadran */}
                <div style={{ background: 'rgba(210,153,34,0.12)', border: `1px solid rgba(210,153,34,0.35)`, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.amber, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
                    Volume Global marché à terme
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>— MAD</div>
                </div>
              </div>
            </div>

            {/* ── ROW 2 : Graphique | Heatmap ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              {/* Cadran graphique */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>MASI</h3>
                  <div style={{ display: 'flex', gap: 1, background: '#0d1117', borderRadius: 6, padding: 2, border: `1px solid ${C.border}` }}>
                    {(['indices', 'derives'] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setChartMode(m)}
                        style={{ fontSize: 11, padding: '3px 14px', borderRadius: 4, border: 'none', cursor: 'pointer', background: chartMode === m ? C.blue : 'transparent', color: chartMode === m ? '#fff' : C.muted, fontWeight: 600 }}
                      >
                        {m === 'indices' ? 'Indices' : 'Dérivés'}
                      </button>
                    ))}
                  </div>
                </div>
                {chartMode === 'indices' ? (
                  <div style={{ borderRadius: 6, overflow: 'hidden' }}>
                    <TradingViewChart symbol="CSEMA:MASI" height={240} isDark compact />
                  </div>
                ) : (
                  <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 12 }}>
                    Graphique dérivés non disponible
                  </div>
                )}
              </div>

              {/* Cadran heatmap TradingView AllMA */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <TradingViewHeatmap height={320} />
              </div>
            </div>

            {/* ── ROW 3 : Transactions | Movers ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              {/* Cadran transactions */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 10px 0' }}>Dernières transactions</h3>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderBottom: `1px solid ${C.border}` }}>
                  {([['central', 'Central'], ['blocs', 'Blocs'], ['off_book', 'Hors carnet']] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setTxTab(key)}
                      style={{ fontSize: 12, padding: '6px 14px', border: 'none', cursor: 'pointer', background: 'transparent', color: txTab === key ? C.text : C.muted, fontWeight: txTab === key ? 700 : 400, borderBottom: txTab === key ? `2px solid ${C.blue}` : '2px solid transparent', marginBottom: -1 }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {/* List */}
                <div style={{ flex: 1 }}>
                  {txList.slice(0, 8).map((tx, i) => <TxRow key={i} tx={tx} />)}
                  {txList.length === 0 && (
                    <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: 12 }}>Aucune opération</div>
                  )}
                </div>
                {/* Footer button */}
                <Link
                  href="/transactions"
                  style={{ display: 'block', marginTop: 12, padding: '9px 0', textAlign: 'center', background: C.blue, color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
                >
                  Voir toutes les transactions
                </Link>
              </div>

              {/* Cadran plus fortes variations */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 10px 0' }}>Plus fortes variations</h3>
                {/* Row 1: marché */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 4, borderBottom: `1px solid ${C.border}` }}>
                  {([['comptant', 'Marché au comptant'], ['terme', 'Marché à terme']] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setMoverMarket(key)}
                      style={{ fontSize: 12, padding: '6px 14px', border: 'none', cursor: 'pointer', background: 'transparent', color: moverMarket === key ? C.text : C.muted, fontWeight: moverMarket === key ? 700 : 400, borderBottom: moverMarket === key ? `2px solid ${C.blue}` : '2px solid transparent', marginBottom: -1 }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {/* Row 2: hausses/baisses */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderBottom: `1px solid ${C.border}` }}>
                  {([['gainers', 'Top hausses'], ['losers', 'Top baisses']] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setMoverTab(key)}
                      style={{ fontSize: 12, padding: '6px 14px', border: 'none', cursor: 'pointer', background: 'transparent', color: moverTab === key ? (key === 'gainers' ? C.green : C.red) : C.muted, fontWeight: moverTab === key ? 700 : 400, borderBottom: moverTab === key ? `2px solid ${key === 'gainers' ? C.green : C.red}` : '2px solid transparent', marginBottom: -1 }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {/* List */}
                <div style={{ flex: 1 }}>
                  {moverList.slice(0, 7).map((item, i) => <MoverRow key={item.symbol} item={item} rank={i + 1} market={moverMarket} />)}
                  {moverList.length === 0 && (
                    <div style={{ textAlign: 'center', color: C.muted, fontSize: 12, padding: 20 }}>Aucune donnée</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Indices tab ── */}
        {!loading && tab === 1 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              {sortedIndices.map(idx => <IndexCard key={idx.code} idx={idx} />)}
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Code', 'Indice', 'Valeur', 'Var %', 'YTD %'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: h === 'Valeur' || h === 'Var %' || h === 'YTD %' ? 'right' : 'left', fontSize: 11, color: C.muted, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 1 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.indices ?? []).map(idx => {
                    const isPos  = (idx.change_pct ?? 0) >= 0;
                    const ytdPos = (idx.change_ytd ?? 0) >= 0;
                    return (
                      <tr key={idx.code} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: INDEX_COLORS[idx.code] ?? C.muted }}>{idx.code}</td>
                        <td style={{ padding: '12px 16px', color: C.text }}>{idx.label}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(idx.value)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: isPos ? C.green : C.red }}>{fmtPct(idx.change_pct)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: ytdPos ? C.green : C.red }}>{fmtPct(idx.change_ytd)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Actions tab ── */}
        {!loading && tab === 2 && <ActionsTab />}

        {/* ── Produits dérivés tab ── */}
        {!loading && tab === 3 && <DeriveTab />}

        {/* ── Droits tab ── */}
        {!loading && tab === 4 && <DroitsTab />}

        {/* ── Obligations tab ── */}
        {!loading && tab === 5 && <ObligationsTab />}

      </div>
    </>
  );
}

