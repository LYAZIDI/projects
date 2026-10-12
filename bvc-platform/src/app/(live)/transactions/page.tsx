'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

interface TxItem {
  symbol: string;
  price: number | null;
  quantity: number | null;
  volume: number | null;
  time: string;
  label: string;
  market: string;
}

interface TxData {
  cashVolume:    number | null;
  futuresVolume: number | null;
  actions:  TxItem[];
  rights:   TxItem[];
  bonds:    TxItem[];
  funds:    TxItem[];
  futures:  TxItem[];
}

const C = {
  bg:     '#0d1117',
  card:   '#161b22',
  panel:  '#1c2128',
  border: '#21262d',
  text:   '#e6edf3',
  muted:  '#8b949e',
  blue:   '#1f6feb',
  amber:  '#d29922',
};

function fmtNum(n: number | null, dec = 2) {
  if (n == null) return '—';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch { return iso; }
}

// Détermine le carnet depuis market_label
function getCarnet(market: string): 'central' | 'blocs' | 'off_book' {
  const m = market.toLowerCase();
  if (m.includes('bloc'))   return 'blocs';
  if (m.includes('hors') || m.includes('off')) return 'off_book';
  return 'central';
}

type SortKey = 'time' | 'label' | 'price' | 'quantity' | 'volume';
type SortDir = 'asc' | 'desc';

const INSTRUMENT_TYPES = [
  { key: 'actions', label: 'Actions'     },
  { key: 'rights',  label: 'Droits'      },
  { key: 'bonds',   label: 'Obligations' },
  { key: 'funds',   label: 'Fonds'       },
] as const;

type InstrKey = typeof INSTRUMENT_TYPES[number]['key'];

// Clé de déduplication : symbol + time + price + quantity
function txKey(tx: TxItem) {
  return `${tx.symbol}|${tx.time}|${tx.price}|${tx.quantity}`;
}

// Merge les nouvelles transactions dans l'accumulateur sans doublons
function mergeTx(acc: TxItem[], incoming: TxItem[]): TxItem[] {
  const seen = new Set(acc.map(txKey));
  const fresh = incoming.filter(tx => !seen.has(txKey(tx)));
  return fresh.length > 0 ? [...acc, ...fresh] : acc;
}

export default function TransactionsPage() {
  // Heure de connexion (HH:MM:SS string) — enregistrée une seule fois au montage
  const connectedAt = useRef<string>('');
  useEffect(() => {
    connectedAt.current = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, []);

  // Accumulateurs par type — grandissent à chaque refresh
  const [accData, setAccData] = useState<TxData>({
    cashVolume: null, futuresVolume: null,
    actions: [], rights: [], bonds: [], funds: [], futures: [],
  });

  const [loading,    setLoading]    = useState(true);
  const [market,     setMarket]     = useState<'comptant' | 'terme'>('comptant');
  const [carnets,    setCarnets]    = useState<Set<'central' | 'blocs' | 'off_book'>>(new Set());
  const [instrType,  setInstrType]  = useState<InstrKey>('actions');
  const [search,     setSearch]     = useState('');
  const [sortKey,    setSortKey]    = useState<SortKey>('time');
  const [sortDir,    setSortDir]    = useState<SortDir>('desc');
  const [page,       setPage]       = useState(0);

  const PAGE_SIZE = 25;

  const load = useCallback(() => {
    fetch('/api/bvc/transactions')
      .then(r => r.json())
      .then((d: TxData) => {
        setAccData(prev => ({
          cashVolume:    d.cashVolume,
          futuresVolume: d.futuresVolume,
          actions:  mergeTx(prev.actions,  d.actions  ?? []),
          rights:   mergeTx(prev.rights,   d.rights   ?? []),
          bonds:    mergeTx(prev.bonds,    d.bonds    ?? []),
          funds:    mergeTx(prev.funds,    d.funds    ?? []),
          futures:  mergeTx(prev.futures,  d.futures  ?? []),
        }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 60_000); return () => clearInterval(id); }, [load]);

  // Sélection de la liste de base selon type d'instrument, filtrée depuis la connexion
  const sinceConnection = (list: TxItem[]) =>
    connectedAt.current
      ? list.filter(tx => tx.time >= connectedAt.current)
      : list;

  const baseList: TxItem[] = sinceConnection(
    market === 'terme' ? accData.futures : accData[instrType]
  );

  // Filtre carnet (via market_label)
  const afterCarnet = carnets.size === 0
    ? baseList
    : baseList.filter(tx => carnets.has(getCarnet(tx.market)));

  // Filtre recherche
  const filtered = search
    ? afterCarnet.filter(tx => {
        const q = search.toLowerCase();
        return tx.symbol.toLowerCase().includes(q) || tx.label.toLowerCase().includes(q);
      })
    : afterCarnet;

  // Tri
  const sorted = [...filtered].sort((a, b) => {
    let va: number | string, vb: number | string;
    if      (sortKey === 'time')     { va = a.time;              vb = b.time; }
    else if (sortKey === 'label')    { va = a.label;             vb = b.label; }
    else if (sortKey === 'price')    { va = a.price    ?? -Infinity; vb = b.price    ?? -Infinity; }
    else if (sortKey === 'quantity') { va = a.quantity ?? -Infinity; vb = b.quantity ?? -Infinity; }
    else                             { va = a.volume   ?? -Infinity; vb = b.volume   ?? -Infinity; }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ?  1 : -1;
    return 0;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(0);
  }

  function toggleCarnet(key: 'central' | 'blocs' | 'off_book') {
    setCarnets(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    setPage(0);
  }

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated  = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span style={{ color: C.muted, marginLeft: 4 }}>↕</span>;
    return <span style={{ color: C.blue, marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const thStyle = (col: SortKey, align: 'left' | 'right' = 'right'): React.CSSProperties => ({
    padding: '12px 16px', fontSize: 11, fontWeight: 700, color: C.muted,
    textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap',
    cursor: 'pointer', userSelect: 'none', textAlign: align,
    borderBottom: `1px solid ${C.border}`,
  });

  const noData = market === 'terme' ? (accData.futures ?? []).length === 0 : sorted.length === 0;

  return (
    <>
      <style>{`
        input[type=checkbox] { accent-color: #1f6feb; width: 14px; height: 14px; cursor: pointer; }
        input::placeholder { color: #8b949e; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #161b22; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <header style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 50 }}>
        <Link href="/live" style={{ color: C.muted, textDecoration: 'none', fontSize: 20, lineHeight: 1 }}>←</Link>
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <polyline points="3,28 11,14 16,7 21,14 29,28" stroke="#C49A2E" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
          <circle cx="16" cy="7" r="2.5" fill="#E4BA4A"/>
        </svg>
        <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: '0.1em' }}>Z<span style={{ color: '#C49A2E' }}>É</span>NITH</span>
        <div style={{ flex: 1 }} />
        {connectedAt.current && (
          <div style={{ fontSize: 11, color: C.muted, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px' }}>
            Session depuis <span style={{ color: C.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{connectedAt.current}</span>
          </div>
        )}
      </header>

      <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 24px 0' }}>Toutes les transactions</h1>

        {/* Volume cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Volume du marché au comptant</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.blue, fontVariantNumeric: 'tabular-nums' }}>
              {accData.cashVolume != null ? `${fmtNum(accData.cashVolume, 0)} MAD` : '— MAD'}
            </div>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Volume du marché à terme</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.amber, fontVariantNumeric: 'tabular-nums' }}>
              {accData.futuresVolume != null ? `${fmtNum(accData.futuresVolume, 0)} MAD` : '0 MAD'}
            </div>
          </div>
        </div>

        {/* Market tab buttons */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
          {(['comptant', 'terme'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMarket(m); setPage(0); }}
              style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: market === m ? C.blue : C.card, color: market === m ? '#fff' : C.muted, borderRadius: m === 'comptant' ? '6px 0 0 6px' : '0 6px 6px 0', borderRight: m === 'comptant' ? `1px solid ${C.border}` : 'none' }}
            >
              {m === 'comptant' ? 'Marché au comptant' : 'Marché à terme'}
            </button>
          ))}
        </div>

        {/* Filter panel */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px', marginBottom: 20 }}>
          {/* Search */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Rechercher un instrument :</div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 13 }}>🔍</span>
              <input
                placeholder="Rechercher un instrument..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px 8px 32px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Carnet types */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Types de carnets d'ordre :</div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.text, cursor: 'pointer' }}>
                <input type="checkbox" checked={carnets.size === 0} onChange={() => setCarnets(new Set())} />
                Tous
              </label>
              {([['central', 'Central'], ['blocs', 'Blocs'], ['off_book', 'Hors carnet']] as const).map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.text, cursor: 'pointer' }}>
                  <input type="checkbox" checked={carnets.has(key)} onChange={() => toggleCarnet(key)} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Instrument type — masqué pour terme */}
          {market === 'comptant' && (
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Type d'instrument :</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {INSTRUMENT_TYPES.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setInstrType(key); setPage(0); }}
                    style={{ padding: '5px 14px', fontSize: 12, fontWeight: 600, border: `1px solid ${instrType === key ? C.blue : C.border}`, borderRadius: 4, cursor: 'pointer', background: instrType === key ? C.blue : 'transparent', color: instrType === key ? '#fff' : C.muted }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th onClick={() => toggleSort('time')}     style={thStyle('time', 'left')}>HEURE <SortIcon col="time" /></th>
                  <th onClick={() => toggleSort('label')}    style={thStyle('label', 'left')}>INSTRUMENT FINANCIER <SortIcon col="label" /></th>
                  <th onClick={() => toggleSort('price')}    style={thStyle('price')}>COURS (MAD) <SortIcon col="price" /></th>
                  <th onClick={() => toggleSort('quantity')} style={thStyle('quantity')}>QUANTITÉ <SortIcon col="quantity" /></th>
                  <th onClick={() => toggleSort('volume')}   style={thStyle('volume')}>VOLUME <SortIcon col="volume" /></th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'right', borderBottom: `1px solid ${C.border}` }}>MARCHÉS</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: C.muted }}>Chargement...</td></tr>
                )}
                {!loading && noData && (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: C.muted }}>
                    {market === 'terme' ? 'Aucune transaction disponible pour le marché à terme' : 'Aucune opération'}
                  </td></tr>
                )}
                {!loading && paginated.map((tx, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '10px 16px', color: C.muted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtTime(tx.time)}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: C.text }}>
                      <a href={`https://fr.tradingview.com/symbols/CSEMA-${tx.symbol.trim()}/`} target="_blank" rel="noopener noreferrer" style={{ color: C.text, textDecoration: 'none' }}>
                        {tx.label || tx.symbol.trim()}
                      </a>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtNum(tx.price)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                      {tx.quantity != null ? Math.round(tx.quantity).toLocaleString('fr-FR') : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                      {tx.volume != null ? Math.round(tx.volume).toLocaleString('fr-FR') : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.blue, background: 'rgba(31,111,235,0.12)', border: `1px solid rgba(31,111,235,0.3)`, borderRadius: 4, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                        {tx.market || 'Marché central'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && sorted.length > 0 && (
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 12, color: C.muted }}>
                {sorted.length} transaction{sorted.length > 1 ? 's' : ''} · page {page + 1}/{totalPages}
              </span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button onClick={() => setPage(0)} disabled={page === 0}
                  style={{ padding: '4px 8px', fontSize: 12, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: page === 0 ? C.muted : C.text, cursor: page === 0 ? 'default' : 'pointer' }}>«</button>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  style={{ padding: '4px 10px', fontSize: 12, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: page === 0 ? C.muted : C.text, cursor: page === 0 ? 'default' : 'pointer' }}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => i)
                  .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 2)
                  .reduce<(number | '…')[]>((acc, i, idx, arr) => {
                    if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push('…');
                    acc.push(i);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === '…'
                      ? <span key={`e${idx}`} style={{ padding: '0 4px', color: C.muted, fontSize: 12 }}>…</span>
                      : <button key={item} onClick={() => setPage(item as number)}
                          style={{ padding: '4px 9px', fontSize: 12, fontWeight: item === page ? 700 : 400, background: item === page ? C.blue : 'transparent', border: `1px solid ${item === page ? C.blue : C.border}`, borderRadius: 4, color: item === page ? '#fff' : C.text, cursor: 'pointer' }}>
                          {(item as number) + 1}
                        </button>
                  )}
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                  style={{ padding: '4px 10px', fontSize: 12, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: page === totalPages - 1 ? C.muted : C.text, cursor: page === totalPages - 1 ? 'default' : 'pointer' }}>›</button>
                <button onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1}
                  style={{ padding: '4px 8px', fontSize: 12, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: page === totalPages - 1 ? C.muted : C.text, cursor: page === totalPages - 1 ? 'default' : 'pointer' }}>»</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
